import { useEffect, useState, type FormEvent } from 'react';
import { request, type Me, type Quiz, type Exam, type RecordData } from './api';
export default function RecordForm({
  kind,
  me,
  onSaved,
}: {
  kind: string;
  me: Me;
  onSaved: () => void;
}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]),
    [exams, setExams] = useState<Exam[]>([]),
    [people, setPeople] = useState<RecordData[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [examId, setExamId] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [answerCount, setAnswerCount] = useState(2),
    [correct, setCorrect] = useState(0),
    [responses, setResponses] = useState<Record<string, string>>({});
  const admin = me.actor.groups.includes('admins');
  useEffect(() => {
    let alive = true;
    const all = async <T,>(path: string) => {
      const items: T[] = [];
      for (let page = 1; ; page++) {
        const data = await request<{ items: T[] }>(`${path}?page=${page}&limit=100`);
        items.push(...data.items);
        if (data.items.length < 100) break;
      }
      return items;
    };
    const load = async () => {
      try {
        if (kind === 'exams' || kind === 'solvedExams') {
          const q = await all<Quiz>('/api/quizzes');
          if (alive) setQuizzes(q);
        }
        if (kind === 'solvedExams') {
          const e = await all<Exam>('/api/exams');
          if (alive) setExams(e);
          if (admin) {
            const p = await all<RecordData>('/api/persons');
            if (alive) setPeople(p);
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [kind, admin]);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    let body: unknown = fields;
    let path = `/api/${kind}`;
    try {
      if (kind === 'persons') {
        body = fields;
      }
      if (kind === 'quizzes')
        body = {
          question: fields.question,
          answers: Array.from({ length: answerCount }, (_, i) => ({
            id: String(i + 1),
            text: fields[`answer${i}`],
            correct: i === correct,
          })),
        };
      if (kind === 'exams') {
        if (selected.length !== 10) throw new Error('Seleziona esattamente 10 domande.');
        body = { title: fields.title, quizIds: selected };
      }
      if (kind === 'solvedExams') {
        const exam = exams.find((e) => e.id === examId);
        if (!exam) throw new Error('Seleziona un esame.');
        body = {
          personId: admin ? fields.personId : me.person.id,
          examId,
          responses: exam.quizIds.map((id) => ({ quizId: id, answerId: responses[id] })),
        };
      }
      if (kind === 'places')
        body = {
          name: fields.name,
          address: fields.address,
          latitude: Number(fields.latitude),
          longitude: Number(fields.longitude),
        };
      await request(path, 'POST', body);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const activeExam = exams.find((e) => e.id === examId);
  return (
    <form className="bo-record-form" onSubmit={submit}>
      {kind === 'persons' && (
        <>
          <label>
            Username
            <input name="username" required pattern="[a-z][a-z0-9_]{2,31}" />
          </label>
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password iniziale
            <input name="password" type="password" required minLength={12} maxLength={128} />
          </label>
          <small>L’account viene registrato anche in Authelia come studente.</small>
        </>
      )}
      {kind === 'quizzes' && (
        <>
          <label>
            Domanda
            <textarea name="question" required maxLength={500} />
          </label>
          <fieldset>
            <legend>Risposte · una sola corretta</legend>
            {Array.from({ length: answerCount }, (_, i) => (
              <div className="bo-answer-row" key={i}>
                <label className="bo-radio">
                  <input
                    type="radio"
                    name="correct"
                    checked={correct === i}
                    onChange={() => setCorrect(i)}
                  />
                  <span className="bo-sr">Risposta {i + 1} corretta</span>
                </label>
                <input
                  name={`answer${i}`}
                  aria-label={`Risposta ${i + 1}`}
                  required
                  maxLength={500}
                />
              </div>
            ))}
          </fieldset>
          <div className="bo-form-actions">
            <button
              type="button"
              disabled={answerCount === 4}
              onClick={() => setAnswerCount((n) => n + 1)}
            >
              + Risposta
            </button>
            <button
              type="button"
              disabled={answerCount === 2}
              onClick={() => {
                setAnswerCount((n) => n - 1);
                if (correct === answerCount - 1) setCorrect(0);
              }}
            >
              − Risposta
            </button>
          </div>
        </>
      )}
      {kind === 'exams' && (
        <>
          <label>
            Titolo
            <input name="title" required maxLength={500} />
          </label>
          <fieldset>
            <legend>Domande ({selected.length}/10)</legend>
            {quizzes.map((q) => (
              <label className="bo-check" key={q.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(q.id)}
                  disabled={selected.length === 10 && !selected.includes(q.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, q.id] : selected.filter((id) => id !== q.id),
                    )
                  }
                />
                {q.question}
              </label>
            ))}
            {quizzes.length < 10 && <p>Servono almeno 10 domande disponibili.</p>}
          </fieldset>
        </>
      )}
      {kind === 'solvedExams' && (
        <>
          {admin && (
            <label>
              Iscritto
              <select name="personId" required>
                <option value="">Seleziona…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {String(p.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Esame
            <select
              required
              value={examId}
              onChange={(e) => {
                setExamId(e.target.value);
                setResponses({});
              }}
            >
              <option value="">Seleziona…</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          {activeExam?.quizIds.map((id) => {
            const q = quizzes.find((q) => q.id === id);
            return q ? (
              <fieldset key={id}>
                <legend>{q.question}</legend>
                {q.answers.map((a) => (
                  <label className="bo-check" key={a.id}>
                    <input
                      required
                      type="radio"
                      name={`response-${id}`}
                      checked={responses[id] === a.id}
                      onChange={() => setResponses({ ...responses, [id]: a.id })}
                    />
                    {a.text}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p key={id}>Domanda non trovata.</p>
            );
          })}
          <small>Il punteggio viene calcolato dal backend, mai dal browser.</small>
        </>
      )}
      {kind === 'places' && (
        <>
          <label>
            Nome ufficio
            <input name="name" required />
          </label>
          <label>
            Indirizzo
            <input name="address" required />
          </label>
          <div className="bo-columns">
            <label>
              Latitudine
              <input name="latitude" required type="number" min={-90} max={90} step="any" />
            </label>
            <label>
              Longitudine
              <input name="longitude" required type="number" min={-180} max={180} step="any" />
            </label>
          </div>
        </>
      )}
      {kind === 'tasks' && (
        <>
          <label>
            Nome attività
            <input name="label" required maxLength={200} placeholder="Preparazione esame demo" />
          </label>
          <p>
            JetStream conserva il lavoro e il suo stato. L’esecuzione demo dura 20 secondi; puoi
            seguirla nel registro attività.
          </p>
        </>
      )}
      {error && (
        <p className="bo-error" role="alert">
          {error}
        </p>
      )}
      <button className="bo-primary" type="submit" disabled={busy}>
        {busy ? 'Salvataggio…' : kind === 'tasks' ? 'Avvia attività' : 'Salva record'}
      </button>
    </form>
  );
}
