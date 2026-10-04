import { gsap } from '../../lib/gsap'
import { Car, HAIR, HOODIE, HOODIE_SHADE, SKIN, SKIN_SHADE, Sparkle } from '../parts'
import { padTimeline, pivot, zoom, type SceneBuilder, type SceneProps } from '../types'

// [x, width, height] of the far skyline, base at y=548
const SKYLINE: [number, number, number][] = [
  [330, 70, 120], [400, 54, 170], [454, 80, 96], [534, 46, 210], [580, 90, 140], [670, 60, 180],
  [730, 110, 110], [840, 56, 230], [896, 84, 150], [980, 64, 190], [1044, 96, 120], [1140, 60, 200], [1200, 80, 130],
]

const WINDOWS = SKYLINE.flatMap(([x, w, h], b) => {
  const out: [number, number][] = []
  for (let row = 0; row < Math.floor(h / 34); row++) {
    for (let col = 0; col < Math.floor(w / 22); col++) {
      if ((b * 7 + row * 3 + col * 5) % 4 === 0) out.push([x + 8 + col * 22, 548 - h + 14 + row * 34])
    }
  }
  return out
})

/** Scene 2 — the kid at the window, toy held up, as the real car drives by. */
export function Scene2({ frame }: SceneProps) {
  const { viewBox, par } = frame(840)
  return (
    <svg className="scene-svg" viewBox={viewBox} preserveAspectRatio={par} aria-hidden="true">
      <defs>
        <linearGradient id="s2-sky" x1="0" y1="110" x2="0" y2="670" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0e1640" />
          <stop offset="0.5" stopColor="#3d3b7c" />
          <stop offset="0.78" stopColor="#d9786d" />
          <stop offset="1" stopColor="#ffbd7a" />
        </linearGradient>
        <linearGradient id="s2-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#150f27" />
          <stop offset="1" stopColor="#2e2046" />
        </linearGradient>
        <linearGradient id="s2-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a3" stopOpacity="0.65" />
          <stop offset="1" stopColor="#ffe3a3" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="s2-glow">
          <stop offset="0" stopColor="#fff1c4" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff1c4" stopOpacity="0" />
        </radialGradient>
        <clipPath id="s2-window">
          <rect x="330" y="110" width="940" height="560" rx="6" />
        </clipPath>
      </defs>

      <g className="s2-cam">
        {/* Outside world, seen through the glass */}
        <g clipPath="url(#s2-window)">
          <g data-depth="0.12">
            <rect x="330" y="110" width="940" height="560" fill="url(#s2-sky)" />
            {[[380, 150], [470, 200], [610, 140], [720, 230], [900, 160], [1010, 210], [1180, 150], [1240, 240]].map(([x, y], i) => (
              <circle key={i} className="s2-star" cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} fill="#fff" />
            ))}
            <circle cx="1120" cy="210" r="34" fill="#fff3c4" opacity="0.9" />
            <circle cx="1120" cy="210" r="90" fill="url(#s2-glow)" opacity="0.35" />
            {SKYLINE.map(([x, w, h]) => (
              <rect key={x} x={x} y={548 - h} width={w} height={h} fill="#262457" />
            ))}
            {WINDOWS.map(([x, y], i) => (
              <rect key={i} className="s2-lit" x={x} y={y} width="10" height="14" rx="1.5" fill="#ffd27a" />
            ))}
          </g>
          <g data-depth="0.25">
            <path d="M330,548 L330,470 C380,430 420,450 460,470 C500,420 560,430 590,480 L590,548 Z" fill="#141a33" />
            <path d="M1270,548 L1270,440 C1220,410 1170,430 1150,470 C1120,440 1070,450 1050,500 L1050,548 Z" fill="#141a33" />
            <rect x="330" y="546" width="940" height="26" fill="#4a4a6e" />
            <rect x="330" y="570" width="940" height="100" fill="#24243b" />
            {[340, 480, 620, 760, 900, 1040, 1180].map((x) => (
              <rect key={x} x={x} y="622" width="70" height="6" rx="3" fill="#e9e6d8" opacity="0.6" />
            ))}
            {[470, 1150].map((x) => (
              <g key={x}>
                <path className="s2-cone" d={`M${x + 30},336 L${x - 70},640 L${x + 130},640 Z`} fill="url(#s2-cone)" />
                <ellipse cx={x + 30} cy="640" rx="110" ry="14" fill="#ffe3a3" opacity="0.18" />
                <rect x={x - 4} y="326" width="8" height="226" fill="#11121f" />
                <path d={`M${x},330 Q${x + 10},314 ${x + 30},318`} fill="none" stroke="#11121f" strokeWidth="7" />
                <rect x={x + 16} y="314" width="30" height="12" rx="4" fill="#11121f" />
                <ellipse cx={x + 31} cy="328" rx="10" ry="5" fill="#fff1c4" />
              </g>
            ))}
            <g className="s2-car">
              <g transform="translate(0 542) scale(0.6)">
                <Car uid="s2-car" beam />
              </g>
            </g>
          </g>
          {/* Glass reflections + breath fog */}
          <path d="M520,110 L640,110 L420,670 L300,670 Z" fill="#fff" opacity="0.05" />
          <path d="M700,110 L740,110 L520,670 L480,670 Z" fill="#fff" opacity="0.05" />
          <ellipse className="s2-fog" cx="930" cy="532" rx="54" ry="34" fill="#e8eeff" opacity="0" />
        </g>

        {/* Room wall around the window */}
        <g data-depth="0.4">
          <path d="M-500,-900 H2100 V1800 H-500 Z M330,110 V670 H1270 V110 Z" fill="url(#s2-wall)" fillRule="evenodd" />
          <rect x="318" y="98" width="964" height="584" rx="10" fill="none" stroke="#e9d8bb" strokeWidth="24" />
          <rect x="603" y="110" width="14" height="560" fill="#e9d8bb" />
          <rect x="296" y="668" width="1008" height="30" rx="8" fill="#f3e5cb" />
          <rect x="296" y="696" width="1008" height="18" fill="#000" opacity="0.25" />
          <path className="s2-curtain" d="M200,70 C250,260 210,480 270,760 L170,760 C130,480 170,260 130,70 Z" fill="#c8506a" />
          <path className="s2-curtain" d="M1400,70 C1350,260 1390,480 1330,760 L1430,760 C1470,480 1430,260 1470,70 Z" fill="#c8506a" />
          <rect x="100" y="58" width="1400" height="18" rx="9" fill="#8a5a3c" />
        </g>

        {/* The kid, from behind */}
        <g data-depth="0.7">
          <g className="s2-kid">
            <path d="M1035,632 L1078,670" fill="none" stroke={HOODIE_SHADE} strokeWidth="22" strokeLinecap="round" />
            <circle cx="1084" cy="674" r="13" fill={SKIN} />
            <rect x="944" y="596" width="116" height="340" rx="48" fill={HOODIE} />
            <path d="M960,610 Q1002,640 1044,610" fill="none" stroke={HOODIE_SHADE} strokeWidth="6" strokeLinecap="round" />
            <g className="s2-head">
              <rect x="986" y="574" width="32" height="34" fill={SKIN_SHADE} />
              <circle cx="1002" cy="546" r="50" fill={SKIN} />
              <circle className="s2-ear" cx="954" cy="552" r="11" fill={SKIN_SHADE} />
              <path d="M952,560 C940,500 980,486 1004,488 C1040,488 1062,510 1054,566 C1050,590 1030,598 1004,598 C984,598 964,590 958,576 Z" fill={HAIR} />
              <path d="M990,494 C1000,480 1022,482 1030,492" fill="none" stroke="#5e3a27" strokeWidth="6" strokeLinecap="round" />
            </g>
            <g className="s2-arm">
              <circle className="s2-toy-glow" cx="846" cy="476" r="90" fill="url(#s2-glow)" opacity="0" />
              <g transform="translate(792 452) scale(0.26)">
                <Car uid="s2-toy" />
              </g>
              <path d="M968,628 L912,600 L862,512" fill="none" stroke={HOODIE} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="858" cy="500" r="13" fill={SKIN} />
              <Sparkle className="s2-spark" size={14} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

export const buildScene2: SceneBuilder = (root) => {
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  const car = q('.s2-car')
  const wheels = q('.s2-car .wheel')

  gsap.set(wheels, { transformOrigin: '50% 50%' })
  gsap.set(q('.s2-arm'), { transformOrigin: pivot(q('.s2-arm')[0], 968, 628) })
  gsap.set(q('.s2-head'), { transformOrigin: pivot(q('.s2-head')[0], 1002, 600) })
  gsap.set(q('.s2-spark'), { x: 905, y: 446, scale: 0, transformOrigin: '50% 50%' })

  tl.fromTo(q('.s2-cam'), zoom(800, 450, 1.08), { ...zoom(800, 450, 1), duration: 3, ease: 'power2.out' }, 0)
    .to(q('.s2-cam'), { ...zoom(800, 450, 1.06), duration: 7, ease: 'sine.inOut' }, 3)
    .fromTo(q('.s2-arm'), { rotation: 38 }, { rotation: 0, duration: 1.8, ease: 'back.out(1.6)' }, 0.4)
    // The real car: arrives, lingers under the toy, drives off
    .fromTo(car, { x: -300 }, { x: 600, duration: 3.6, ease: 'power2.out' }, 1)
    .to(car, { x: 740, duration: 1.6 }, 4.6)
    .to(car, { x: 1900, duration: 3.2, ease: 'power2.in' }, 6.2)
    .fromTo(wheels, { rotation: 0 }, { rotation: 2770, duration: 3.6, ease: 'power2.out' }, 1)
    .to(wheels, { rotation: '+=430', duration: 1.6 }, 4.6)
    .to(wheels, { rotation: '+=3570', duration: 3.2, ease: 'power2.in' }, 6.2)
    // The kid follows it with their head
    .fromTo(q('.s2-head'), { x: -18, rotation: -7 }, { x: 16, rotation: 6, duration: 6, ease: 'sine.inOut' }, 2)
    .fromTo(q('.s2-ear'), { x: 4 }, { x: -6, duration: 6, ease: 'sine.inOut' }, 2)
    // Toy and real car line up: a little magic
    .to(q('.s2-toy-glow'), { opacity: 1, duration: 1, ease: 'power2.out' }, 4.4)
    .to(q('.s2-spark'), { scale: 1.4, rotation: 90, duration: 0.8, ease: 'back.out(3)' }, 4.6)
    .to(q('.s2-spark'), { scale: 0, rotation: 180, duration: 0.8 }, 6)
    .to(q('.s2-toy-glow'), { opacity: 0, duration: 1.2 }, 6.4)
    .fromTo(q('.s2-fog'), { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' }, { opacity: 0.32, scale: 1, duration: 0.9, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 2.6)
    .from(q('.s2-lit'), { opacity: 0, duration: 0.3, stagger: { each: 0.03, from: 'random' } }, 0.2)
    .to(q('.s2-arm'), { rotation: 8, duration: 1.5, ease: 'sine.inOut' }, 8.4)

  gsap.to(q('.s2-star'), { opacity: 0.2, duration: 1.4, repeat: -1, yoyo: true, stagger: { each: 0.3, from: 'random' } })
  gsap.to(q('.s2-cone'), { opacity: 0.75, duration: 0.12, repeat: -1, yoyo: true, repeatDelay: 2.4, ease: 'steps(2)' })

  return padTimeline(tl)
}
