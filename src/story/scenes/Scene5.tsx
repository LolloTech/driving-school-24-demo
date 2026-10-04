import { gsap } from '../../lib/gsap'
import { Car, Head, HOODIE, HOODIE_SHADE, JEANS, SKIN } from '../parts'
import { padTimeline, pivot, zoom, type SceneBuilder, type SceneProps } from '../types'

const CONFETTI_COLORS = ['#ffb547', '#ff4d4f', '#3ddc97', '#6b8cff', '#fff3c4', '#ff8ad8']
const CONFETTI = Array.from({ length: 70 }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  w: 6 + (i % 4) * 3,
  h: 10 + (i % 3) * 4,
}))

const CYPRESS = [[150, 520, 1], [210, 540, 0.8], [1380, 530, 1.1], [1440, 548, 0.85], [1520, 520, 0.95]] as const

/** Scene 5 — sunset, the new driver and their car. Keys up. */
export function Scene5({ frame }: SceneProps) {
  const { viewBox, par } = frame(860)
  return (
    <svg className="scene-svg" viewBox={viewBox} preserveAspectRatio={par} aria-hidden="true">
      <defs>
        <linearGradient id="s5-sky" x1="0" y1="-600" x2="0" y2="640" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d1d52" />
          <stop offset="0.45" stopColor="#5a3478" />
          <stop offset="0.72" stopColor="#e2577a" />
          <stop offset="0.88" stopColor="#ff9f5a" />
          <stop offset="1" stopColor="#ffd98f" />
        </linearGradient>
        <radialGradient id="s5-sun">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="0.35" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff9f5a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s5-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2347" />
          <stop offset="1" stopColor="#140d22" />
        </linearGradient>
      </defs>

      <g className="s5-cam">
        <g data-depth="0.08">
          <rect className="s5-skyrect" x="-500" y="-900" width="2600" height="1560" fill="url(#s5-sky)" />
          <circle className="s5-sun-halo" cx="800" cy="560" r="420" fill="url(#s5-sun)" opacity="0.55" />
          <circle className="s5-sun" cx="800" cy="560" r="120" fill="url(#s5-sun)" />
          {[[240, 200, 1], [1180, 150, 1.3], [620, 120, 0.8]].map(([x, y, s], i) => (
            <g key={i} className="s5-cloud" transform={`translate(${x} ${y}) scale(${s})`}>
              <ellipse cx="0" cy="0" rx="120" ry="22" fill="#ffb3a0" opacity="0.5" />
              <ellipse cx="50" cy="-12" rx="70" ry="18" fill="#ffc7b0" opacity="0.5" />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <path key={i} className="s5-bird" d="M0,0 q8,-8 16,0 q8,-8 16,0" fill="none" stroke="#2a1838" strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>

        <g data-depth="0.18">
          <path d="M-500,600 C-200,520 100,560 380,540 C640,520 900,580 1180,540 C1420,510 1700,560 2100,540 L2100,700 L-500,700 Z" fill="#8a3f6e" />
          <path d="M-500,620 C-100,580 300,640 700,600 C1000,570 1300,630 2100,600 L2100,700 L-500,700 Z" fill="#5c2a5c" />
          {CYPRESS.map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <ellipse cx="0" cy="40" rx="22" ry="90" fill="#24173a" />
              <rect x="-3" y="120" width="6" height="20" fill="#24173a" />
            </g>
          ))}
        </g>

        <g data-depth="0.4">
          <rect x="-500" y="640" width="2600" height="1000" fill="url(#s5-ground)" />
          <rect x="-500" y="690" width="2600" height="90" fill="#2b2140" />
          {[-60, 160, 380, 600, 820, 1040, 1260, 1480].map((x) => (
            <rect key={x} className="s5-dash" x={x} y="732" width="110" height="7" rx="3.5" fill="#f3e3c4" opacity="0.55" />
          ))}
          <rect x="-500" y="686" width="2600" height="6" fill="#ffb36b" opacity="0.25" />

          <g className="s5-car" transform="translate(300 492) scale(1.6)">
            <Car uid="s5-car" />
          </g>
          <circle className="s5-flash" cx="960" cy="620" r="60" fill="#fff4c4" opacity="0" />
          <circle className="s5-flash s5-flash--rear" cx="322" cy="626" r="44" fill="#ff4d5d" opacity="0" />

          {/* The young driver */}
          <g className="s5-driver" transform="translate(1085 778)">
            <path d="M-16,-176 L-22,0" stroke={JEANS} strokeWidth="32" strokeLinecap="round" />
            <path d="M16,-176 L26,0" stroke="#2b4479" strokeWidth="32" strokeLinecap="round" />
            <ellipse cx="-30" cy="4" rx="22" ry="10" fill="#f5f5f5" />
            <ellipse cx="34" cy="4" rx="22" ry="10" fill="#f5f5f5" />
            <path d="M-30,-296 L-90,-218 L-118,-164" fill="none" stroke={HOODIE_SHADE} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="-120" cy="-158" r="13" fill={SKIN} />
            <rect x="-48" y="-330" width="96" height="176" rx="42" fill={HOODIE} />
            <path d="M-22,-322 Q0,-300 22,-322" fill="none" stroke={HOODIE_SHADE} strokeWidth="7" strokeLinecap="round" />
            <g className="s5-head" transform="translate(-2 -376) scale(-1.12 1.12)">
              <Head smile="big" />
            </g>
            <g className="s5-arm">
              <path d="M30,-300 L70,-240 L84,-180" fill="none" stroke={HOODIE} strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="86" cy="-172" r="14" fill={SKIN} />
              <g className="s5-keys" transform="translate(86 -158)">
                <circle r="11" fill="none" stroke="#ffd27a" strokeWidth="4" />
                <path d="M0,10 L0,46 M0,30 L9,30 M0,40 L9,40" stroke="#ffd27a" strokeWidth="5" strokeLinecap="round" />
                <rect x="-16" y="12" width="20" height="28" rx="6" fill="#1a1c24" transform="rotate(24)" />
              </g>
            </g>
          </g>

          <g className="s5-confetti">
            {CONFETTI.map((c, i) => (
              <rect key={i} className="s5-bit" width={c.w} height={c.h} rx="1.5" fill={c.color} opacity="0" />
            ))}
          </g>
        </g>
      </g>
    </svg>
  )
}

export const buildScene5: SceneBuilder = (root) => {
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  const origin = { x: 1171, y: 300 }
  const bits = q('.s5-bit')

  gsap.set(q('.s5-keys'), { transformOrigin: '50% 0%' })
  gsap.set(q('.s5-arm'), { transformOrigin: pivot(q('.s5-arm')[0], 30, -300) })
  gsap.set(bits, { x: origin.x, y: origin.y })
  q('.s5-bird').forEach((b, i) => gsap.set(b, { x: -100 - i * 60, y: 220 + (i % 2) * 40 - i * 14, scale: 1 - i * 0.12 }))

  tl.fromTo(q('.s5-cam'), zoom(800, 600, 1.18), { ...zoom(800, 600, 1), duration: 6, ease: 'power2.out' }, 0)
    .fromTo(q('.s5-sun, .s5-sun-halo'), { y: -60 }, { y: 70, duration: 10, ease: 'sine.inOut' }, 0)
    .fromTo(q('.s5-cloud'), { x: (i) => i * -30 }, { x: (i) => 80 + i * 40, duration: 10 }, 0)
    .to(q('.s5-bird'), { x: (i) => 1750 + i * 40, y: (i) => 120 + i * 30, duration: 9, stagger: 0.35 }, 0)
    // Arm up, keys jingle
    .fromTo(q('.s5-arm'), { rotation: 0 }, { rotation: -150, duration: 1.3, ease: 'back.out(1.6)' }, 1)
    .to(q('.s5-keys'), { rotation: 28, duration: 0.25, repeat: 9, yoyo: true, ease: 'sine.inOut' }, 2.2)
    .to(q('.s5-driver'), { y: '-=18', duration: 0.4, repeat: 3, yoyo: true, ease: 'power1.inOut' }, 1.4)
    // Remote unlock: double blink
    .to(q('.s5-flash'), { opacity: 0.9, duration: 0.18, repeat: 3, yoyo: true }, 2.4)
    .to(q('.s5-car .car-headlight, .s5-car .car-taillight'), { fill: '#ffffff', duration: 0.18, repeat: 3, yoyo: true }, 2.4)
    // Confetti burst from the keys
    .set(bits, { opacity: 1 }, 3.2)
    .to(bits, {
      x: (i) => origin.x + Math.cos(i * 2.39) * (180 + (i % 7) * 70),
      y: (i) => origin.y + Math.sin(i * 2.39) * (120 + (i % 5) * 60) - 140,
      rotation: (i) => (i % 2 ? 1 : -1) * (360 + i * 15),
      duration: 1.4,
      ease: 'power3.out',
    }, 3.2)
    .to(bits, { y: '+=520', rotation: '+=240', opacity: 0, duration: 4, ease: 'power1.in', stagger: 0.008 }, 4.6)

  return padTimeline(tl)
}
