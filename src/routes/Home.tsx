import { useRef } from 'react'
import { Link } from 'react-router-dom'
import ScrollStory from '../story/ScrollStory'
import { useReveal } from '../lib/useReveal'
import '../styles/story.css'

const STATS = [
  { value: '94%', label: 'promossi al primo esame di teoria' },
  { value: '12k+', label: 'simulazioni di quiz svolte ogni mese' },
  { value: '6 sett.', label: 'tempo medio dalla teoria alla pratica' },
  { value: '4,9★', label: 'valutazione media degli allievi' },
]

const REASONS = [
  {
    icon: 'M4 6h16M4 12h10M4 18h7',
    title: 'Quiz che si adattano a te',
    text: 'Ripassi mirati sulle domande che sbagli di più, con spiegazioni brevi e illustrate. Niente memorizzazione a vuoto.',
  },
  {
    icon: 'M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7z',
    title: 'Istruttori pazienti',
    text: 'Guide in doppio comando con istruttori certificati, anche il sabato. Partiamo dal parcheggio, arriviamo in tangenziale.',
  },
  {
    icon: 'M5 13l4 4L19 7',
    title: 'Pratiche senza stress',
    text: 'Visita medica, foglio rosa, prenotazione esami: ci occupiamo noi della burocrazia, tu pensi solo a guidare.',
  },
]

const STEPS = [
  { n: '01', title: 'Iscrizione', text: 'Scegli la sede e il corso. Ti aiutiamo con documenti e visita medica.' },
  { n: '02', title: 'Teoria e quiz', text: 'Lezioni in aula o online e simulazioni illimitate fino all’esame.' },
  { n: '03', title: 'Foglio rosa e guide', text: 'Superata la teoria, inizi le guide con il tuo istruttore.' },
  { n: '04', title: 'Esame pratico', text: 'Ti accompagniamo il giorno dell’esame. E poi… via libera!' },
]

export default function Home() {
  const restRef = useRef<HTMLDivElement>(null)
  useReveal(restRef)

  return (
    <div className="page home">
      <ScrollStory />

      <div ref={restRef} className="home__rest">
        <section className="section stats" aria-label="I nostri numeri">
          <div className="container stats__grid">
            {STATS.map((s) => (
              <div key={s.label} className="stat" data-reveal>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head" data-reveal>
              <span className="eyebrow">Perché Via Libera</span>
              <h2>Una scuola guida che ti guarda negli occhi.</h2>
              <p>Metodo moderno, persone vere. Ti seguiamo dal primo quiz all’ultima curva dell’esame pratico.</p>
            </div>
            <div className="cards">
              {REASONS.map((r) => (
                <article key={r.title} className="card" data-reveal>
                  <span className="card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="26" height="26">
                      <path d={r.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section steps">
          <div className="container">
            <div className="section-head" data-reveal>
              <span className="eyebrow">Come funziona</span>
              <h2>Quattro tappe, una sola direzione.</h2>
            </div>
            <ol className="steps__list">
              {STEPS.map((s) => (
                <li key={s.n} className="step" data-reveal>
                  <span className="step__n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta-band" data-reveal>
              <div>
                <h2>Il tuo capitolo 5 ti aspetta.</h2>
                <p>Prima consulenza gratuita, senza impegno. Ti richiamiamo entro 24 ore.</p>
              </div>
              <div className="cta-band__actions">
                <Link to="/contatti" className="btn">
                  Prenota una consulenza
                </Link>
                <Link to="/faq" className="btn btn--ghost">
                  Leggi le FAQ
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
