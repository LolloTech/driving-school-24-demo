import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contatti', label: 'Contatti' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="site-header__inner container">
        <Link to="/" aria-label="Via Libera, home">
          <Logo />
        </Link>
        <nav id="main-nav" className="site-nav" aria-label="Principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end className="site-nav__link">
              {l.label}
            </NavLink>
          ))}
          <a href={`${import.meta.env.BASE_URL}login`} className="site-nav__link">login</a>
          <Link to="/contatti" className="btn site-nav__cta">
            Iscriviti
          </Link>
        </nav>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">{open ? 'Chiudi menu' : 'Apri menu'}</span>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
