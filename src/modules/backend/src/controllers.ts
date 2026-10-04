import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { AppError, type Actor, type EntityName } from './entities.js';
import type { DomainService } from './services/domain.js';
import type { AuthService } from './services/auth.js';
import type { TaskService } from './services/tasks.js';
import type { HealthService } from './services/health.js';
import { schemas } from './schemas.js';
export function createApp(
  services: { domain: DomainService; auth: AuthService; tasks: TaskService; health: HealthService },
  origin: string,
) {
  const app = Fastify({
    logger: false,
    bodyLimit: 32768,
    requestTimeout: 10000,
    trustProxy: false,
  });
  app.register(rateLimit, { max: 120, timeWindow: 60000 });
  app.addHook('onRequest', async (req) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const supplied = req.headers.origin;
      if (supplied && supplied !== origin) throw new AppError(403, 'Invalid request origin');
      if (!req.headers['content-type']?.startsWith('application/json'))
        throw new AppError(415, 'JSON required');
    }
  });
  app.setErrorHandler((e, req, reply) => {
    const error = e as Error & { code?: string; errcode?: number; statusCode?: number };
    if (e instanceof AppError) return reply.code(e.status).send({ error: e.message });
    if (
      (error.errcode !== undefined && (error.errcode & 255) === 19) ||
      error.code?.includes('CONSTRAINT') ||
      error.code === '23505' ||
      error.code === '23503'
    )
      return reply.code(409).send({ error: 'Duplicate record or relation still in use' });
    if (error.statusCode && error.statusCode < 500)
      return reply.code(error.statusCode).send({ error: error.message });
    req.log.error(e);
    reply.code(500).send({ error: 'Internal server error' });
  });
  app.get('/health', async (_, reply) => {
    const h = await services.health.check();
    return reply.code(h.ok ? 200 : 503).send(h);
  });
  app.get('/api/health', async (_, reply) => {
    const h = await services.health.check();
    return reply.code(h.ok ? 200 : 503).send(h);
  });
  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 5, timeWindow: 60000 } } },
    async (req, reply) => reply.code(201).send(await services.auth.register(req.body as never)),
  );
  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: 60000 } } },
    async (req, reply) => {
      const r = await services.auth.login(req.body as never);
      reply.header('set-cookie', r.cookies);
      return { ok: true };
    },
  );
  app.post('/api/auth/logout', async (req, reply) => {
    const r = await services.auth.logout(req.headers.cookie ?? '');
    reply.header('set-cookie', r.cookies);
    return { ok: true };
  });
  app.get('/api/auth/me', async (req) => services.auth.me(req.headers.cookie ?? ''));
  app.register(async (secured) => {
    secured.decorateRequest('actor', null);
    secured.addHook('preHandler', async (req) => {
      (req as typeof req & { actor: Actor }).actor = await services.auth.gateway.verify(
        req.headers.cookie ?? '',
      );
    });
    const actor = (req: unknown) => (req as { actor: Actor }).actor;
    secured.get('/api/schemas', async () => schemas);
    for (const kind of [
      'persons',
      'quizzes',
      'exams',
      'solvedExams',
      'places',
      'tasks',
    ] as EntityName[]) {
      secured.get(`/api/${kind}`, async (req) => {
        const q = req.query as { page?: string; limit?: string };
        const page = Number(q.page ?? 1),
          limit = Number(q.limit ?? 25);
        if (
          !Number.isInteger(page) ||
          page < 1 ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 100
        )
          throw new AppError(400, 'Page >= 1 and limit 1–100 required');
        return services.domain.list(kind, actor(req), page, limit);
      });
      secured.get(`/api/${kind}/:id`, async (req) =>
        services.domain.get(kind, (req.params as { id: string }).id, actor(req)),
      );
      if (kind === 'tasks')
        secured.post('/api/tasks', async (req, reply) =>
          reply
            .code(202)
            .send(await services.tasks.create((req.body as { label: string }).label, actor(req))),
        );
      else {
        secured.post(`/api/${kind}`, async (req, reply) => {
          if (kind === 'persons') {
            if (!actor(req).groups.includes('admins'))
              throw new AppError(403, 'Administrator access required');
            return reply.code(201).send(await services.auth.register(req.body as never));
          }
          return reply.code(201).send(await services.domain.create(kind, req.body, actor(req)));
        });
        secured.delete(`/api/${kind}/:id`, async (req, reply) => {
          const id = (req.params as { id: string }).id;
          if (kind === 'persons') await services.auth.remove(id, actor(req));
          else await services.domain.remove(kind, id, actor(req));
          return reply.code(204).send();
        });
        if (kind === 'quizzes' || kind === 'places')
          secured.put(`/api/${kind}/:id`, async (req) =>
            services.domain.update(kind, (req.params as { id: string }).id, req.body, actor(req)),
          );
      }
    }
  });
  return app;
}
