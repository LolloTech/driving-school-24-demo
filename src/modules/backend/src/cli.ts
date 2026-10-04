import { rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { parse } from 'yaml';
import { resolve } from 'node:path';
import { connectDatabase, migrate } from './database.js';
import { SqlPersonRepository, SqlRepository, SqlTaskRepository } from './repositories.js';
import { AuthService, FileIdentityDirectory } from './services/auth.js';
import { DomainService, type Repositories } from './services/domain.js';
const command = process.argv[2];
if (!['create', 'reset', 'seed', 'setup', 'sync-identities', 'set-admin-password'].includes(command))
  throw new Error('Use create, reset, seed, setup, sync-identities, set-admin-password');
const runtime = resolve(process.env.SETUP_RUNTIME ?? '../infra/runtime');
const identityPath = resolve(process.env.AUTH_USERS_FILE ?? resolve(runtime, 'users.yml'));
const url = process.env.DATABASE_URL ?? 'sqlite:./data/patente.db';
if (command === 'reset') {
  if (!url.startsWith('sqlite:') || url === 'sqlite::memory:')
    throw new Error('Reset only supports a named SQLite file');
  const path = resolve(url.slice(7));
  // Only the explicitly configured DB and its SQLite sidecars are removed.
  for (const suffix of ['', '-wal', '-shm']) await rm(path + suffix, { force: true });
}
const db = await connectDatabase(url);
await migrate(db);
const people = new SqlPersonRepository(db);
const identityDirectory = new FileIdentityDirectory(identityPath);
if (command === 'set-admin-password') {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Set ADMIN_PASSWORD to the new admin password');
  await identityDirectory.setPassword('admin', password);
  await db.close();
  console.log('Administrator password updated in the configured identity file.');
  process.exit(0);
}
async function synchronizeIdentities() {
  let document: { users?: Record<string, { displayname: string; email: string }> };
  try {
    document = parse(await readFile(identityPath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  for (const [username, user] of Object.entries(document.users ?? {})) {
    if (!(await people.findUsername(username)))
      await people.create({
        id: randomUUID(),
        username,
        name: user.displayname,
        email: user.email.toLowerCase(),
        createdAt: new Date().toISOString(),
      });
  }
}
if (command === 'sync-identities') {
  await synchronizeIdentities();
  console.log('Identity registry synchronized; existing passwords preserved.');
}
const repos: Repositories = {
  persons: people,
  tasks: new SqlTaskRepository(db),
  quizzes: new SqlRepository(db, 'quizzes'),
  exams: new SqlRepository(db, 'exams'),
  solvedExams: new SqlRepository(db, 'solvedExams'),
  places: new SqlRepository(db, 'places'),
};
if (command === 'seed') {
  const service = new DomainService(repos);
  const admin = { username: 'admin', groups: ['admins'] };
  if ((await repos.quizzes.list(1, 1)).length === 0) {
    const quizzes = [];
    for (let i = 1; i <= 10; i++)
      quizzes.push(
        await service.create(
          'quizzes',
          {
            question: `Domanda demo ${i}: quando guidi devi rispettare la segnaletica?`,
            answers: [
              { id: 'a', text: 'Sì, sempre.', correct: true },
              { id: 'b', text: 'Solo quando c’è traffico.', correct: false },
            ],
          },
          admin,
        ),
      );
    await service.create(
      'exams',
      { title: 'Esame dimostrativo — 10 domande', quizIds: quizzes.map((q) => q.id) },
      admin,
    );
  }
  if ((await repos.places.list(1, 1)).length === 0)
    await service.create(
      'places',
      {
        name: 'Ufficio demo Roma',
        address: 'Via dimostrativa 1, Roma (dati demo)',
        latitude: 41.9028,
        longitude: 12.4964,
      },
      admin,
    );
  console.log('Demo tables and seed records ready (idempotent).');
}
if (command === 'setup') {
  await mkdir(runtime, { recursive: true });
  const envPath = resolve('../.env');
  try {
    await readFile(envPath);
    console.log('Existing .env preserved.');
  } catch {
    const secret = () => randomBytes(32).toString('hex');
    await writeFile(
      envPath,
      `AUTHELIA_SESSION_SECRET=${secret()}\nAUTHELIA_STORAGE_ENCRYPTION_KEY=${secret()}\nAUTHELIA_JWT_SECRET=${secret()}\nNATS_TOKEN=${secret()}\n`,
      { mode: 0o600 },
    );
  }
  const password = process.env.ADMIN_PASSWORD ?? randomBytes(18).toString('base64url');
  await synchronizeIdentities();
  if (!(await people.findUsername('admin'))) {
    const auth = new AuthService(people, identityDirectory, {
      verify: async () => {
        throw new Error('Not available in setup');
      },
      login: async () => ({ cookies: [] }),
      logout: async () => ({ cookies: [] }),
      healthy: async () => false,
    });
    await auth.register(
      { username: 'admin', name: 'Amministratore demo', email: 'admin@example.test', password },
      ['admins'],
    );
    await writeFile(
      resolve(runtime, 'admin-credentials.txt'),
      `Local demo admin\nUsername: admin\nPassword: ${password}\n`,
      { mode: 0o600 },
    );
    console.log(
      'Administrator credentials saved to infra/runtime/admin-credentials.txt (not logged).',
    );
  } else if (process.env.ADMIN_PASSWORD) {
    await identityDirectory.setPassword('admin', password);
    await writeFile(
      resolve(runtime, 'admin-credentials.txt'),
      `Local demo admin\nUsername: admin\nPassword: ${password}\n`,
      { mode: 0o600 },
    );
    console.log('Administrator password updated from ADMIN_PASSWORD.');
  }
}
await db.close();
