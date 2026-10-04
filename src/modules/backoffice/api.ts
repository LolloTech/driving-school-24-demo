import { appUrl } from '../../paths';
export type RecordData = { id: string; createdAt: string; [key: string]: unknown };
export type Answer = { id: string; text: string; correct?: boolean };
export type Quiz = RecordData & { question: string; answers: Answer[] };
export type Exam = RecordData & { title: string; quizIds: string[] };
export type Me = {
  actor: { username: string; groups: string[] };
  person: RecordData & { name: string; email: string };
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(appUrl(path), {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    let message = `Richiesta non riuscita (${r.status})`;
    try {
      message = (await r.json()).error ?? message;
    } catch {}
    throw new ApiError(r.status, message);
  }
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T);
}
