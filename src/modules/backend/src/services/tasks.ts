import { randomUUID } from 'node:crypto';
import { AppError, type Actor, type Task } from '../entities.js';
import type { PersonRepository, TaskRepository } from '../repositories.js';
export interface TaskQueue {
  publish(id: string): Promise<void>;
  healthy(): boolean;
  close(): Promise<void>;
}
export class TaskService {
  constructor(
    private tasks: TaskRepository,
    private people: PersonRepository,
    private queue: TaskQueue,
    private sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
    private now: () => number = Date.now,
  ) {}
  async create(label: string, actor: Actor) {
    if (typeof label !== 'string' || !label.trim() || label.length > 200)
      throw new AppError(400, 'Task label must contain 1–200 characters');
    const owner = await this.people.findUsername(actor.username);
    if (!owner) throw new AppError(403, 'Unknown account');
    const task: Task = {
      id: randomUUID(),
      ownerId: owner.id,
      label: label.trim(),
      status: 'queued',
      durationMs: 20000,
      createdAt: new Date(this.now()).toISOString(),
      startedAt: null,
      finishedAt: null,
      error: null,
    };
    await this.tasks.create(task);
    try {
      await this.flush();
    } catch {
      /* Durable outbox retries when NATS returns. */
    }
    return task;
  }
  async flush() {
    for (const id of await this.tasks.pending()) {
      await this.queue.publish(id);
      await this.tasks.markPublished(id);
    }
  }
  async execute(id: string) {
    const t = await this.tasks.get(id);
    if (!t || ['completed', 'failed'].includes(t.status)) return;
    const startedAt = t.startedAt ?? new Date(this.now()).toISOString();
    await this.tasks.replace({ ...t, status: 'running', startedAt });
    await this.sleep(Math.max(0, 20000 - (this.now() - Date.parse(startedAt))));
    await this.tasks.replace({
      ...t,
      status: 'completed',
      startedAt,
      finishedAt: new Date(this.now()).toISOString(),
    });
  }
  async fail(id: string, error: string) {
    const t = await this.tasks.get(id);
    if (t)
      await this.tasks.replace({
        ...t,
        status: 'failed',
        error: error.slice(0, 200),
        finishedAt: new Date(this.now()).toISOString(),
      });
  }
  async recover() {
    for (const t of await this.tasks.recoverable()) await this.queue.publish(t.id);
  }
}
