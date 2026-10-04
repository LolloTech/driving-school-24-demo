// JSON Schema describes stored JSON and explicit relational links as x-relations.
const str = { type: 'string', minLength: 1, maxLength: 500 };
const id = { type: 'string', minLength: 1, maxLength: 100 };
const base = { id, createdAt: { type: 'string', format: 'date-time' } };
const object = (properties: object, required: string[], relations: object = {}) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
  'x-relations': relations,
});
export const schemas = {
  persons: object(
    {
      ...base,
      username: { type: 'string', pattern: '^[a-z][a-z0-9_]{2,31}$' },
      name: str,
      email: { type: 'string', format: 'email', maxLength: 254 },
    },
    ['username', 'name', 'email'],
  ),
  quizzes: object(
    {
      ...base,
      question: str,
      answers: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: object({ id, text: str, correct: { type: 'boolean' } }, ['id', 'text', 'correct']),
        contains: object({ id, text: str, correct: { const: true } }, ['correct']),
        minContains: 1,
        maxContains: 1,
      },
    },
    ['question', 'answers'],
  ),
  exams: object(
    {
      ...base,
      title: str,
      quizIds: { type: 'array', minItems: 10, maxItems: 10, uniqueItems: true, items: id },
    },
    ['title', 'quizIds'],
    { quizIds: { entity: 'quizzes', field: 'id', cardinality: 'many', count: 10 } },
  ),
  solvedExams: object(
    {
      ...base,
      personId: id,
      examId: id,
      responses: {
        type: 'array',
        minItems: 10,
        maxItems: 10,
        items: object({ quizId: id, answerId: id }, ['quizId', 'answerId']),
      },
      points: { type: 'integer', minimum: 0, maximum: 10 },
      total: { const: 10 },
      snapshot: { type: 'array', items: { type: 'object' } },
    },
    ['personId', 'examId', 'responses'],
    {
      personId: { entity: 'persons', field: 'id' },
      examId: { entity: 'exams', field: 'id' },
      'responses[].quizId': { entity: 'quizzes', field: 'id' },
    },
  ),
  places: object(
    {
      ...base,
      name: str,
      address: str,
      latitude: { type: 'number', minimum: -90, maximum: 90 },
      longitude: { type: 'number', minimum: -180, maximum: 180 },
    },
    ['name', 'address', 'latitude', 'longitude'],
  ),
  tasks: object(
    {
      ...base,
      ownerId: id,
      label: str,
      status: { enum: ['queued', 'running', 'completed', 'failed'] },
      durationMs: { const: 20000 },
      startedAt: { type: ['string', 'null'] },
      finishedAt: { type: ['string', 'null'] },
      error: { type: ['string', 'null'] },
    },
    ['ownerId', 'label', 'status', 'durationMs'],
    { ownerId: { entity: 'persons', field: 'id' } },
  ),
};
