import { useRef, useState, type FormEvent } from 'react'
import { api, type ContactRequest, type CourseType } from '../api/client'
import { useReveal } from '../lib/useReveal'

type Errors = Partial<Record<keyof ContactRequest, string>>
type Status = 'idle' | 'sending' | 'sent' | 'error'

const COURSES: { value: CourseType; label: string }[] = [
  { value: 'B', label: 'Patente B (auto)' },
  { value: 'AM', label: 'Patentino AM (ciclomotori)' },
  { value: 'A', label: 'Patente A (moto)' },
  { value: 'recupero-punti', label: 'Recupero punti' },
  { value: 'altro', label: 'Altro' },
]

const EMPTY: ContactRequest = { nome: '', email: '', telefono: '', corso: 'B', messaggio: '', privacy: false }

export function validate(v: ContactRequest): Errors {
  const e: Errors = {}
  if (v.nome.trim().length < 2) e.nome = 'Inserisci nome e cognome.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Inserisci un indirizzo email valido.'
  if (v.telefono.trim() && !/^\+?[\d\s]{8,15}$/.test(v.telefono.trim())) e.telefono = 'Numero non valido (solo cifre, 8–15).'
  if (v.messaggio.trim().length < 10) e.messaggio = 'Scrivi almeno 10 caratteri.'
  if (!v.privacy) e.privacy = 'Serve il consenso per poterti ricontattare.'
  return e
}

const CHANNELS = [
  { label: 'Telefono', value: '+39 02 0000 0000', href: 'tel:+390200000000' },
  { label: 'Email', value: 'ciao@vialibera.example', href: 'mailto:ciao@vialibera.example' },
  { label: 'Sede', value: "Via dell'Esempio 12, Milano" },
  { label: 'Orari', value: 'Lun–Ven 9:00–19:00 · Sab 9:00–13:00' },
]

export default function Contatti() {
  const [values, setValues] = useState<ContactRequest>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const ref = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useReveal(ref)

  const set = <K extends keyof ContactRequest>(key: K, value: ContactRequest[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }
    setStatus('sending')
    try {
      await api.sendContact(values)
      setStatus('sent')
      setValues(EMPTY)
    } catch {
      setStatus('error')
    }
  }

  const field = (key: 'nome' | 'email' | 'telefono', label: string, type: string, autoComplete: string, optional = false) => (
    <div className={`field${errors[key] ? ' has-error' : ''}`}>
      <label htmlFor={key}>
        {label} {optional && <span className="field__opt">(facoltativo)</span>}
      </label>
      <input
        id={key}
        name={key}
        type={type}
        autoComplete={autoComplete}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-err` : undefined}
      />
      {errors[key] && (
        <span id={`${key}-err`} className="field__err">
          {errors[key]}
        </span>
      )}
    </div>
  )

  return (
    <div className="page" ref={ref}>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Contatti</span>
          <h1>Parliamo del tuo primo viaggio.</h1>
          <p>Scrivici per informazioni, preventivi o per prenotare una consulenza gratuita. Rispondiamo entro 24 ore.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container contact">
          <aside className="contact__info" data-reveal>
            {CHANNELS.map((c) => (
              <div key={c.label} className="contact__row">
                <span>{c.label}</span>
                {c.href ? <a href={c.href}>{c.value}</a> : <strong>{c.value}</strong>}
              </div>
            ))}
            <div className="contact__map" aria-hidden="true">
              <svg viewBox="0 0 400 220">
                <rect width="400" height="220" fill="#0f1528" />
                <path d="M-10,150 C80,120 140,170 220,130 S360,80 410,100" stroke="#2a3456" strokeWidth="22" fill="none" />
                <path d="M120,-10 L160,230" stroke="#2a3456" strokeWidth="16" />
                <path d="M300,-10 C280,80 320,140 290,230" stroke="#2a3456" strokeWidth="12" fill="none" />
                <path d="M-10,150 C80,120 140,170 220,130 S360,80 410,100" stroke="#ffb547" strokeWidth="2" strokeDasharray="8 8" fill="none" />
                <circle cx="220" cy="130" r="26" fill="#ffb547" opacity="0.18" className="pulse" />
                <path d="M220,130 c-14,-16 -14,-34 0,-40 c14,6 14,24 0,40z" fill="#ffb547" />
                <circle cx="220" cy="102" r="5" fill="#1a1206" />
              </svg>
            </div>
          </aside>

          <form ref={formRef} className="contact__form" noValidate onSubmit={onSubmit} data-reveal>
            {status === 'sent' ? (
              <div className="contact__sent" role="status">
                <svg viewBox="0 0 52 52" width="64" height="64" aria-hidden="true">
                  <circle cx="26" cy="26" r="24" fill="none" stroke="#3ddc97" strokeWidth="3" />
                  <path d="M15 27l7 7 15-16" fill="none" stroke="#3ddc97" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2>Messaggio ricevuto!</h2>
                <p>Grazie, ti ricontatteremo entro 24 ore. Allacciati le cinture.</p>
                <button type="button" className="btn btn--ghost" onClick={() => setStatus('idle')}>
                  Invia un altro messaggio
                </button>
              </div>
            ) : (
              <>
                <div className="contact__grid">
                  {field('nome', 'Nome e cognome', 'text', 'name')}
                  {field('email', 'Email', 'email', 'email')}
                  {field('telefono', 'Telefono', 'tel', 'tel', true)}
                  <div className="field">
                    <label htmlFor="corso">Corso di interesse</label>
                    <select id="corso" name="corso" value={values.corso} onChange={(e) => set('corso', e.target.value as CourseType)}>
                      {COURSES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={`field${errors.messaggio ? ' has-error' : ''}`}>
                  <label htmlFor="messaggio">Messaggio</label>
                  <textarea
                    id="messaggio"
                    name="messaggio"
                    rows={5}
                    value={values.messaggio}
                    onChange={(e) => set('messaggio', e.target.value)}
                    aria-invalid={!!errors.messaggio}
                    aria-describedby={errors.messaggio ? 'messaggio-err' : undefined}
                  />
                  {errors.messaggio && (
                    <span id="messaggio-err" className="field__err">
                      {errors.messaggio}
                    </span>
                  )}
                </div>
                <div className={`field field--check${errors.privacy ? ' has-error' : ''}`}>
                  <label>
                    <input
                      type="checkbox"
                      name="privacy"
                      checked={values.privacy}
                      onChange={(e) => set('privacy', e.target.checked)}
                      aria-invalid={!!errors.privacy}
                      aria-describedby={errors.privacy ? 'privacy-err' : undefined}
                    />
                    <span>Acconsento al trattamento dei dati per essere ricontattato.</span>
                  </label>
                  {errors.privacy && (
                    <span id="privacy-err" className="field__err">
                      {errors.privacy}
                    </span>
                  )}
                </div>
                {status === 'error' && (
                  <p className="contact__error" role="alert">
                    Qualcosa è andato storto. Riprova tra poco.
                  </p>
                )}
                <button type="submit" className="btn contact__submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Invio in corso…' : 'Invia richiesta'}
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    </div>
  )
}
