import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Backoffice from '../Backoffice';
import RecordForm from '../RecordForm';
import { useHealth } from '../useHealth';
import { request } from '../api';
import type { Me } from '../api';
const me: Me = {
  actor: { username: 'admin', groups: ['admins'] },
  person: { id: 'p', name: 'Admin', email: 'a@test.it', createdAt: '2026-01-01' },
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
describe('React login and backoffice', () => {
  it('submits login credentials and loads the authenticated workspace', async () => {
    let signedIn = false;
    const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/health') return response({ ok: true });
      if (path === '/api/auth/login') {
        signedIn = true;
        expect(JSON.parse(init!.body as string)).toEqual({ username: 'admin', password: 'secret' });
        return response({ ok: true });
      }
      if (path === '/api/auth/me')
        return signedIn ? response(me) : response({ error: 'Please log in' }, 401);
      return response({ items: [] });
    });
    vi.stubGlobal('fetch', fetcher);
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Backoffice />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('navigation', { name: 'Backoffice' })).toBeInTheDocument();
    expect(screen.getByText('Amministratore')).toBeInTheDocument();
  });
  it('registers a student and returns to login', async () => {
    const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/health') return response({ ok: true });
      if (path === '/api/auth/me') return response({ error: 'Please log in' }, 401);
      if (path === '/api/auth/register') {
        expect(JSON.parse(init!.body as string)).toMatchObject({
          username: 'alice',
          email: 'alice@test.it',
        });
        return response({ id: 'alice' }, 201);
      }
      return response({});
    });
    vi.stubGlobal('fetch', fetcher);
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Backoffice />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Nome completo'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@test.it');
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123');
    await user.click(screen.getByRole('button', { name: 'Crea account' }));
    expect(await screen.findByText('Account creato. Ora puoi accedere.')).toBeInTheDocument();
  });
  it('shows authentication errors and does not open the workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) =>
        path === '/health'
          ? response({ ok: true })
          : response({ error: 'Invalid credentials' }, 401),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Backoffice />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('defaults to dark, persists theme and primary color, displays records and offline banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) =>
        path === '/health'
          ? response({ ok: false }, 503)
          : path === '/api/auth/me'
            ? response(me)
            : response({
                items: [
                  {
                    id: 'q1',
                    createdAt: '2026-01-01',
                    question: 'A stop sign?',
                    answers: [
                      { id: 'a', text: 'Stop', correct: true },
                      { id: 'b', text: 'Go', correct: false },
                    ],
                  },
                ],
              }),
      ),
    );
    const { container } = render(
      <MemoryRouter initialEntries={['/backoffice/quizzes']}>
        <Backoffice />
      </MemoryRouter>,
    );
    expect(await screen.findByText('A stop sign?')).toBeInTheDocument();
    expect(container.querySelector('.bo')).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('alert')).toHaveTextContent('15 secondi');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Passa a tema chiaro' }));
    expect(localStorage.getItem('bo-mode')).toBe('light');
    fireEvent.change(screen.getByLabelText('Colore principale'), { target: { value: '#ff6600' } });
    expect(localStorage.getItem('bo-primary')).toBe('#ff6600');
    await user.click(screen.getByRole('button', { name: 'Visualizza' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Stop');
  });
  it('does not render stale quiz rows with the exams badge during section navigation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => {
        if (path === '/health') return response({ ok: true });
        if (path === '/api/auth/me') return response(me);
        if (path.startsWith('/api/quizzes'))
          return response({
            items: [
              {
                id: 'q1',
                createdAt: '2026-01-01',
                question: 'Quiz row',
                answers: [{ id: 'a', text: 'Answer' }],
              },
            ],
          });
        return response({
          items: [
            {
              id: 'e1',
              createdAt: '2026-01-01',
              title: 'Exam row',
              quizIds: ['q1'],
            },
          ],
        });
      }),
    );
    render(
      <MemoryRouter initialEntries={['/backoffice/quizzes']}>
        <Backoffice />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    expect(await screen.findByText('Quiz row')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '03Esami' }));
    expect(await screen.findByText('Exam row')).toBeInTheDocument();
    expect(screen.queryByText('Quiz row')).not.toBeInTheDocument();
  });
});
describe('React record forms', () => {
  it('creates a person through the admin endpoint with identity credentials', async () => {
    const fetcher = vi.fn(async (_path: string, _init?: RequestInit) => response({}, 201));
    vi.stubGlobal('fetch', fetcher);
    const saved = vi.fn();
    render(<RecordForm kind="persons" me={me} onSaved={saved} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Nome', { exact: true }), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@test.it');
    await user.type(screen.getByLabelText('Password iniziale'), 'StudentPassword123');
    await user.click(screen.getByRole('button', { name: 'Salva record' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][0]).toBe('/api/persons');
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({
      username: 'alice',
      name: 'Alice',
      email: 'alice@test.it',
      password: 'StudentPassword123',
    });
  });
  it('submits office coordinates as numbers', async () => {
    const fetcher = vi.fn(async (_path: string, _init?: RequestInit) => response({}, 201));
    vi.stubGlobal('fetch', fetcher);
    render(<RecordForm kind="places" me={me} onSaved={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nome ufficio'), 'Office');
    await user.type(screen.getByLabelText('Indirizzo'), 'Road 1');
    await user.type(screen.getByLabelText('Latitudine'), '41.9');
    await user.type(screen.getByLabelText('Longitudine'), '12.4');
    await user.click(screen.getByRole('button', { name: 'Salva record' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      name: 'Office',
      address: 'Road 1',
      latitude: 41.9,
      longitude: 12.4,
    });
  });
  it('submits student exam answers without a client-supplied score or person selector', async () => {
    const quizzes = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`,
      question: `Question ${i}`,
      answers: [
        { id: 'a', text: `Answer ${i}` },
        { id: 'b', text: `Other ${i}` },
      ],
    }));
    const fetcher = vi.fn(async (path: string, _init?: RequestInit) =>
      path.startsWith('/api/quizzes')
        ? response({ items: quizzes })
        : path.startsWith('/api/exams')
          ? response({
              items: [{ id: 'e', title: 'Demo exam', quizIds: quizzes.map((q) => q.id) }],
            })
          : response({ points: 10 }, 201),
    );
    vi.stubGlobal('fetch', fetcher);
    const saved = vi.fn();
    render(
      <RecordForm
        kind="solvedExams"
        me={{ ...me, actor: { username: 'alice', groups: ['students'] } }}
        onSaved={saved}
      />,
    );
    const user = userEvent.setup();
    await screen.findByText('Demo exam');
    expect(screen.queryByLabelText('Iscritto')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Esame'), 'e');
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByLabelText(`Answer ${i}`, { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Salva record' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    const post = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!;
    const body = JSON.parse(post[1]!.body as string);
    expect(body.personId).toBe(me.person.id);
    expect(body.responses).toHaveLength(10);
    expect(body).not.toHaveProperty('points');
  });
  it('enforces two to four quiz answers and submits exactly one correct answer', async () => {
    const saved = vi.fn();
    const fetcher = vi.fn(async (_path: string, _init?: RequestInit) => response({}, 201));
    vi.stubGlobal('fetch', fetcher);
    render(<RecordForm kind="quizzes" me={me} onSaved={saved} />);
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: '− Risposta' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '+ Risposta' }));
    await user.click(screen.getByRole('button', { name: '+ Risposta' }));
    expect(screen.getByRole('button', { name: '+ Risposta' })).toBeDisabled();
    await user.type(screen.getByLabelText('Domanda'), 'Stop?');
    for (let i = 1; i <= 4; i++)
      await user.type(screen.getByLabelText(`Risposta ${i}`, { exact: true }), `Answer ${i}`);
    await user.click(screen.getByLabelText('Risposta 3 corretta'));
    await user.click(screen.getByRole('button', { name: 'Salva record' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    const data = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(data.answers).toHaveLength(4);
    expect(data.answers.filter((a: { correct: boolean }) => a.correct)).toHaveLength(1);
    expect(data.answers[2].correct).toBe(true);
  });
  it('requires ten unique questions before saving an exam', async () => {
    const quizzes = Array.from({ length: 11 }, (_, i) => ({
      id: `q${i}`,
      question: `Question ${i}`,
      answers: [],
    }));
    const saved = vi.fn();
    const fetcher = vi.fn(async (path: string) =>
      path.startsWith('/api/quizzes') ? response({ items: quizzes }) : response({}, 201),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<RecordForm kind="exams" me={me} onSaved={saved} />);
    const user = userEvent.setup();
    await screen.findByText('Question 0');
    await user.type(screen.getByLabelText('Titolo'), 'Exam');
    await user.click(screen.getByRole('button', { name: 'Salva record' }));
    expect(screen.getByRole('alert')).toHaveTextContent('10 domande');
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByLabelText(`Question ${i}`, { exact: true }));
    expect(screen.getByLabelText('Question 10')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Salva record' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
  });
  it('creates a task and surfaces backend validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ error: 'Queue unavailable' }, 503)),
    );
    render(<RecordForm kind="tasks" me={me} onSaved={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nome attività'), 'Demo');
    await user.click(screen.getByRole('button', { name: 'Avvia attività' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Queue unavailable');
  });
});
it('health checks immediately, every 15 seconds, recovers and stops on unmount', async () => {
  vi.useFakeTimers();
  let connected = false;
  const fetcher = vi.fn(async () => response({ ok: connected }, connected ? 200 : 503));
  vi.stubGlobal('fetch', fetcher);
  function Probe() {
    const state = useHealth();
    return <span>{String(state)}</span>;
  }
  const { unmount } = render(<Probe />);
  await act(async () => {});
  expect(screen.getByText('false')).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(1);
  connected = true;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(screen.getByText('true')).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);
  unmount();
  await vi.advanceTimersByTimeAsync(15000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('API client preserves meaningful errors and handles empty successful responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response({ error: 'Not permitted' }, 403)),
  );
  await expect(request('/api/persons')).rejects.toMatchObject({
    status: 403,
    message: 'Not permitted',
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  );
  expect(await request('/api/places/x', 'DELETE', {})).toBeUndefined();
});
