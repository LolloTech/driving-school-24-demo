import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainService, type Repositories } from '../../src/services/domain.js';
import { AuthService, AutheliaGateway } from '../../src/services/auth.js';
import { TaskService } from '../../src/services/tasks.js';
import { HealthService } from '../../src/services/health.js';
import type { TaskRepository } from '../../src/repositories.js';
const admin = { username: 'admin', groups: ['admins'] },
  student = { username: 'alice', groups: ['students'] };
test('local Authelia cookies become host-only while retaining Secure', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(null, {
      status: 200,
      headers: {
        'set-cookie': 'patente_session=token; Domain=patente.localhost; Path=/; HttpOnly; Secure; SameSite=Lax',
      },
    });
  try {
    const gateway = new AutheliaGateway('http://authelia:9091', 'https://app.patente.localhost:8443', true);
    assert.deepEqual((await gateway.login('admin', 'password')).cookies, [
      'patente_session=token; Path=/; HttpOnly; Secure; SameSite=Lax',
    ]);
  } finally {
    globalThis.fetch = previous;
  }
});
const person = {
  id: 'person',
  username: 'alice',
  name: 'Alice',
  email: 'alice@test.it',
  createdAt: new Date().toISOString(),
};
// Repository doubles only: service unit tests never open a database or network socket.
function fixtures() {
  const stores: Record<string, Map<string, any>> = {};
  const repos: any = {};
  for (const k of ['persons', 'quizzes', 'exams', 'solvedExams', 'places', 'tasks']) {
    const map = (stores[k] = new Map());
    repos[k] = {
      get: async (id: string) => map.get(id) ?? null,
      list: async (page: number, limit: number, owner?: string) =>
        [...map.values()]
          .filter((x) => !owner || x.personId === owner || x.ownerId === owner)
          .slice((page - 1) * limit, page * limit),
      create: async (e: any) => {
        map.set(e.id, e);
        return e;
      },
      replace: async (e: any) => {
        map.set(e.id, e);
        return e;
      },
      remove: async (id: string) => map.delete(id),
    };
  }
  repos.persons.findUsername = async (u: string) =>
    [...stores.persons.values()].find((p) => p.username === u) ?? null;
  stores.persons.set(person.id, person);
  return { repos: repos as Repositories, stores, service: new DomainService(repos) };
}
const quiz = {
  question: 'Stop?',
  answers: [
    { id: 'a', text: 'Yes', correct: true },
    { id: 'b', text: 'No', correct: false },
  ],
};
test('DomainService: validates answer count, unique IDs, exactly one correct and protected fields', async () => {
  const { service } = fixtures();
  await assert.rejects(service.create('quizzes', quiz, student), /Administrator/);
  for (const answers of [
    quiz.answers.slice(0, 1),
    Array(5).fill(quiz.answers[0]),
    quiz.answers.map((a) => ({ ...a, correct: false })),
    quiz.answers.map((a) => ({ ...a, correct: true })),
    quiz.answers.map((a) => ({ ...a, id: 'a' })),
  ])
    await assert.rejects(service.create('quizzes', { ...quiz, answers }, admin));
  await assert.rejects(service.create('quizzes', { ...quiz, id: 'fake' }, admin), /server-managed/);
  const q = await service.create('quizzes', quiz, admin);
  assert.equal(q.answers.length, 2);
  assert.equal(
    ((await service.get('quizzes', q.id, student)) as any).answers[0].correct,
    undefined,
  );
  assert.equal((await service.list('quizzes', student)).items.length, 1);
  await assert.rejects(service.get('quizzes', 'missing', admin), /not found/);
  await service.update('quizzes', q.id, { ...quiz, question: 'New?' }, admin);
  await service.remove('quizzes', q.id, admin);
  await assert.rejects(service.remove('quizzes', q.id, admin), /not found/);
});
test('DomainService: exam references, immutable questions, attempts scored and scoped', async () => {
  const { service, repos, stores } = fixtures();
  const qs = [];
  for (let i = 0; i < 10; i++) qs.push(await service.create('quizzes', quiz, admin));
  await assert.rejects(
    service.create('exams', { title: 'Bad', quizIds: qs.slice(0, 9).map((q) => q.id) }, admin),
  );
  await assert.rejects(
    service.create(
      'exams',
      { title: 'Bad', quizIds: [...qs.slice(0, 9).map((q) => q.id), 'missing'] },
      admin,
    ),
  );
  const exam = await service.create(
    'exams',
    { title: 'Exam', quizIds: qs.map((q) => q.id) },
    admin,
  );
  await assert.rejects(service.update('quizzes', qs[0].id, quiz, admin), /immutable/);
  const input = {
    personId: person.id,
    examId: exam.id,
    responses: qs.map((q, i) => ({ quizId: q.id, answerId: i < 7 ? 'a' : 'b' })),
  };
  const solved = await service.create('solvedExams', input, student);
  assert.equal(solved.points, 7);
  assert.equal(solved.snapshot.length, 10);
  await assert.rejects(
    service.create('solvedExams', { ...input, points: 10 }, student),
    /server-managed/,
  );
  await assert.rejects(
    service.create(
      'solvedExams',
      { ...input, responses: input.responses.map((r) => ({ ...r, answerId: 'invalid' })) },
      student,
    ),
  );
  await assert.rejects(
    service.create(
      'solvedExams',
      { ...input, responses: input.responses.map(() => input.responses[0]) },
      student,
    ),
  );
  stores.persons.set('other', { ...person, id: 'other', username: 'bob' });
  await assert.rejects(
    service.create('solvedExams', { ...input, personId: 'other' }, student),
    /another person/,
  );
  await assert.rejects(
    service.get('solvedExams', solved.id, { username: 'bob', groups: [] }),
    /another person/,
  );
  assert.equal((await service.list('solvedExams', student)).items.length, 1);
  await assert.rejects(service.list('persons', student));
  const place = await service.create(
    'places',
    { name: 'Office', address: 'Street', latitude: 41, longitude: 12 },
    admin,
  );
  await service.update(
    'places',
    place.id,
    { name: 'Updated', address: 'Street', latitude: 42, longitude: 13 },
    admin,
  );
  assert.equal((await repos.places.get(place.id))?.name, 'Updated');
});
test('AuthService: registration provisions identity, rollback on repository failure, login/me/logout', async () => {
  const { repos } = fixtures();
  const calls: string[] = [];
  const directory = {
    provision: async () => {
      calls.push('provision');
    },
    remove: async () => {
      calls.push('rollback');
    },
  };
  const gateway = {
    verify: async () => student,
    login: async (u: string, p: string) => {
      assert.equal(u, 'alice');
      assert.equal(p, 'secret');
      return { cookies: ['session=x'] };
    },
    logout: async () => ({ cookies: ['session='] }),
    healthy: async () => true,
  };
  const auth = new AuthService(repos.persons, directory, gateway);
  assert.equal((await auth.me('session=x')).person.id, person.id);
  assert.deepEqual((await auth.login({ username: 'alice', password: 'secret' })).cookies, [
    'session=x',
  ]);
  await auth.logout('session=x');
  await assert.rejects(
    auth.register({ username: 'alice', name: 'A', email: 'a@x.it', password: 'longpassword!' }),
    /already exists/,
  );
  await assert.rejects(
    auth.register({ username: 'INVALID', name: 'A', email: 'bad', password: 'short' }),
  );
  const input = {
    username: 'newuser',
    name: ' New ',
    email: 'NEW@test.it',
    password: 'strongpassword12',
  };
  const p = await auth.register(input);
  assert.equal(p.email, 'new@test.it');
  assert.equal(p.name, 'New');
  repos.persons.create = async () => {
    throw new Error('db failed');
  };
  await assert.rejects(auth.register({ ...input, username: 'nextuser' }), /db failed/);
  assert.deepEqual(calls, ['provision', 'provision', 'rollback']);
  await assert.rejects(auth.login(null as any));
});
test('TaskService: durable outbox survives disconnect, runs exactly 20 seconds, recovery and failure', async () => {
  const { repos, stores } = fixtures();
  let now = 0;
  const published: string[] = [];
  const marked: string[] = [];
  let disconnected = true;
  const tasks = {
    ...repos.tasks,
    pending: async () => [...stores.tasks.keys()].filter((id) => !marked.includes(id)),
    markPublished: async (id: string) => {
      marked.push(id);
    },
    recoverable: async () =>
      [...stores.tasks.values()].filter((t) => t.status === 'queued' || t.status === 'running'),
  } as TaskRepository;
  const queue = {
    publish: async (id: string) => {
      if (disconnected) throw new Error('offline');
      published.push(id);
    },
    healthy: () => !disconnected,
    close: async () => {},
  };
  const sleeps: number[] = [];
  const service = new TaskService(
    tasks,
    repos.persons,
    queue,
    async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
    () => now,
  );
  await assert.rejects(service.create('', student));
  const t = await service.create(' Demo ', student);
  assert.equal(t.status, 'queued');
  assert.equal(marked.length, 0);
  disconnected = false;
  await service.flush();
  assert.deepEqual(marked, [t.id]);
  await service.recover();
  assert.equal(published.length, 2);
  await service.execute(t.id);
  assert.deepEqual(sleeps, [20000]);
  assert.equal((await tasks.get(t.id))?.status, 'completed');
  await service.execute(t.id);
  assert.equal(sleeps.length, 1);
  const failed = await service.create('Failure', student);
  await service.fail(failed.id, 'x'.repeat(300));
  assert.equal((await tasks.get(failed.id))?.error?.length, 200);
  await service.execute('missing');
});
test('HealthService: combines database, identity and NATS health and reports failure', async () => {
  const db = { query: async () => [], transaction: async () => {}, close: async () => {} } as any;
  let authOk = true,
    natsOk = true;
  const service = new HealthService(
    db,
    { healthy: async () => authOk } as any,
    { healthy: () => natsOk } as any,
  );
  assert.equal((await service.check()).ok, true);
  authOk = false;
  assert.equal((await service.check()).authelia, false);
  authOk = true;
  natsOk = false;
  assert.equal((await service.check()).nats, false);
  db.query = async () => {
    throw new Error('offline');
  };
  assert.equal((await service.check()).database, false);
});
test('AuthService: removal requires admin, preserves own account and compensates identity failures', async () => {
  const { repos } = fixtures();
  let removed = '';
  let fail = false;
  const auth = new AuthService(
    repos.persons,
    {
      provision: async () => {},
      remove: async (u) => {
        if (fail) throw new Error('identity unavailable');
        removed = u;
      },
    },
    {
      verify: async () => student,
      login: async () => ({ cookies: [] }),
      logout: async () => ({ cookies: [] }),
      healthy: async () => true,
    },
  );
  await assert.rejects(auth.remove(person.id, student));
  await assert.rejects(auth.remove(person.id, { ...student, groups: ['admins'] }), /own account/);
  await assert.rejects(auth.remove('missing', admin), /not found/);
  fail = true;
  await assert.rejects(auth.remove(person.id, admin), /identity unavailable/);
  assert.ok(await repos.persons.get(person.id));
  fail = false;
  await auth.remove(person.id, admin);
  assert.equal(removed, 'alice');
  assert.equal(await repos.persons.get(person.id), null);
});
