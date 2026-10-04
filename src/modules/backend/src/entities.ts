export type Person = {
  id: string;
  username: string;
  name: string;
  email: string;
  createdAt: string;
};
export type Answer = { id: string; text: string; correct: boolean };
export type Quiz = { id: string; question: string; answers: Answer[]; createdAt: string };
export type Exam = { id: string; title: string; quizIds: string[]; createdAt: string };
export type SolvedExam = {
  id: string;
  personId: string;
  examId: string;
  responses: { quizId: string; answerId: string }[];
  points: number;
  total: number;
  snapshot: Quiz[];
  createdAt: string;
};
export type Place = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};
export type Task = {
  id: string;
  ownerId: string;
  label: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  durationMs: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};
export type EntityMap = {
  persons: Person;
  quizzes: Quiz;
  exams: Exam;
  solvedExams: SolvedExam;
  places: Place;
  tasks: Task;
};
export type EntityName = keyof EntityMap;
export type Actor = { username: string; groups: string[] };
export type Page<T> = { items: T[]; page: number; limit: number };
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const requireAdmin = (actor: Actor) => {
  if (!actor.groups.includes('admins')) throw new AppError(403, 'Administrator access required');
};
