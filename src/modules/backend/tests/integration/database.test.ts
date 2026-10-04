import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { connectDatabase, migrate } from '../../src/database.js';
import { SqlPersonRepository, SqlRepository } from '../../src/repositories.js';
const execute = promisify(execFile);

test('SQLite creates a missing nested file, persists data, enforces JSON relations and rolls back', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'patente-data-test-'));
  const url = `sqlite:${join(dir, 'nested', 'data.db')}`;
  let db = await connectDatabase(url);
  try {
    await migrate(db);
    const people = new SqlPersonRepository(db);
    const person = {
      id: 'p',
      username: 'alice',
      email: 'alice@test.it',
      name: 'Alice',
      createdAt: new Date().toISOString(),
    };
    await people.create(person);
    await assert.rejects(people.create({ ...person, id: 'duplicate' }));
    const quizRepo = new SqlRepository(db, 'quizzes');
    await quizRepo.create({
      id: 'q',
      createdAt: person.createdAt,
      question: 'Stop?',
      answers: [
        { id: 'a', text: 'Yes', correct: true },
        { id: 'b', text: 'No', correct: false },
      ],
    });
    const exams = new SqlRepository(db, 'exams');
    // Repository verifies actual SQL integrity even when callers bypass service validation.
    await assert.rejects(
      exams.create({
        id: 'invalid',
        createdAt: person.createdAt,
        title: 'Invalid relation',
        quizIds: ['q', 'missing'],
      }),
    );
    assert.equal(await exams.get('invalid'), null);
    assert.deepEqual(await db.query('SELECT * FROM exam_quizzes'), []);
    await exams.create({
      id: 'e',
      createdAt: person.createdAt,
      title: 'Stored relation',
      quizIds: ['q'],
    });
    await assert.rejects(quizRepo.remove('q'));
    await db.close();
    db = await connectDatabase(url);
    await migrate(db);
    assert.equal((await new SqlPersonRepository(db).findUsername('alice'))?.id, 'p');
    assert.deepEqual((await new SqlRepository(db, 'exams').get('e'))?.quizIds, ['q']);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        new SqlRepository(db, 'places').create({
          id: `place${i}`,
          createdAt: person.createdAt,
          name: `Office ${i}`,
          address: 'Road',
          latitude: 0,
          longitude: 0,
        }),
      ),
    );
    assert.equal((await new SqlRepository(db, 'places').list(2, 4)).length, 4);
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test('CLI create, seed, reset and identity synchronization use only the dedicated configured database', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'patente-cli-test-'));
  const url = `sqlite:${join(dir, 'cli.db')}`;
  const identities = join(dir, 'users.yml'),
    sentinel = join(dir, 'keep.txt');
  await writeFile(sentinel, 'untouched');
  await writeFile(
    identities,
    'users:\n  alice:\n    displayname: Alice\n    email: alice@test.it\n',
  );
  const command = (cmd: string) =>
    execute(process.execPath, ['--import', 'tsx', 'src/cli.ts', cmd], {
      env: { ...process.env, DATABASE_URL: url, AUTH_USERS_FILE: identities },
    });
  try {
    await command('create');
    await command('seed');
    await command('seed');
    let db = await connectDatabase(url);
    assert.equal((await new SqlRepository(db, 'quizzes').list(1, 100)).length, 10);
    await db.close();
    await command('reset');
    db = await connectDatabase(url);
    assert.equal((await new SqlRepository(db, 'quizzes').list(1, 100)).length, 0);
    await db.close();
    await command('sync-identities');
    await command('sync-identities');
    db = await connectDatabase(url);
    assert.equal((await new SqlPersonRepository(db).list(1, 100)).length, 1);
    await db.close();
    assert.equal(await readFile(sentinel, 'utf8'), 'untouched');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
