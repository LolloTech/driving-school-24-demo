import assert from 'node:assert/strict';
const base = process.env.STACK_URL ?? 'http://127.0.0.1:3001';
if (!process.env.STACK_ADMIN_PASSWORD)
  throw new Error('Use root npm run test:stack to create a dedicated test environment');
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function call(path: string, method = 'GET', body?: unknown, cookie = '') {
  const r = await fetch(base + path, {
    method,
    headers: {
      host: 'app.patente.localhost:8443',
      origin: 'https://app.patente.localhost:8443',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      cookie,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
    redirect: 'manual',
  });
  return r;
}
for (let i = 0; i < 30; i++) {
  try {
    if ((await call('/health')).ok) break;
  } catch {}
  if (i === 29) throw new Error('Stack did not become healthy');
  await delay(1000);
}
assert.equal((await call('/health')).status, 200);
const logged = await call('/api/auth/login', 'POST', {
  username: 'admin',
  password: process.env.STACK_ADMIN_PASSWORD,
});
assert.equal(logged.status, 200, await logged.clone().text());
const adminCookie = logged.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');
assert.ok(adminCookie);
assert.equal((await call('/api/auth/me', 'GET', undefined, adminCookie)).status, 200);
const registered = await call('/api/auth/register', 'POST', {
  username: 'student_test',
  name: 'Test Student',
  email: 'student@test.it',
  password: 'TestPassword123!',
});
assert.equal(registered.status, 201);
const person = (await registered.json()) as { id: string };
await delay(1000);
const login = await call('/api/auth/login', 'POST', {
  username: 'student_test',
  password: 'TestPassword123!',
});
assert.equal(login.status, 200, await login.clone().text());
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');
assert.equal((await call('/api/persons', 'GET', undefined, cookie)).status, 403);
const qdata = (await (await call('/api/quizzes', 'GET', undefined, adminCookie)).json()) as {
  items: { id: string; answers: { id: string; correct: boolean }[] }[];
};
assert.equal(qdata.items.length, 10);
const edata = (await (await call('/api/exams', 'GET', undefined, cookie)).json()) as {
  items: { id: string; quizIds: string[] }[];
};
const solved = await call(
  '/api/solvedExams',
  'POST',
  {
    personId: person.id,
    examId: edata.items[0].id,
    responses: qdata.items.map((q) => ({
      quizId: q.id,
      answerId: q.answers.find((a) => a.correct)!.id,
    })),
  },
  cookie,
);
assert.equal(solved.status, 201, await solved.clone().text());
assert.equal(((await solved.json()) as { points: number }).points, 10);
const taskResponse = await call(
  '/api/tasks',
  'POST',
  { label: 'Real JetStream 20-second task' },
  cookie,
);
assert.equal(taskResponse.status, 202);
const task = (await taskResponse.json()) as { id: string };
let completed = false,
  seenRunning = false;
for (let i = 0; i < 30; i++) {
  const t = (await (await call(`/api/tasks/${task.id}`, 'GET', undefined, cookie)).json()) as {
    status: string;
    startedAt: string;
    finishedAt: string;
  };
  if (t.status === 'running') seenRunning = true;
  if (t.status === 'completed') {
    assert.ok(Date.parse(t.finishedAt) - Date.parse(t.startedAt) >= 19900);
    completed = true;
    break;
  }
  await delay(1000);
}
assert.ok(seenRunning);
assert.ok(completed);
assert.equal((await call('/api/auth/logout', 'POST', {}, cookie)).status, 200);
assert.equal((await call('/api/auth/me', 'GET', undefined, cookie)).status, 401);
console.log(
  'Real Podman stack passed: Authelia registration/login/logout, permissions, SQLite scoring, and JetStream running→completed after 20 seconds.',
);
