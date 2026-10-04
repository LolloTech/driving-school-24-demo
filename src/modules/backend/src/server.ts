import { connectDatabase, migrate } from './database.js';
import { SqlPersonRepository, SqlRepository, SqlTaskRepository } from './repositories.js';
import { DomainService, type Repositories } from './services/domain.js';
import { AuthService, AutheliaGateway, FileIdentityDirectory } from './services/auth.js';
import { TaskService } from './services/tasks.js';
import { HealthService } from './services/health.js';
import { NatsTaskQueue } from './queue.js';
import { createApp } from './controllers.js';
const db = await connectDatabase(process.env.DATABASE_URL ?? 'sqlite:./data/patente.db');
await migrate(db);
const persons = new SqlPersonRepository(db),
  tasks = new SqlTaskRepository(db);
const repos: Repositories = {
  persons,
  tasks,
  quizzes: new SqlRepository(db, 'quizzes'),
  exams: new SqlRepository(db, 'exams'),
  solvedExams: new SqlRepository(db, 'solvedExams'),
  places: new SqlRepository(db, 'places'),
};
const origin = process.env.APP_ORIGIN ?? 'https://app.patente.localhost:8443';
const apiOrigin = process.env.API_ORIGIN ?? origin;
const auth = new AuthService(
  persons,
  new FileIdentityDirectory(process.env.AUTH_USERS_FILE ?? '../infra/runtime/users.yml'),
  new AutheliaGateway(
    process.env.AUTHELIA_URL ?? 'http://localhost:9091',
    origin,
    process.env.AUTH_COOKIE_HOST_ONLY === 'true',
  ),
);
const queue = new NatsTaskQueue(
  process.env.NATS_URL ?? 'nats://localhost:4222',
  process.env.NATS_TOKEN,
);
await queue.open();
const taskService = new TaskService(tasks, persons, queue);
await taskService.recover();
queue.start(taskService);
let flushing = false;
const timer = setInterval(async () => {
  if (flushing) return;
  flushing = true;
  try {
    await taskService.flush();
  } catch (e) {
    console.error('Outbox retry:', (e as Error).message);
  } finally {
    flushing = false;
  }
}, 2000);
timer.unref();
const app = createApp(
  {
    domain: new DomainService(repos),
    auth,
    tasks: taskService,
    health: new HealthService(db, auth.gateway, queue),
  },
  apiOrigin,
);
await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
console.log('Patente API listening');
const close = async () => {
  clearInterval(timer);
  await app.close();
  await queue.close();
  await db.close();
  process.exit(0);
};
process.on('SIGTERM', close);
process.on('SIGINT', close);
