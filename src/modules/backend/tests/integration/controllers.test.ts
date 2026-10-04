import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { parse } from 'yaml';
import { verify } from '@node-rs/argon2';
import { connectDatabase, migrate } from '../../src/database.js';
import { SqlPersonRepository, SqlRepository, SqlTaskRepository } from '../../src/repositories.js';
import { DomainService } from '../../src/services/domain.js';
import { AuthService, AutheliaGateway, FileIdentityDirectory } from '../../src/services/auth.js';
import { TaskService } from '../../src/services/tasks.js';
import { HealthService } from '../../src/services/health.js';
import { createApp } from '../../src/controllers.js';
test('All controllers against a dedicated SQLite database, real services/repositories and HTTP identity adapter', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'patente-integration-'));
  const db = await connectDatabase(`sqlite:${join(dir, 'test.db')}`);
  await migrate(db);
  await migrate(db);
  const people = new SqlPersonRepository(db),
    tasks = new SqlTaskRepository(db);
  const repos = {
    persons: people,
    tasks,
    quizzes: new SqlRepository(db, 'quizzes'),
    exams: new SqlRepository(db, 'exams'),
    solvedExams: new SqlRepository(db, 'solvedExams'),
    places: new SqlRepository(db, 'places'),
  };
  const identityPath = join(dir, 'users.yml');
  // The Authelia HTTP contract is simulated; the real image is covered by test:stack.
  const identity = createServer(async (req, res) => {
    if (req.url === '/api/health') {
      res.end('{}');
      return;
    }
    if (req.url === '/api/firstfactor') {
      let raw = '';
      for await (const c of req) raw += c;
      const body = JSON.parse(raw);
      const doc = parse(await readFile(identityPath, 'utf8'));
      const u = doc.users[body.username];
      if (!u || !(await verify(u.password, body.password))) {
        res.writeHead(401);
        res.end('{}');
        return;
      }
      res.setHeader('set-cookie', `session=${body.username}; HttpOnly`);
      res.end('{}');
      return;
    }
    if (req.url === '/api/logout') {
      res.setHeader('set-cookie', 'session=; Max-Age=0');
      res.end('{}');
      return;
    }
    const username = req.headers.cookie?.replace('session=', '');
    if (!username) {
      res.writeHead(401);
      res.end();
      return;
    }
    res.setHeader('remote-user', username);
    res.setHeader('remote-groups', username === 'admin' ? 'admins' : 'students');
    res.end();
  });
  await new Promise<void>((r) => identity.listen(0, '127.0.0.1', r));
  const port = (identity.address() as { port: number }).port;
  const gateway = new AutheliaGateway(
    `http://127.0.0.1:${port}`,
    'http://app.patente.localhost:8080',
  );
  const auth = new AuthService(people, new FileIdentityDirectory(identityPath), gateway);
  const queue = { publish: async () => {}, healthy: () => true, close: async () => {} };
  const taskService = new TaskService(tasks, people, queue, async () => {});
  const app = createApp(
    {
      domain: new DomainService(repos),
      auth,
      tasks: taskService,
      health: new HealthService(db, gateway, queue),
    },
    'http://app.patente.localhost:8080',
  );
  const call = (method: string, url: string, payload?: unknown, cookie = 'session=admin') =>
    app.inject({
      method: method as any,
      url,
      headers: { cookie, 'content-type': 'application/json' },
      ...(payload !== undefined
        ? { payload: payload as any }
        : method === 'DELETE'
          ? { payload: {} }
          : {}),
    });
  try {
    await auth.register(
      { username: 'admin', name: 'Admin', email: 'admin@test.it', password: 'AdminPassword123' },
      ['admins'],
    );
    assert.equal((await call('GET', '/health')).statusCode, 200);
    assert.equal((await call('GET', '/api/health')).statusCode, 200);
    assert.equal((await call('GET', '/api/quizzes', undefined, '')).statusCode, 401);
    const registered = await call(
      'POST',
      '/api/auth/register',
      { username: 'alice', name: 'Alice', email: 'alice@test.it', password: 'StudentPassword123' },
      '',
    );
    assert.equal(registered.statusCode, 201);
    const person = registered.json();
    assert.equal(
      (await call('POST', '/api/auth/login', { username: 'alice', password: 'wrong' }, ''))
        .statusCode,
      401,
    );
    const login = await call(
      'POST',
      '/api/auth/login',
      { username: 'alice', password: 'StudentPassword123' },
      '',
    );
    assert.equal(login.statusCode, 200);
    assert.match(String(login.headers['set-cookie']), /session=alice/);
    assert.equal(
      (await call('GET', '/api/auth/me', undefined, 'session=alice')).json().person.id,
      person.id,
    );
    assert.equal((await call('POST', '/api/auth/logout', {}, 'session=alice')).statusCode, 200);
    assert.equal((await call('GET', '/api/schemas')).json().exams.properties.quizIds.maxItems, 10);
    assert.equal((await call('GET', '/api/persons', undefined, 'session=alice')).statusCode, 403);
    const bobResponse = await call('POST', '/api/persons', {
      username: 'bob',
      name: 'Bob',
      email: 'bob@test.it',
      password: 'BobPassword123',
    });
    assert.equal(bobResponse.statusCode, 201);
    assert.equal((await call('DELETE', `/api/persons/${bobResponse.json().id}`)).statusCode, 204);
    assert.equal(parse(await readFile(identityPath, 'utf8')).users.bob, undefined);
    const quizInput = {
      question: 'Must you stop?',
      answers: [
        { id: 'a', text: 'Yes', correct: true },
        { id: 'b', text: 'No', correct: false },
      ],
    };
    const quizzes = [];
    for (let i = 0; i < 10; i++) {
      const r = await call('POST', '/api/quizzes', { ...quizInput, question: `Question ${i}` });
      assert.equal(r.statusCode, 201);
      quizzes.push(r.json());
    }
    const first = quizzes[0];
    assert.equal((await call('PUT', `/api/quizzes/${first.id}`, quizInput)).statusCode, 200);
    assert.equal(
      (await call('GET', `/api/quizzes/${first.id}`, undefined, 'session=alice')).json().answers[0]
        .correct,
      undefined,
    );
    assert.equal(
      (await call('POST', '/api/quizzes', { ...quizInput, answers: [quizInput.answers[0]] }))
        .statusCode,
      400,
    );
    const er = await call('POST', '/api/exams', {
      title: 'Ten questions',
      quizIds: quizzes.map((q) => q.id),
    });
    assert.equal(er.statusCode, 201);
    const exam = er.json();
    assert.equal((await call('PUT', `/api/quizzes/${first.id}`, quizInput)).statusCode, 409);
    assert.equal((await call('DELETE', `/api/quizzes/${first.id}`)).statusCode, 409);
    const sr = await call(
      'POST',
      '/api/solvedExams',
      {
        personId: person.id,
        examId: exam.id,
        responses: quizzes.map((q, i) => ({ quizId: q.id, answerId: i < 8 ? 'a' : 'b' })),
      },
      'session=alice',
    );
    assert.equal(sr.statusCode, 201);
    assert.equal(sr.json().points, 8);
    const pr = await call('POST', '/api/places', {
      name: 'Office',
      address: 'Road',
      latitude: 45,
      longitude: 9,
    });
    assert.equal(pr.statusCode, 201);
    const place = pr.json();
    assert.equal(
      (
        await call('PUT', `/api/places/${place.id}`, {
          name: 'New office',
          address: 'Road',
          latitude: 46,
          longitude: 10,
        })
      ).statusCode,
      200,
    );
    const tr = await call('POST', '/api/tasks', { label: 'Twenty seconds' }, 'session=alice');
    assert.equal(tr.statusCode, 202);
    const task = tr.json();
    await taskService.execute(task.id);
    assert.equal(
      (await call('GET', `/api/tasks/${task.id}`, undefined, 'session=alice')).json().status,
      'completed',
    );
    assert.equal((await tasks.pending()).length, 0);
    for (const [kind, id] of [
      ['persons', person.id],
      ['quizzes', first.id],
      ['exams', exam.id],
      ['solvedExams', sr.json().id],
      ['places', place.id],
      ['tasks', task.id],
    ]) {
      assert.equal((await call('GET', `/api/${kind}`)).statusCode, 200);
      assert.equal((await call('GET', `/api/${kind}/${id}`)).statusCode, 200);
      assert.equal((await call('GET', `/api/${kind}/missing`)).statusCode, 404);
    }
    assert.equal((await call('GET', '/api/quizzes?limit=101')).statusCode, 400);
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/api/tasks',
          headers: { origin: 'http://evil.test', 'content-type': 'application/json' },
          payload: { label: 'bad' },
        })
      ).statusCode,
      403,
    );
    assert.equal((await call('DELETE', `/api/solvedExams/${sr.json().id}`)).statusCode, 204);
    assert.equal((await call('DELETE', `/api/exams/${exam.id}`)).statusCode, 204);
    assert.equal((await call('DELETE', `/api/quizzes/${first.id}`)).statusCode, 204);
    assert.equal((await call('DELETE', `/api/places/${place.id}`)).statusCode, 204);
    assert.equal((await call('DELETE', '/api/persons/missing')).statusCode, 404);
  } finally {
    await app.close();
    await new Promise<void>((r, e) => identity.close((err) => (err ? e(err) : r())));
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
