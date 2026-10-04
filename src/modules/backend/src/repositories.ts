import type { Database } from './database.js';
import type { EntityMap, EntityName, Person, Task } from './entities.js';
export interface Repository<K extends EntityName> {
  get(id: string): Promise<EntityMap[K] | null>;
  list(page: number, limit: number, ownerId?: string): Promise<EntityMap[K][]>;
  create(entity: EntityMap[K]): Promise<EntityMap[K]>;
  replace(entity: EntityMap[K]): Promise<EntityMap[K]>;
  remove(id: string): Promise<boolean>;
}
export interface PersonRepository extends Repository<'persons'> {
  findUsername(username: string): Promise<Person | null>;
}
export interface TaskRepository extends Repository<'tasks'> {
  pending(): Promise<string[]>;
  markPublished(id: string): Promise<void>;
  recoverable(): Promise<Task[]>;
}
const tables: Record<EntityName, string> = {
  persons: 'persons',
  quizzes: 'quizzes',
  exams: 'exams',
  solvedExams: 'solved_exams',
  places: 'places',
  tasks: 'tasks',
};
export class SqlRepository<K extends EntityName> implements Repository<K> {
  constructor(
    protected db: Database,
    protected kind: K,
  ) {}
  async get(id: string) {
    const rows = await this.db.query<{ data: string }>(
      `SELECT data FROM ${tables[this.kind]} WHERE id=?`,
      [id],
    );
    return rows[0] ? (JSON.parse(rows[0].data) as EntityMap[K]) : null;
  }
  async list(page: number, limit: number, ownerId?: string) {
    const col = this.kind === 'solvedExams' ? 'person_id' : 'owner_id';
    const filter = ownerId && ['solvedExams', 'tasks'].includes(this.kind);
    const rows = await this.db.query<{ data: string }>(
      `SELECT data FROM ${tables[this.kind]} ${filter ? `WHERE ${col}=?` : ''} ORDER BY id LIMIT ? OFFSET ?`,
      [...(filter ? [ownerId] : []), limit, (page - 1) * limit],
    );
    return rows.map((r) => JSON.parse(r.data) as EntityMap[K]);
  }
  protected columns(entity: EntityMap[K]) {
    const e = entity as unknown as Record<string, unknown>;
    const extra: Record<string, unknown> =
      this.kind === 'persons'
        ? { username: e.username, email: e.email }
        : this.kind === 'solvedExams'
          ? { person_id: e.personId, exam_id: e.examId }
          : this.kind === 'tasks'
            ? { owner_id: e.ownerId, status: e.status }
            : {};
    return { id: e.id, ...extra, data: JSON.stringify(entity) };
  }
  async create(entity: EntityMap[K]) {
    await this.db.transaction(async (tx) => {
      const cols = this.columns(entity);
      await tx.query(
        `INSERT INTO ${tables[this.kind]} (${Object.keys(cols).join(',')}) VALUES (${Object.keys(
          cols,
        )
          .map(() => '?')
          .join(',')})`,
        Object.values(cols),
      );
      if (this.kind === 'exams')
        for (const q of (entity as EntityMap['exams']).quizIds)
          await tx.query('INSERT INTO exam_quizzes(exam_id,quiz_id) VALUES (?,?)', [entity.id, q]);
      if (this.kind === 'tasks') await tx.query('INSERT INTO outbox(id) VALUES (?)', [entity.id]);
    });
    return entity;
  }
  async replace(entity: EntityMap[K]) {
    const cols = this.columns(entity);
    delete (cols as { id?: unknown }).id;
    await this.db.query(
      `UPDATE ${tables[this.kind]} SET ${Object.keys(cols)
        .map((k) => `${k}=?`)
        .join(',')} WHERE id=?`,
      [...Object.values(cols), entity.id],
    );
    return entity;
  }
  async remove(id: string) {
    if (!(await this.get(id))) return false;
    await this.db.query(`DELETE FROM ${tables[this.kind]} WHERE id=?`, [id]);
    return true;
  }
}
export class SqlPersonRepository extends SqlRepository<'persons'> implements PersonRepository {
  constructor(db: Database) {
    super(db, 'persons');
  }
  async findUsername(username: string) {
    const r = await this.db.query<{ data: string }>('SELECT data FROM persons WHERE username=?', [
      username,
    ]);
    return r[0] ? (JSON.parse(r[0].data) as Person) : null;
  }
}
export class SqlTaskRepository extends SqlRepository<'tasks'> implements TaskRepository {
  constructor(db: Database) {
    super(db, 'tasks');
  }
  async pending() {
    return (
      await this.db.query<{ id: string }>('SELECT id FROM outbox WHERE published=0 LIMIT 50')
    ).map((r) => r.id);
  }
  async markPublished(id: string) {
    await this.db.query('UPDATE outbox SET published=1 WHERE id=?', [id]);
  }
  async recoverable() {
    return (
      await this.db.query<{ data: string }>(
        "SELECT data FROM tasks WHERE status IN ('queued','running') LIMIT 50",
      )
    ).map((r) => JSON.parse(r.data) as Task);
  }
}
