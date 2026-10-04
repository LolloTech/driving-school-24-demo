import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
export interface Database {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<T[]>;
  transaction<T>(work: (db: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
const postgresSql = (sql: string) => {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
};
export async function connectDatabase(url: string): Promise<Database> {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const pool = new pg.Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10000 });
    const db: Database = {
      query: async (sql, values = []) => (await pool.query(postgresSql(sql), values)).rows,
      transaction: async (work) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const tx: Database = {
            ...db,
            query: async (sql, v = []) => (await c.query(postgresSql(sql), v)).rows,
          };
          const r = await work(tx);
          await c.query('COMMIT');
          return r;
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        } finally {
          c.release();
        }
      },
      close: async () => {
        await pool.end();
      },
    };
    return db;
  }
  if (!url.startsWith('sqlite:'))
    throw new Error('DATABASE_URL must start with sqlite: or postgresql:');
  const path = url.slice(7);
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new DatabaseSync(path);
  sqlite.exec(
    'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA cache_size=-2048;',
  );
  let tail = Promise.resolve();
  const query: Database['query'] = async (sql, values = []) => {
    const statement = sqlite.prepare(sql);
    if (/^(SELECT|WITH|PRAGMA)/i.test(sql.trim()))
      return statement.all(...(values as never[])) as never;
    statement.run(...(values as never[]));
    return [];
  };
  // Serialize transaction jobs, avoiding interleaved BEGIN on the single SQLite connection.
  const db: Database = {
    query: async (sql, v) => {
      await tail;
      return query(sql, v);
    },
    transaction: (work) => {
      const result = tail.then(async () => {
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const r = await work({ ...db, query });
          sqlite.exec('COMMIT');
          return r;
        } catch (e) {
          sqlite.exec('ROLLBACK');
          throw e;
        }
      });
      tail = result.then(
        () => {},
        () => {},
      );
      return result;
    },
    close: async () => {
      await tail;
      sqlite.close();
    },
  };
  return db;
}
export async function migrate(db: Database) {
  const ddl = [
    'CREATE TABLE IF NOT EXISTS persons (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS exam_quizzes (exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE, quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT, PRIMARY KEY(exam_id,quiz_id))',
    'CREATE TABLE IF NOT EXISTS solved_exams (id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES persons(id), exam_id TEXT NOT NULL REFERENCES exams(id), data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY, data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES persons(id), status TEXT NOT NULL, data TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS solved_person ON solved_exams(person_id)',
    'CREATE INDEX IF NOT EXISTS task_owner_status ON tasks(owner_id,status)',
    'CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE, published INTEGER NOT NULL DEFAULT 0)',
  ];
  for (const sql of ddl) await db.query(sql);
}
