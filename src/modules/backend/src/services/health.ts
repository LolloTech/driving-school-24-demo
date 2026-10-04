import type { Database } from '../database.js';
import type { AuthenticationGateway } from './auth.js';
import type { TaskQueue } from './tasks.js';
export class HealthService {
  constructor(
    private db: Database,
    private auth: AuthenticationGateway,
    private queue: TaskQueue,
  ) {}
  async check() {
    let database = false;
    try {
      await this.db.query('SELECT 1');
      database = true;
    } catch {}
    const authelia = await this.auth.healthy();
    const nats = this.queue.healthy();
    return { ok: database && authelia && nats, database, authelia, nats };
  }
}
