import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="page page-hero">
      <div className="container">
        <span className="eyebrow">Errore 404</span>
        <h1>Strada senza uscita.</h1>
        <p>La pagina che cerchi non esiste. Facciamo inversione?</p>
        <p style={{ marginTop: 32 }}>
          <Link to="/" className="btn">
            Torna alla home
          </Link>
        </p>
      </div>
    </section>
  )
}
