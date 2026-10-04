import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { randomUUID } from 'node:crypto';
import {
  AppError,
  requireAdmin,
  type Actor,
  type EntityMap,
  type EntityName,
  type Quiz,
} from '../entities.js';
import type { PersonRepository, Repository } from '../repositories.js';
import { schemas } from '../schemas.js';
export type Repositories = { [K in EntityName]: Repository<K> } & { persons: PersonRepository };
const ajv = new (Ajv2020 as unknown as typeof import('ajv').Ajv)({
  strict: false,
  allErrors: true,
});
(addFormats as unknown as (a: typeof ajv) => void)(ajv);
const validators = Object.fromEntries(Object.entries(schemas).map(([k, s]) => [k, ajv.compile(s)]));
export class DomainService {
  constructor(private repos: Repositories) {}
  async actorPerson(actor: Actor) {
    const p = await this.repos.persons.findUsername(actor.username);
    if (!p) throw new AppError(403, 'Account is not provisioned in the registry');
    return p;
  }
  async list<K extends EntityName>(kind: K, actor: Actor, page = 1, limit = 25) {
    if (kind === 'persons') requireAdmin(actor);
    let owner: string | undefined;
    if (!actor.groups.includes('admins') && ['solvedExams', 'tasks'].includes(kind))
      owner = (await this.actorPerson(actor)).id;
    const items = await this.repos[kind].list(page, limit, owner);
    return {
      items:
        kind === 'quizzes' && !actor.groups.includes('admins')
          ? items.map((q) => this.publicQuiz(q as unknown as Quiz))
          : items,
      page,
      limit,
    };
  }
  publicQuiz(q: Quiz) {
    return { ...q, answers: q.answers.map(({ id, text }) => ({ id, text })) };
  }
  async get<K extends EntityName>(kind: K, id: string, actor: Actor) {
    const e = await this.repos[kind].get(id);
    if (!e) throw new AppError(404, 'Record not found');
    if (kind === 'persons') requireAdmin(actor);
    if (!actor.groups.includes('admins') && ['solvedExams', 'tasks'].includes(kind)) {
      const p = await this.actorPerson(actor);
      if (
        (e as EntityMap['solvedExams']).personId !== p.id &&
        (e as EntityMap['tasks']).ownerId !== p.id
      )
        throw new AppError(403, 'This record belongs to another person');
    }
    return kind === 'quizzes' && !actor.groups.includes('admins')
      ? this.publicQuiz(e as unknown as Quiz)
      : e;
  }
  async create<K extends Exclude<EntityName, 'tasks'>>(kind: K, input: unknown, actor: Actor) {
    if (kind !== 'solvedExams') requireAdmin(actor);
    const data = input as Record<string, unknown>;
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new AppError(400, 'Expected an object');
    const allowed = Object.keys(schemas[kind].properties).filter(
      (k) => !['id', 'createdAt', 'points', 'total', 'snapshot'].includes(k),
    );
    if (Object.keys(data).some((k) => !allowed.includes(k)))
      throw new AppError(400, 'Unknown or server-managed fields');
    if (!validators[kind](data)) throw new AppError(400, ajv.errorsText(validators[kind].errors));
    let computed = {};
    if (kind === 'quizzes') {
      const q = data as unknown as Quiz;
      if (new Set(q.answers.map((a) => a.id)).size !== q.answers.length)
        throw new AppError(400, 'Answer IDs must be unique');
      if (q.answers.filter((a) => a.correct).length !== 1)
        throw new AppError(400, 'Exactly one answer must be correct');
    }
    if (kind === 'exams') {
      for (const id of data.quizIds as string[])
        if (!(await this.repos.quizzes.get(id))) throw new AppError(400, `Unknown quiz: ${id}`);
    }
    if (kind === 'solvedExams') {
      const d = data as unknown as EntityMap['solvedExams'];
      const person = await this.repos.persons.get(d.personId);
      if (!person) throw new AppError(400, 'Unknown person');
      if (!actor.groups.includes('admins') && person.username !== actor.username)
        throw new AppError(403, 'Cannot submit answers for another person');
      const exam = await this.repos.exams.get(d.examId);
      if (!exam) throw new AppError(400, 'Unknown exam');
      if (
        new Set(d.responses.map((r) => r.quizId)).size !== 10 ||
        d.responses.some((r) => !exam.quizIds.includes(r.quizId))
      )
        throw new AppError(400, 'Submit exactly one response for each exam question');
      const snapshot: Quiz[] = [];
      let points = 0;
      for (const r of d.responses) {
        const q = await this.repos.quizzes.get(r.quizId);
        if (!q) throw new AppError(400, 'Exam question no longer exists');
        const a = q.answers.find((a) => a.id === r.answerId);
        if (!a) throw new AppError(400, 'Answer does not belong to question');
        if (a.correct) points++;
        snapshot.push(q);
      }
      computed = { points, total: 10, snapshot };
    }
    const record = {
      ...data,
      ...computed,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    } as EntityMap[K];
    return this.repos[kind].create(record as never);
  }
  async remove(kind: Exclude<EntityName, 'tasks'>, id: string, actor: Actor) {
    requireAdmin(actor);
    if (!(await this.repos[kind].remove(id))) throw new AppError(404, 'Record not found');
  }
  // Exams and attempts are immutable: version them with a new record to preserve scoring history.
  async update(kind: 'quizzes' | 'places', id: string, input: unknown, actor: Actor) {
    requireAdmin(actor);
    const old = await this.repos[kind].get(id);
    if (!old) throw new AppError(404, 'Record not found');
    if (!validators[kind](input)) throw new AppError(400, 'Invalid record');
    const d = input as Record<string, unknown>;
    if (Object.keys(d).some((k) => ['id', 'createdAt'].includes(k)))
      throw new AppError(400, 'Server-managed fields');
    if (kind === 'quizzes') {
      for (let page = 1; ; page++) {
        const refs = await this.repos.exams.list(page, 100);
        if (refs.some((e) => e.quizIds.includes(id)))
          throw new AppError(409, 'Referenced quiz is immutable; create a new question');
        if (refs.length < 100) break;
      }
      const q = d as unknown as Quiz;
      if (
        new Set(q.answers.map((a) => a.id)).size !== q.answers.length ||
        q.answers.filter((a) => a.correct).length !== 1
      )
        throw new AppError(400, 'Invalid answers');
    }
    return this.repos[kind].replace({ ...d, id, createdAt: old.createdAt } as never);
  }
}
