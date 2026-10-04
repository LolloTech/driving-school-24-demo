import { useLayoutEffect, useMemo, useRef, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { gsap, ScrollTrigger, SplitText, prefersReducedMotion } from '../lib/gsap'
import { getLenis } from '../lib/lenis'
import { useViewport } from '../lib/useViewport'
import ScrollHud, { type HudApi } from './ScrollHud'
import type { FxState, WarpFx } from './warpFx'
import { Scene1, buildScene1 } from './scenes/Scene1'
import { Scene2, buildScene2 } from './scenes/Scene2'
import { Scene3, buildScene3 } from './scenes/Scene3'
import { Scene4, buildScene4 } from './scenes/Scene4'
import { Scene5, buildScene5 } from './scenes/Scene5'
import { makeFrame, zoom, SCENE_LEN, type SceneBuilder, type SceneProps } from './types'

interface Chapter {
  label: string
  Scene: ComponentType<SceneProps>
  build: SceneBuilder
  tint: string
  energy: number
  eyebrow: string
  title: string
  text: string
}

const CHAPTERS: Chapter[] = [
  {
    label: 'Il sogno',
    Scene: Scene1,
    build: buildScene1,
    tint: '#ffcf86',
    energy: 0.9,
    eyebrow: 'Capitolo 1 · 8 anni',
    title: 'Tutto comincia su un tappeto.',
    text: 'Strade disegnate, curve impossibili, nessun limite di velocità. Il primo sogno ha quattro ruote di plastica.',
  },
  {
    label: 'La finestra',
    Scene: Scene2,
    build: buildScene2,
    tint: '#a9b8ff',
    energy: 0.8,
    eyebrow: 'Capitolo 2 · Fuori dalla finestra',
    title: 'Poi la vedi passare davvero.',
    text: 'Lucida, vera, rumorosa. Quella macchina smette di essere un gioco e diventa una promessa.',
  },
  {
    label: 'I quiz',
    Scene: Scene3,
    build: buildScene3,
    tint: '#8fd6ff',
    energy: 0.65,
    eyebrow: 'Capitolo 3 · 18 anni',
    title: 'Quiz dopo quiz, senza paura.',
    text: 'Simulazioni d’esame, spiegazioni chiare e istruttori che ti seguono passo passo. Zero errori, tanta fiducia.',
  },
  {
    label: 'La patente',
    Scene: Scene4,
    build: buildScene4,
    tint: '#ffb8d6',
    energy: 1,
    eyebrow: 'Capitolo 4 · Il giorno giusto',
    title: 'Ce l’hai fatta.',
    text: 'Il tuo nome, la tua foto, la tua categoria B. Pesa pochi grammi, vale una vita di strade.',
  },
  {
    label: 'Via libera',
    Scene: Scene5,
    build: buildScene5,
    tint: '#ffc27a',
    energy: 1.25,
    eyebrow: 'Capitolo 5 · Via libera',
    title: 'Ora la strada è tua.',
    text: 'Dal primo giocattolo al primo viaggio: ti accompagniamo fino al traguardo, e oltre.',
  },
]

const TRANS = 2.4
const STEP = SCENE_LEN + TRANS
const TOTAL = CHAPTERS.length * SCENE_LEN + (CHAPTERS.length - 1) * TRANS
/** Scroll distance per timeline unit, as a fraction of the viewport height. */
const UNIT_VH = 0.16

const sceneStart = (i: number) => i * STEP
const sceneEnd = (i: number) => sceneStart(i) + SCENE_LEN
const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

function Copy({ chapter, index, last }: { chapter: Chapter; index: number; last: boolean }) {
  return (
    <div className={`story-copy story-copy--${index + 1}`} data-copy={index}>
      <span className="eyebrow story-copy__eyebrow">{chapter.eyebrow}</span>
      <h2 className="story-copy__title">{chapter.title}</h2>
      <p className="story-copy__text">{chapter.text}</p>
      {last && (
        <div className="story-copy__cta">
          <Link to="/contatti" className="btn">
            Inizia il tuo percorso
          </Link>
          <Link to="/faq" className="btn btn--ghost">
            Domande frequenti
          </Link>
        </div>
      )}
    </div>
  )
}

export default function ScrollStory() {
  const vp = useViewport()
  const frame = useMemo(() => makeFrame(vp.portrait), [vp.portrait])
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HudApi>(null)
  const jumpRef = useRef<(i: number) => void>(() => {})

  useLayoutEffect(() => {
    const stage = stageRef.current
    const section = sectionRef.current
    if (!stage || !section) return

    if (reduced) {
      const ctx = gsap.context(() => {
        stage.querySelectorAll<HTMLElement>('.scene').forEach((el, i) => {
          CHAPTERS[i].build(el).progress(0.8).pause()
        })
      }, stage)
      return () => ctx.revert()
    }

    let fx: WarpFx | null = null
    let disposed = false
    const rgb = (hex: string) => {
      const [r, g, b] = gsap.utils.splitColor(hex).map((v) => v / 255)
      return { r, g, b }
    }
    const fxState: FxState = { warp: 0, energy: CHAPTERS[0].energy, tint: rgb(CHAPTERS[0].tint) }
    // Three.js is loaded on demand so the page paints before the WebGL bundle arrives.
    import('./warpFx').then(({ createWarpFx }) => {
      if (!disposed && canvasRef.current) fx = createWarpFx(canvasRef.current, fxState)
    })

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage)
      const scenes = q('.scene') as HTMLElement[]
      const sq = scenes.map((s) => gsap.utils.selector(s))
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

      gsap.set(scenes.slice(1), { autoAlpha: 0 })

      // Intro title (time-based, plays on load) and its exit on scroll.
      const introSplit = SplitText.create(q('.story__intro h1'), { type: 'lines,words', mask: 'lines' })
      gsap.from(introSplit.words, { yPercent: 110, duration: 1.2, stagger: 0.06, ease: 'expo.out', delay: 0.3 })
      gsap.from(q('.story__intro p, .story__cue'), { opacity: 0, y: 20, duration: 1, stagger: 0.15, delay: 0.9, ease: 'power3.out' })
      tl.to(q('.story__intro, .story__cue'), { autoAlpha: 0, y: -80, duration: 1.4, ease: 'power2.in' }, 0.1)

      // Scene timelines + copy.
      CHAPTERS.forEach((ch, i) => {
        tl.add(ch.build(scenes[i]), sceneStart(i))

        const block = q(`[data-copy="${i}"]`)[0]
        const split = SplitText.create(block.querySelector('h2'), { type: 'lines,words', mask: 'lines' })
        const inAt = i === 0 ? 1.5 : sceneStart(i) - TRANS * 0.2
        tl.set(block, { autoAlpha: 1 }, inAt)
          .from(split.words, { yPercent: 115, duration: 1, stagger: 0.07, ease: 'power3.out' }, inAt)
          .from(block.querySelectorAll('.story-copy__eyebrow, .story-copy__text, .story-copy__cta'), { y: 26, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, inAt + 0.25)
        if (i < CHAPTERS.length - 1) {
          tl.to(block, { autoAlpha: 0, y: -50, duration: 0.8, ease: 'power2.in' }, sceneEnd(i) - 0.5)
        }
      })
      gsap.set(q('.story-copy'), { autoAlpha: 0 })

      // Scene-to-scene transitions.
      const T = (i: number) => sceneEnd(i)

      // 1 → 2: fly through the bedroom window.
      tl.fromTo(sq[0]('.s1-zoom'), zoom(1210, 310, 1), { ...zoom(1210, 310, 3.6), duration: TRANS, ease: 'power3.in' }, T(0))
        .to(scenes[0], { autoAlpha: 0, duration: TRANS * 0.35 }, T(0) + TRANS * 0.62)
        .to(scenes[1], { autoAlpha: 1, duration: TRANS * 0.45 }, T(0) + TRANS * 0.5)

      // 2 → 3: fast forward ten years.
      const age = { v: 8 }
      const ageEl = q('.ff-age__num')[0]
      tl.to(scenes[1], { filter: 'blur(14px) saturate(0.3) brightness(1.4)', scale: 1.12, duration: TRANS * 0.55, ease: 'power2.in' }, T(1))
        .to(scenes[1], { autoAlpha: 0, duration: TRANS * 0.25 }, T(1) + TRANS * 0.45)
        .fromTo(q('.story__ff'), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: TRANS * 0.25, ease: 'power2.out' }, T(1) + 0.05)
        .fromTo(q('.ff-min'), { rotation: 0 }, { rotation: 3600, duration: TRANS, ease: 'power2.inOut' }, T(1))
        .fromTo(q('.ff-hour'), { rotation: 0 }, { rotation: 300, duration: TRANS, ease: 'power2.inOut' }, T(1))
        .to(age, { v: 18, duration: TRANS * 0.8, ease: 'power2.inOut', onUpdate: () => { ageEl.textContent = String(Math.round(age.v)) } }, T(1) + 0.1)
        .to(q('.story__ff'), { autoAlpha: 0, scale: 1.15, duration: TRANS * 0.25, ease: 'power2.in' }, T(1) + TRANS * 0.75)
        .fromTo(scenes[2], { autoAlpha: 0, filter: 'blur(14px) brightness(1.4)', scale: 1.1 }, { autoAlpha: 1, filter: 'blur(0px) brightness(1)', scale: 1, duration: TRANS * 0.5, ease: 'power2.out' }, T(1) + TRANS * 0.5)
        .set(scenes[2], { filter: 'none' }, T(1) + TRANS)

      // 3 → 4: dive into the IDONEO stamp, white flash, the licence.
      tl.fromTo(sq[2]('.s3-zoom'), zoom(1440, 712, 1), { ...zoom(1440, 712, 3), duration: TRANS * 0.7, ease: 'power3.in' }, T(2))
        .to(q('.story__flash'), { opacity: 1, duration: TRANS * 0.22, ease: 'power2.in' }, T(2) + TRANS * 0.45)
        .set(scenes[2], { autoAlpha: 0 }, T(2) + TRANS * 0.67)
        .set(scenes[3], { autoAlpha: 1 }, T(2) + TRANS * 0.67)
        .to(q('.story__flash'), { opacity: 0, duration: TRANS * 0.33, ease: 'power2.out' }, T(2) + TRANS * 0.67)

      // 4 → 5: the card lifts away and the sunset irises open.
      tl.to(sq[3]('.s4-rig'), { yPercent: -40, scale: 0.7, rotationX: -35, opacity: 0, duration: TRANS * 0.7, ease: 'power2.in' }, T(3))
        .fromTo(scenes[4], { autoAlpha: 1, clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(100% at 50% 55%)', duration: TRANS * 0.85, ease: 'power2.inOut' }, T(3) + TRANS * 0.15)
        .set(scenes[3], { autoAlpha: 0 }, T(3) + TRANS)
        .set(scenes[4], { clipPath: 'none' }, T(3) + TRANS)

      // Shader layer: tint per chapter, warp pulse on every transition.
      CHAPTERS.slice(1).forEach((ch, k) => {
        const at = T(k)
        const peak = k === 1 ? 1 : 0.5
        tl.to(fxState, { warp: peak, duration: TRANS * 0.5, ease: 'power2.in' }, at)
          .to(fxState, { warp: 0, duration: TRANS * 0.5, ease: 'power2.out' }, at + TRANS * 0.5)
          .to(fxState.tint, { ...rgb(ch.tint), duration: TRANS }, at)
          .to(fxState, { energy: ch.energy, duration: TRANS }, at)
      })

      // Scroll driver with auto-advance across transition zones.
      let autoScrolling = false
      let autoTimer = 0
      const toScroll = (st: ScrollTrigger, t: number) => st.start + (t / TOTAL) * (st.end - st.start)
      const glideTo = (st: ScrollTrigger, t: number, duration: number) => {
        autoScrolling = true
        window.clearTimeout(autoTimer)
        const done = () => {
          autoScrolling = false
        }
        autoTimer = window.setTimeout(done, duration * 1000 + 400)
        const lenis = getLenis()
        if (lenis) lenis.scrollTo(toScroll(st, t), { duration, easing: easeInOutQuart, lock: true, force: true, onComplete: done })
        else window.scrollTo({ top: toScroll(st, t), behavior: 'smooth' })
      }

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${TOTAL * window.innerHeight * UNIT_VH}`,
        pin: stage,
        scrub: 0.8,
        animation: tl,
        invalidateOnRefresh: true,
        onToggle: (self) => fx?.setActive(self.isActive),
        onUpdate: (self) => {
          const t = self.progress * TOTAL
          hudRef.current?.update(self.progress, Math.min(CHAPTERS.length - 1, Math.floor((t + TRANS / 2) / STEP)))
          if (autoScrolling) return
          for (let i = 0; i < CHAPTERS.length - 1; i++) {
            const a = sceneEnd(i)
            const b = sceneStart(i + 1)
            if (t > a + 0.05 && t < b - 0.05) {
              glideTo(self, self.direction > 0 ? b + 0.1 : a - 0.1, 1.9)
              break
            }
          }
        },
      })

      jumpRef.current = (i) => glideTo(st, sceneStart(i) + (i === 0 ? 0 : 0.1), 2.4)

      // Pointer parallax on every depth layer + the shader motes.
      if (window.matchMedia('(pointer: fine)').matches) {
        const layers = Array.from(stage.querySelectorAll<SVGElement>('[data-depth]')).map((el) => ({
          d: parseFloat(el.dataset.depth ?? '0'),
          x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3' }),
        }))
        const onMove = (e: PointerEvent) => {
          const nx = (e.clientX / window.innerWidth) * 2 - 1
          const ny = (e.clientY / window.innerHeight) * 2 - 1
          layers.forEach((l) => {
            l.x(-nx * l.d * 28)
            l.y(-ny * l.d * 16)
          })
          fx?.setMouse(nx, -ny)
        }
        window.addEventListener('pointermove', onMove)
        return () => window.removeEventListener('pointermove', onMove)
      }
    }, stage)

    return () => {
      disposed = true
      ctx.revert()
      fx?.dispose()
    }
  }, [reduced])

  if (reduced) {
    return (
      <section ref={sectionRef} className="story story--static" aria-label="La nostra storia">
        <div ref={stageRef}>
          {CHAPTERS.map((ch, i) => (
            <div key={ch.label} className={`scene scene--${i + 1}`}>
              <ch.Scene frame={frame} />
              <Copy chapter={ch} index={i} last={i === CHAPTERS.length - 1} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="story" aria-label="La nostra storia">
      <div ref={stageRef} className="story__stage">
        {CHAPTERS.map((ch, i) => (
          <div key={ch.label} className={`scene scene--${i + 1}`}>
            <ch.Scene frame={frame} />
          </div>
        ))}

        <canvas ref={canvasRef} className="story__fx" aria-hidden="true" />

        <div className="story__ff" aria-hidden="true">
          <svg className="ff-clock" viewBox="-100 -100 200 200">
            <circle r="92" className="ff-clock__face" />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="0" y1="-80" x2="0" y2={i % 3 === 0 ? -64 : -72} transform={`rotate(${i * 30})`} />
            ))}
            <line className="ff-hour" x1="0" y1="8" x2="0" y2="-44" />
            <line className="ff-min" x1="0" y1="10" x2="0" y2="-70" />
            <circle r="6" fill="currentColor" />
          </svg>
          <div className="ff-age">
            <span className="ff-age__num">8</span>
            <span className="ff-age__unit">anni</span>
          </div>
          <div className="ff-label">▶▶ Avanti veloce</div>
        </div>
        <div className="story__flash" aria-hidden="true" />
        <div className="story__vignette" aria-hidden="true" />
        <div className="story__grain" aria-hidden="true" />

        <div className="story__intro">
          <span className="eyebrow">Scuola guida Via Libera</span>
          <h1>Dal primo sogno alla prima strada.</h1>
          <p>Scorri e guarda come un bambino con le macchinine diventa un neopatentato.</p>
        </div>
        <div className="story__cue" aria-hidden="true">
          <span>Scorri</span>
          <i />
        </div>

        {CHAPTERS.map((ch, i) => (
          <Copy key={ch.label} chapter={ch} index={i} last={i === CHAPTERS.length - 1} />
        ))}

        <ScrollHud labels={CHAPTERS.map((c) => c.label)} onJump={(i) => jumpRef.current(i)} apiRef={hudRef} />
      </div>
    </section>
  )
}
