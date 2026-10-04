import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <Logo />
          <p className="site-footer__tag">Dal primo sogno alla prima strada. Scuola guida demo.</p>
        </div>
        <nav aria-label="Footer">
          <h3>Esplora</h3>
          <Link to="/">Home</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contatti">Contatti</Link>
        </nav>
        <div>
          <h3>Sede</h3>
          <p>Via dell'Esempio 12, Milano</p>
          <p>Lun–Ven 9:00–19:00</p>
          <p>
            <a href="mailto:ciao@vialibera.example">ciao@vialibera.example</a>
          </p>
        </div>
      </div>
      <div className="container site-footer__base">
        <span>© {new Date().getFullYear()} Via Libera — progetto dimostrativo</span>
        <span>Fatto con passione (e cinture allacciate)</span>
      </div>
    </footer>
  )
}
