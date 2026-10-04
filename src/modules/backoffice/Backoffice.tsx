import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, request, type Me, type RecordData, type Answer } from './api';
import { appUrl } from '../../paths';
import { useHealth } from './useHealth';
import RecordForm from './RecordForm';
const sections = [
  ['persons', 'Iscritti', '01'],
  ['quizzes', 'Domande quiz', '02'],
  ['exams', 'Esami', '03'],
  ['solvedExams', 'Esami svolti', '04'],
  ['places', 'Sedi e uffici', '05'],
  ['tasks', 'Attività', '06'],
];
const names: Record<string, string> = Object.fromEntries(sections.map(([k, v]) => [k, v]));
export default function Backoffice() {
  const connected = useHealth(),
    navigate = useNavigate(),
    location = useLocation();
  const register = location.pathname === '/register';
  const section = location.pathname.split('/')[2] || 'quizzes';
  const [me, setMe] = useState<Me | null>(null),
    [checking, setChecking] = useState(true),
    [error, setError] = useState('');
  const [rows, setRows] = useState<RecordData[]>([]),
    [rowsSection, setRowsSection] = useState(section),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [creating, setCreating] = useState(false),
    [detail, setDetail] = useState<RecordData | null>(null);
  const [mode, setMode] = useState(() => localStorage.getItem('bo-mode') ?? 'dark'),
    [color, setColor] = useState(() => localStorage.getItem('bo-primary') ?? '#91a7ff');
  const admin = me?.actor.groups.includes('admins') ?? false;
  useEffect(() => {
    request<Me>('/api/auth/me')
      .then(setMe)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (me && (location.pathname === '/login' || register))
      navigate('/backoffice/quizzes', { replace: true });
  }, [me, location.pathname, register, navigate]);
  useEffect(() => {
    localStorage.setItem('bo-mode', mode);
    localStorage.setItem('bo-primary', color);
  }, [mode, color]);
  const load = async () => {
    setLoading(true);
    try {
      const data = await request<{ items: RecordData[] }>(`/api/${section}?page=${page}&limit=25`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setRowsSection(section);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 401) {
        setMe(null);
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setRows([]);
    setCreating(false);
    setDetail(null);
    setPage(1);
  }, [section]);
  useEffect(() => {
    if (!me || !names[section]) return;
    let alive = true;
    const refresh = async () => {
      try {
        const data = await request<{ items: RecordData[] }>(
          `/api/${section}?page=${page}&limit=25`,
        );
        if (alive) {
          setRows(Array.isArray(data.items) ? data.items : []);
          setRowsSection(section);
          setError('');
        }
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          if (e instanceof ApiError && e.status === 401) {
            setMe(null);
            navigate('/login');
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    setLoading(true);
    void refresh();
    const timer = section === 'tasks' ? setInterval(() => void refresh(), 2000) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [me, section, page, navigate]);
  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (register) {
        await request('/api/auth/register', 'POST', values);
        navigate('/login');
        setError('Account creato. Ora puoi accedere.');
      } else {
        await request('/api/auth/login', 'POST', values);
        setMe(await request<Me>('/api/auth/me'));
        navigate('/backoffice/quizzes');
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const logout = async () => {
    try {
      await request('/api/auth/logout', 'POST', {});
      setMe(null);
      navigate('/login');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const badge = (r: RecordData) =>
    section === 'tasks'
      ? String(r.status)
      : section === 'solvedExams'
        ? `${r.points} / ${r.total}`
        : section === 'exams'
          ? Array.isArray(r.quizIds)
            ? `${r.quizIds.length} domande`
            : 'Dati incompleti'
          : section === 'quizzes'
            ? Array.isArray(r.answers)
              ? `${r.answers.length} risposte`
              : 'Dati incompleti'
            : section === 'places'
              ? `${r.latitude}, ${r.longitude}`
              : String(r.email);
  const visibleRows = rowsSection === section ? rows : [];
  const title = (r: RecordData) =>
    String(r.name ?? r.question ?? r.title ?? r.label ?? `Esame svolto ${r.id.slice(0, 8)}`);
  return (
    <div className="bo" data-theme={mode} style={{ '--primary': color } as CSSProperties}>
      {connected === false && (
        <div className="bo-offline" role="alert">
          Connessione ai servizi non disponibile. Verifica backend, Authelia e NATS. Nuovo controllo
          ogni 15 secondi.
        </div>
      )}
      {!me ? (
        <main className="bo-auth">
          <a className="bo-brand" href={appUrl("/")}>
            Via Libera <span>WORKSPACE</span>
          </a>
          <div className="bo-auth-card">
            <p className="bo-kicker">IL TUO SPAZIO DI LAVORO</p>
            <h1>{register ? 'Crea il tuo account' : 'Bentornato.'}</h1>
            <p>
              {register
                ? 'Registrati per allenarti e consultare i tuoi esami.'
                : 'Accedi per gestire persone, quiz e percorsi.'}
            </p>
            {checking ? (
              <p>Verifica sessione…</p>
            ) : (
              <form onSubmit={signIn} key={register ? 'register' : 'login'}>
                {register && (
                  <>
                    <label>
                      Nome completo
                      <input name="name" required maxLength={100} autoComplete="name" />
                    </label>
                    <label>
                      Email
                      <input name="email" required type="email" autoComplete="email" />
                    </label>
                  </>
                )}
                <label>
                  Username
                  <input
                    name="username"
                    required
                    pattern="[a-z][a-z0-9_]{2,31}"
                    autoComplete="username"
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    required
                    type="password"
                    minLength={register ? 12 : 1}
                    maxLength={128}
                    autoComplete={register ? 'new-password' : 'current-password'}
                  />
                </label>
                {register && (
                  <small>
                    Almeno 12 caratteri. Username: lettere minuscole, numeri e underscore.
                  </small>
                )}
                <button className="bo-primary" type="submit">
                  {register ? 'Crea account' : 'Login'}
                </button>
              </form>
            )}
            {error && (
              <p className="bo-error" role="status">
                {error}
              </p>
            )}
            <button
              className="bo-link"
              onClick={() => {
                setError('');
                navigate(register ? '/login' : '/register');
              }}
            >
              {register ? 'Hai già un account? Login' : 'Nuovo qui? Registrati'}
            </button>
            <a href={appUrl("/")} className="bo-return">
              Torna al sito
            </a>
          </div>
          <p className="bo-auth-foot">Identità protetta da Authelia · Via Libera</p>
        </main>
      ) : (
        <div className="bo-layout">
          <aside className="bo-sidebar">
            <a className="bo-brand" href={appUrl("/")}>
              Via Libera <span>BACKOFFICE</span>
            </a>
            <div className="bo-profile">
              <span>{me.person.name.slice(0, 1)}</span>
              <div>
                <strong>{me.person.name}</strong>
                <small>{admin ? 'Amministratore' : 'Studente'}</small>
              </div>
            </div>
            <nav aria-label="Backoffice">
              {sections
                .filter(([key]) => admin || key !== 'persons')
                .map(([key, label, n]) => (
                  <button
                    className={section === key ? 'selected' : ''}
                    key={key}
                    onClick={() => navigate(`/backoffice/${key}`)}
                  >
                    <span>{n}</span>
                    {label}
                  </button>
                ))}
            </nav>
            <div className="bo-settings">
              <label>
                Colore principale
                <input
                  aria-label="Colore principale"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>
              <button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
                {mode === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
              </button>
              <button onClick={() => void logout()}>Esci</button>
              <a href={appUrl("/")}>Sito pubblico ↗</a>
            </div>
          </aside>
          <main className="bo-work">
            <header className="bo-toolbar">
              <span>WORKSPACE / {names[section]?.toUpperCase() ?? 'PAGINA NON TROVATA'}</span>
              <span>
                {connected === null
                  ? 'Verifica servizi…'
                  : connected
                    ? 'Servizi connessi'
                    : 'Servizi offline'}
              </span>
            </header>
            <div className="bo-heading">
              <div>
                <p className="bo-kicker">VIA LIBERA · REGISTRO DIGITALE</p>
                <h1>{names[section] ?? 'Pagina non trovata'}</h1>
                <p>
                  {section === 'tasks'
                    ? 'Attività persistenti in JetStream. Durata demo: 20 secondi.'
                    : 'Consulta e crea i dati del tuo percorso.'}
                </p>
              </div>
              {names[section] && (admin || ['tasks', 'solvedExams'].includes(section)) && (
                <button className="bo-primary" onClick={() => setCreating(true)}>
                  + {section === 'tasks' ? 'Avvia attività' : 'Crea record'}
                </button>
              )}
            </div>
            {error && (
              <p className="bo-error" role="alert">
                {error}
              </p>
            )}
            {names[section] && (
              <>
                <div className="bo-table-panel">
                  <div className="bo-table-title">
                    <strong>Registro {names[section].toLowerCase()}</strong>
                    <button className="bo-link" onClick={() => void load()}>
                      Aggiorna
                    </button>
                  </div>
                  {loading ? (
                    <div className="bo-empty">Caricamento…</div>
                  ) : visibleRows.length === 0 ? (
                    <div className="bo-empty">
                      <h2>Nessun record, per ora.</h2>
                      <p>Crea il primo record per iniziare.</p>
                    </div>
                  ) : (
                    <div className="bo-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Record</th>
                            <th>{section === 'tasks' ? 'Stato' : 'Dettaglio'}</th>
                            <th>Creato il</th>
                            <th>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{title(r)}</strong>
                                <small>{r.id.slice(0, 8)}</small>
                              </td>
                              <td>
                                <span className={`bo-badge status-${String(r.status ?? 'record')}`}>
                                  {badge(r)}
                                </span>
                              </td>
                              <td>{new Date(r.createdAt).toLocaleDateString('it-IT')}</td>
                              <td>
                                <button className="bo-link" onClick={() => setDetail(r)}>
                                  Visualizza
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="bo-pagination">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Precedente
                  </button>
                  <span>
                    Pagina {page} · {visibleRows.length} record
                  </span>
                  <button disabled={visibleRows.length < 25} onClick={() => setPage((p) => p + 1)}>
                    Successiva
                  </button>
                </div>
              </>
            )}
          </main>
        </div>
      )}
      {creating && me && (
        <div className="bo-modal">
          <section role="dialog" aria-modal="true" aria-label="Crea record">
            <button className="bo-close" aria-label="Chiudi" onClick={() => setCreating(false)}>
              ×
            </button>
            <h2>{section === 'tasks' ? 'Nuova attività' : 'Nuovo record'}</h2>
            <RecordForm
              kind={section}
              me={me}
              onSaved={() => {
                setCreating(false);
                void load();
              }}
            />
          </section>
        </div>
      )}
      {detail && (
        <div className="bo-modal">
          <section role="dialog" aria-modal="true" aria-label="Dettaglio record">
            <button className="bo-close" aria-label="Chiudi" onClick={() => setDetail(null)}>
              ×
            </button>
            <p className="bo-kicker">{names[section]}</p>
            <h2>{title(detail)}</h2>
            {section === 'quizzes' &&
              (detail.answers as Answer[]).map((a) => (
                <p className="bo-answer" key={a.id}>
                  {a.correct === true ? '✓ ' : ''}
                  {a.text}
                </p>
              ))}
            {section === 'solvedExams' && (
              <p className="bo-score">Punteggio: {String(detail.points)} / 10</p>
            )}
            <details>
              <summary>Tutti i dati e riferimenti JSON</summary>
              <pre>{JSON.stringify(detail, null, 2)}</pre>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
