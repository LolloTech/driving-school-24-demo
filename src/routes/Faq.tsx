import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../lib/useReveal'

interface Faq {
  q: string
  a: string
}

const FAQS: Faq[] = [
  {
    q: 'Quanti anni devo avere per iscrivermi alla patente B?',
    a: 'Puoi iscriverti e iniziare a studiare la teoria anche a 17 anni e mezzo, ma l’esame pratico si sostiene solo dopo aver compiuto 18 anni.',
  },
  {
    q: 'Che cos’è il foglio rosa e quanto dura?',
    a: 'È l’autorizzazione a esercitarti alla guida che ottieni dopo aver superato l’esame di teoria. Vale 12 mesi e consente fino a due tentativi dell’esame pratico. Durante le esercitazioni serve sempre un accompagnatore abilitato.',
  },
  {
    q: 'Com’è fatto l’esame di teoria?',
    a: 'È un quiz al computer di 30 domande vero/falso da completare in 20 minuti. Si può sbagliare al massimo 3 risposte. Con noi fai simulazioni illimitate nelle stesse condizioni dell’esame.',
  },
  {
    q: 'Quante guide pratiche devo fare?',
    a: 'Per legge sono obbligatorie almeno 6 ore di guida con istruttore (autostrada, extraurbana e notturna). Poi dipende da te: in media i nostri allievi arrivano pronti all’esame con 10–14 guide.',
  },
  {
    q: 'Quanto costa prendere la patente con voi?',
    a: 'Il pacchetto base comprende iscrizione, materiale didattico, simulazioni illimitate e le 6 guide obbligatorie. Le guide extra si acquistano singolarmente o a pacchetti. Contattaci per un preventivo personalizzato: le tariffe di questo sito sono dimostrative.',
  },
  {
    q: 'Posso studiare la teoria online?',
    a: 'Sì. Puoi seguire le lezioni in aula, in diretta online oppure on-demand, e passare liberamente da una modalità all’altra.',
  },
  {
    q: 'Cosa succede se non supero l’esame?',
    a: 'Niente panico: per la teoria puoi ripetere l’esame dopo un mese, per la pratica entro la validità del foglio rosa. Prepariamo con te un piano di ripasso mirato sugli errori fatti.',
  },
  {
    q: 'Quali documenti servono per iscriversi?',
    a: 'Documento d’identità, codice fiscale, fototessere e il certificato medico (che puoi fare direttamente nella nostra sede). Al resto pensiamo noi.',
  },
]

function FaqItem({ item, open, onToggle }: { item: Faq; open: boolean; onToggle(): void }) {
  const id = useId()
  return (
    <div className={`faq${open ? ' is-open' : ''}`} data-reveal>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span>{item.q}</span>
          <i aria-hidden="true" />
        </button>
      </h3>
      <div id={id} className="faq__panel" role="region" aria-hidden={!open}>
        <div>
          <p>{item.a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)
  const ref = useRef<HTMLDivElement>(null)
  useReveal(ref)

  return (
    <div className="page" ref={ref}>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Domande frequenti</span>
          <h1>Tutto quello che vuoi sapere.</h1>
          <p>Dall’iscrizione all’esame pratico, le risposte alle domande che ci fate più spesso.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container faq-list">
          {FAQS.map((item, i) => (
            <FaqItem key={item.q} item={item} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
          <div className="faq-more" data-reveal>
            <p>Non trovi la tua risposta?</p>
            <Link to="/contatti" className="btn">
              Scrivici
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
