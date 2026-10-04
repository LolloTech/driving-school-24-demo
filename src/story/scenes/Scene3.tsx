import { gsap } from '../../lib/gsap'
import { Head, HOODIE, HOODIE_SHADE, JEANS, SKIN, Sparkle } from '../parts'
import { padTimeline, pivot, zoom, type SceneBuilder, type SceneProps } from '../types'

const QUESTIONS: { n: number; text: string; answer: 'VERO' | 'FALSO' }[] = [
  { n: 7, text: 'Allo STOP bisogna sempre fermarsi.', answer: 'VERO' },
  { n: 18, text: 'Con la nebbia si usano gli abbaglianti.', answer: 'FALSO' },
  { n: 26, text: 'Con il foglio rosa si guida da soli.', answer: 'FALSO' },
]

const BULBS = Array.from({ length: 15 }, (_, i) => {
  const t = i / 14
  const x = 40 + t * 1520
  const y = 54 + Math.sin(t * Math.PI) * 70
  return [x, y] as const
})

/** Scene 3 — fast-forward: the kid is now 18, acing the theory quizzes. */
export function Scene3({ frame }: SceneProps) {
  const { viewBox, par, portrait } = frame(860)
  return (
    <svg className="scene-svg" viewBox={viewBox} preserveAspectRatio={par} aria-hidden="true">
      <defs>
        <linearGradient id="s3-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c142b" />
          <stop offset="1" stopColor="#1c2b52" />
        </linearGradient>
        <linearGradient id="s3-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d2b22" />
          <stop offset="1" stopColor="#1d1411" />
        </linearGradient>
        <linearGradient id="s3-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060b1f" />
          <stop offset="1" stopColor="#1a2550" />
        </linearGradient>
        <radialGradient id="s3-screen">
          <stop offset="0" stopColor="#8fb6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8fb6ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s3-warm">
          <stop offset="0" stopColor="#ffcf86" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffcf86" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s3-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2a5e" stopOpacity="0.92" />
          <stop offset="1" stopColor="#0e1636" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      <g className="s3-zoom">
      <g className="s3-cam">
        <g data-depth="0.12">
          <rect x="-500" y="-900" width="2600" height="1600" fill="url(#s3-wall)" />
          {/* Window with the city at night */}
          <rect x="84" y="124" width="392" height="392" rx="8" fill="#d9cbb3" />
          <rect x="98" y="138" width="364" height="364" fill="url(#s3-sky)" />
          {[[110, 120], [160, 180], [200, 150], [250, 210], [300, 130], [340, 190], [390, 160], [420, 220]].map(([x, h]) => (
            <rect key={x} x={x} y={502 - h} width="44" height={h} fill="#202b5a" />
          ))}
          {[[120, 400], [170, 350], [216, 380], [262, 320], [312, 410], [352, 340], [400, 380], [430, 300], [180, 440], [320, 450]].map(([x, y], i) => (
            <rect key={i} className="s3-lit" x={x} y={y} width="9" height="12" fill="#ffd27a" />
          ))}
          <rect x="273" y="138" width="14" height="364" fill="#d9cbb3" />
          <rect x="64" y="510" width="432" height="20" rx="6" fill="#e7dac2" />

          {/* Road-sign posters */}
          <g transform="translate(610 150)">
            <rect width="150" height="190" rx="8" fill="#f2efe6" />
            <path d="M75,30 L130,124 L20,124 Z" fill="#fff" stroke="#e33" strokeWidth="11" strokeLinejoin="round" />
            <text x="75" y="112" textAnchor="middle" fontSize="44" fontWeight="800" fill="#222">!</text>
            <text x="75" y="166" textAnchor="middle" fontSize="15" fontWeight="600" fill="#555" letterSpacing="2">PERICOLO</text>
          </g>
          <g transform="translate(790 190)">
            <circle cx="56" cy="56" r="56" fill="#fff" stroke="#e33" strokeWidth="12" />
            <text x="56" y="74" textAnchor="middle" fontSize="48" fontWeight="800" fill="#222">50</text>
          </g>

          {/* Fairy lights */}
          <path d={`M${BULBS.map(([x, y]) => `${x},${y - 6}`).join(' L')}`} fill="none" stroke="#3a3f5c" strokeWidth="2" />
          {BULBS.map(([x, y], i) => (
            <g key={i}>
              <circle className="s3-bulb-glow" cx={x} cy={y + 4} r="16" fill="url(#s3-warm)" />
              <circle className="s3-bulb" cx={x} cy={y + 4} r="5" fill={['#ffd27a', '#ff8a8a', '#8fd6ff'][i % 3]} />
            </g>
          ))}
        </g>

        <g data-depth="0.35">
          <circle className="s3-screen-glow" cx="700" cy="440" r="260" fill="url(#s3-screen)" />
          {/* Chair */}
          <rect x="424" y="380" width="40" height="270" rx="14" fill="#2b3355" />
          <rect x="424" y="604" width="200" height="36" rx="12" fill="#323b62" />
          <rect x="510" y="640" width="14" height="200" fill="#1d2238" />

          {/* The adult, seated */}
          <path d="M556,602 L690,612" fill="none" stroke={JEANS} strokeWidth="40" strokeLinecap="round" />
          <path className="s3-type" d="M590,452 L652,548 L772,592" fill="none" stroke={HOODIE_SHADE} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          <g transform="translate(542 606) rotate(12)">
            <rect x="-50" y="-215" width="100" height="220" rx="44" fill={HOODIE} />
            <path d="M-26,-206 Q0,-180 26,-206" fill="none" stroke={HOODIE_SHADE} strokeWidth="7" strokeLinecap="round" />
          </g>
          <g className="s3-head" transform="translate(604 352) scale(1.15)">
            <Head />
            <path className="s3-grin" d="M20,17 Q30,32 39,16 Z" fill="#7a2a24" opacity="0" />
          </g>
          <g className="s3-arm">
            <path className="s3-type" d="M574,450 L660,560 L790,600" fill="none" stroke={HOODIE} strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
            <circle className="s3-type" cx="796" cy="600" r="14" fill={SKIN} />
          </g>

          {/* Desk */}
          <rect x="620" y="616" width="1000" height="24" rx="6" fill="#6b4a35" />
          <rect x="644" y="640" width="952" height="400" fill="url(#s3-desk)" />
          {/* Laptop, seen from behind */}
          <path d="M740,616 L920,616 L908,604 L752,604 Z" fill="#9aa5bd" />
          <path d="M764,606 L902,606 L924,440 L800,430 Z" fill="#c9d2e3" />
          <circle className="s3-logo" cx="856" cy="520" r="12" fill="#fff" opacity="0.9" />
          {/* Books + mug */}
          <g transform="translate(990 616)">
            <rect x="0" y="-26" width="150" height="26" rx="3" fill="#ff6b6b" />
            <rect x="10" y="-50" width="132" height="24" rx="3" fill="#6b8cff" />
            <rect x="4" y="-72" width="140" height="22" rx="3" fill="#ffb547" />
            <text x="75" y="-56" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a1206" letterSpacing="1">MANUALE B</text>
          </g>
          <g transform="translate(1200 616)">
            <rect x="0" y="-56" width="46" height="56" rx="8" fill="#f2efe6" />
            <path d="M46,-44 Q66,-40 46,-18" fill="none" stroke="#f2efe6" strokeWidth="8" />
            {[10, 22, 34].map((x) => (
              <path key={x} className="s3-steam" d={`M${x},-64 q8,-14 0,-28 q-8,-14 0,-28`} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
            ))}
          </g>
        </g>

        {/* Holographic quiz — pulled left on portrait screens so it stays in frame */}
        <g data-depth="0.6">
          <g transform={portrait ? 'translate(-250 20) scale(0.94)' : undefined}>
          {QUESTIONS.map((qn, i) => (
            <g key={qn.n} className={`s3-card s3-card-${i}`} transform={`translate(960 ${162 + i * 126})`}>
              <rect width="510" height="112" rx="18" fill="url(#s3-holo)" stroke="#86a8ff" strokeOpacity="0.5" strokeWidth="1.5" />
              <text x="24" y="30" fontSize="12" fontWeight="700" letterSpacing="2.4" fill="#86a8ff">DOMANDA {qn.n}/30</text>
              <text x="24" y="58" fontSize="20" fontWeight="600" fill="#eef2ff">{qn.text}</text>
              {(['VERO', 'FALSO'] as const).map((opt, j) => (
                <g key={opt} transform={`translate(${24 + j * 102} 72)`}>
                  <rect
                    className={opt === qn.answer ? `s3-pick s3-pick-${i}` : undefined}
                    width="90"
                    height="28"
                    rx="14"
                    fill={opt === qn.answer ? '#3ddc97' : 'transparent'}
                    fillOpacity={0}
                    stroke="#86a8ff"
                    strokeOpacity="0.5"
                  />
                  <text x="45" y="19" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="1.5" fill="#eef2ff">
                    {opt}
                  </text>
                </g>
              ))}
              <circle cx="460" cy="56" r="24" fill="none" stroke="#3ddc97" strokeOpacity="0.35" strokeWidth="3" />
              <path className={`s3-tick s3-tick-${i}`} d="M448,57 L457,66 L474,46" fill="none" stroke="#3ddc97" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
          <g className="s3-card s3-progress" transform="translate(960 540)">
            <rect width="510" height="74" rx="18" fill="url(#s3-holo)" stroke="#86a8ff" strokeOpacity="0.5" strokeWidth="1.5" />
            <text x="24" y="30" fontSize="15" fontWeight="600" fill="#eef2ff">Simulazione d'esame</text>
            <text className="s3-count" x="486" y="30" textAnchor="end" fontSize="15" fontWeight="700" fill="#3ddc97">0/30</text>
            <rect x="24" y="46" width="462" height="10" rx="5" fill="#ffffff" fillOpacity="0.1" />
            <rect className="s3-bar" x="24" y="46" width="462" height="10" rx="5" fill="#3ddc97" />
          </g>
          <g className="s3-stamp" transform="translate(1440 712) rotate(-12) scale(0.8)">
            <circle r="72" fill="#0b2a22" fillOpacity="0.85" stroke="#3ddc97" strokeWidth="6" />
            <circle r="60" fill="none" stroke="#3ddc97" strokeWidth="2" strokeDasharray="4 6" />
            <text y="6" textAnchor="middle" fontSize="26" fontWeight="800" letterSpacing="1" fill="#3ddc97">IDONEO</text>
            <text y="30" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="2" fill="#3ddc97">0 ERRORI</text>
          </g>
          {[[640, 250], [700, 210], [560, 230]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <Sparkle className="s3-spark" size={12 + i * 3} color="#ffe08a" />
            </g>
          ))}
          </g>
        </g>
      </g>
      </g>
    </svg>
  )
}

export const buildScene3: SceneBuilder = (root) => {
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  const counter = { v: 0 }
  const countEl = q('.s3-count')[0]

  gsap.set(q('.s3-bar'), { scaleX: 0, transformOrigin: '0% 50%' })
  gsap.set(q('.s3-stamp'), { opacity: 0, transformOrigin: '50% 50%' })
  gsap.set(q('.s3-arm'), { transformOrigin: pivot(q('.s3-arm')[0], 574, 450) })
  gsap.set(q('.s3-spark'), { scale: 0, transformOrigin: '50% 50%' })

  tl.fromTo(q('.s3-cam'), zoom(800, 450, 1.1), { ...zoom(800, 450, 1), duration: 3, ease: 'power2.out' }, 0)
    .to(q('.s3-cam'), { ...zoom(800, 450, 1.04), duration: 7, ease: 'sine.inOut' }, 3)
    .to(q('.s3-type'), { y: -6, duration: 0.22, repeat: 33, yoyo: true, ease: 'sine.inOut', stagger: 0.11 }, 0)

  QUESTIONS.forEach((_, i) => {
    const at = 0.5 + i * 2
    tl.from(q(`.s3-card-${i}`), { x: '+=140', opacity: 0, duration: 0.9, ease: 'power3.out' }, at)
      .to(q(`.s3-pick-${i}`), { fillOpacity: 1, duration: 0.3 }, at + 1)
      .fromTo(q(`.s3-tick-${i}`), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.out' }, at + 1.2)
  })

  tl.from(q('.s3-progress'), { y: '+=60', opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.2)
    .to(q('.s3-bar'), { scaleX: 1, duration: 6.6, ease: 'power1.inOut' }, 0.8)
    .to(counter, {
      v: 30,
      duration: 6.6,
      ease: 'power1.inOut',
      onUpdate: () => {
        countEl.textContent = `${Math.round(counter.v)}/30`
      },
    }, 0.8)
    .fromTo(q('.s3-stamp'), { opacity: 0, scale: 2.6, rotation: -40 }, { opacity: 1, scale: 1, rotation: -12, duration: 0.8, ease: 'back.out(2.4)' }, 7.5)
    // Celebration
    .to(q('.s3-arm'), { rotation: -118, duration: 0.9, ease: 'back.out(1.8)' }, 8.2)
    .to(q('.s3-head'), { rotation: -8, transformOrigin: '50% 80%', duration: 0.8, ease: 'power2.out' }, 8.2)
    .to(q('.s3-head .mouth'), { opacity: 0, duration: 0.2 }, 8.3)
    .to(q('.s3-grin'), { opacity: 1, duration: 0.2 }, 8.3)
    .to(q('.s3-spark'), { scale: 1, rotation: 90, duration: 0.6, stagger: 0.12, ease: 'back.out(3)' }, 8.4)

  gsap.to(q('.s3-bulb, .s3-bulb-glow'), { opacity: 0.35, duration: 0.9, repeat: -1, yoyo: true, stagger: { each: 0.15, from: 'random' }, ease: 'sine.inOut' })
  gsap.fromTo(q('.s3-steam'), { y: 0, opacity: 0 }, { y: -26, opacity: 1, duration: 2.2, repeat: -1, stagger: 0.7, ease: 'sine.out' })
  gsap.to(q('.s3-screen-glow'), { opacity: 0.7, duration: 0.15, repeat: -1, yoyo: true, repeatDelay: 1.7, ease: 'steps(2)' })

  return padTimeline(tl)
}
