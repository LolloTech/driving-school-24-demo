import { useLayoutEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './routes/Home'
import Faq from './routes/Faq'
import Contatti from './routes/Contatti'
import NotFound from './routes/NotFound'
import { gsap, ScrollTrigger, prefersReducedMotion } from './lib/gsap'
import { initLenis, scrollToTop } from './lib/lenis'

export default function App() {
  const location = useLocation()
  const curtainRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    initLenis()
  }, [])

  // Route change: reset scroll, sweep the curtain off the new page.
  useLayoutEffect(() => {
    scrollToTop()
    const curtain = curtainRef.current
    if (!curtain || prefersReducedMotion()) return
    const tween = gsap.fromTo(
      curtain,
      { clipPath: 'inset(0% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut', delay: 0.05 },
    )
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 120)
    return () => {
      tween.kill()
      window.clearTimeout(refresh)
    }
  }, [location.pathname])

  return (
    <>
      <a className="skip-link" href="#main">
        Vai al contenuto
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contatti" element={<Contatti />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <div ref={curtainRef} className="route-curtain" aria-hidden="true">
        <span className="route-curtain__logo">Via Libera</span>
      </div>
    </>
  )
}
