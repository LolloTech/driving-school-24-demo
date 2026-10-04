import { gsap } from '../../lib/gsap'
import { Car, Head, HOODIE, HOODIE_SHADE, JEANS, SKIN } from '../parts'
import { padTimeline, zoom, type SceneBuilder, type SceneProps } from '../types'

/** Scene 1 — a child on a road-map rug, pushing toy cars around at night. */
export function Scene1({ frame }: SceneProps) {
  const { viewBox, par } = frame(760)
  return (
    <svg className="scene-svg" viewBox={viewBox} preserveAspectRatio={par} aria-hidden="true">
      <defs>
        <linearGradient id="s1-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f1736" />
          <stop offset="1" stopColor="#3d2a52" />
        </linearGradient>
        <linearGradient id="s1-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a432f" />
          <stop offset="1" stopColor="#2e1c14" />
        </linearGradient>
        <linearGradient id="s1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1433" />
          <stop offset="1" stopColor="#2b3f7c" />
        </linearGradient>
        <radialGradient id="s1-lamp">
          <stop offset="0" stopColor="#ffcf86" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="#ff9f4a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ff9f4a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s1-moon">
          <stop offset="0" stopColor="#fff6d0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s1-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff3c9" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff3c9" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff3c9" stopOpacity="0" />
        </linearGradient>
        <pattern id="s1-stars" width="90" height="90" patternUnits="userSpaceOnUse">
          <path d="M20,14 l3,7 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1z" fill="#ffd98a" />
          <circle cx="66" cy="62" r="3" fill="#ffd98a" />
        </pattern>
        <filter id="s1-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <g className="s1-zoom">
      <g className="s1-cam">
        {/* Back wall */}
        <g data-depth="0.15">
          <rect x="-500" y="-900" width="2600" height="1560" fill="url(#s1-wall)" />
          <rect x="-500" y="-900" width="2600" height="1560" fill="url(#s1-stars)" opacity="0.08" />

          {/* Window */}
          <rect x="1046" y="136" width="328" height="348" rx="10" fill="#e9d8bb" />
          <rect x="1062" y="152" width="296" height="316" fill="url(#s1-sky)" />
          <circle cx="1290" cy="226" r="80" fill="url(#s1-moon)" />
          <circle cx="1290" cy="226" r="26" fill="#fff3c4" />
          <circle cx="1281" cy="219" r="5" fill="#f0dfa4" />
          <circle cx="1298" cy="236" r="4" fill="#f0dfa4" />
          {[
            [1100, 200], [1150, 260], [1205, 190], [1120, 330], [1330, 320], [1240, 300], [1180, 380],
          ].map(([x, y], i) => (
            <circle key={i} className="s1-star" cx={x} cy={y} r={i % 3 === 0 ? 2.6 : 1.6} fill="#fff" />
          ))}
          <path d="M1062,420 L1120,392 L1170,410 L1230,380 L1290,402 L1358,386 L1358,468 L1062,468 Z" fill="#141d3d" />
          <rect className="s1-window-glow" x="1062" y="152" width="296" height="316" fill="#ffe7a8" opacity="0" />
          <rect x="1203" y="152" width="14" height="316" fill="#e9d8bb" />
          <rect x="1062" y="303" width="296" height="14" fill="#e9d8bb" />
          <rect x="1030" y="478" width="360" height="22" rx="6" fill="#f3e5cb" />
          <path className="s1-curtain" d="M1010,110 C1040,220 1000,360 1040,520 L980,520 C960,380 990,220 960,110 Z" fill="#c8506a" />
          <path className="s1-curtain" d="M1410,110 C1380,220 1420,360 1380,520 L1440,520 C1460,380 1430,220 1460,110 Z" fill="#c8506a" />
          <rect x="940" y="98" width="540" height="16" rx="8" fill="#8a5a3c" />

          {/* Kid's crayon drawing — foreshadowing */}
          <g transform="translate(560 170) rotate(-3)">
            <rect width="250" height="176" rx="6" fill="#f3e3c4" />
            <rect x="12" y="12" width="226" height="152" fill="#fffaf0" />
            <circle cx="200" cy="48" r="18" fill="none" stroke="#ffbf3c" strokeWidth="5" />
            <path d="M30,140 Q120,128 224,140" fill="none" stroke="#5aa96a" strokeWidth="6" strokeLinecap="round" />
            <path d="M54,124 L60,100 L92,98 L108,78 L156,78 L172,98 L196,104 L196,124 Z" fill="none" stroke="#ff4d4f" strokeWidth="5" strokeLinejoin="round" />
            <circle cx="82" cy="126" r="10" fill="none" stroke="#333" strokeWidth="5" />
            <circle cx="170" cy="126" r="10" fill="none" stroke="#333" strokeWidth="5" />
          </g>

          {/* Shelf */}
          <rect x="120" y="250" width="330" height="14" rx="4" fill="#8a5a3c" />
          {[
            [140, 34, 70, '#6b8cff'], [178, 26, 82, '#ffb547'], [208, 30, 64, '#3ddc97'], [242, 22, 76, '#ff6b6b'],
          ].map(([x, w, h, c]) => (
            <rect key={x as number} x={x as number} y={250 - (h as number)} width={w as number} height={h as number} rx="3" fill={c as string} />
          ))}
          <g transform="translate(300 196) scale(0.13)">
            <Car uid="s1-shelfcar" color="#3ddc97" shade="#1d8f5f" />
          </g>
        </g>

        {/* Floor, lamp, toy box */}
        <g data-depth="0.3">
          <rect x="-500" y="640" width="2600" height="900" fill="url(#s1-floor)" />
          {[690, 750, 830, 930].map((y) => (
            <line key={y} x1="-500" x2="2100" y1={y} y2={y} stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
          ))}
          <rect x="-500" y="632" width="2600" height="14" fill="#2a1a12" />

          <circle className="s1-lamp-glow" cx="160" cy="330" r="460" fill="url(#s1-lamp)" />
          <ellipse cx="160" cy="846" rx="62" ry="12" fill="#1a110c" />
          <rect x="155" y="330" width="10" height="516" fill="#2b2b33" />
          <path d="M96,330 L224,330 L196,250 L124,250 Z" fill="#ffd59a" />
          <path d="M96,330 L224,330 L218,316 L102,316 Z" fill="#ffbf6b" />

          <g transform="translate(1340 560)">
            <rect width="190" height="120" rx="10" fill="#4a7bd6" />
            <rect y="-14" width="190" height="24" rx="8" fill="#5f8fe6" />
            <rect x="20" y="-46" width="40" height="40" rx="6" fill="#ffb547" transform="rotate(-10 40 -26)" />
            <rect x="80" y="-40" width="34" height="34" rx="6" fill="#ff6b6b" />
            <circle cx="150" cy="-24" r="20" fill="#3ddc97" />
          </g>
          <ellipse cx="760" cy="760" rx="520" ry="150" fill="url(#s1-lamp)" opacity="0.5" />
        </g>

        {/* Rug, kid, toy road */}
        <g data-depth="0.55">
          <ellipse cx="780" cy="800" rx="580" ry="122" fill="#24685b" />
          <ellipse cx="780" cy="800" rx="548" ry="104" fill="none" stroke="#f4e3b5" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" />
          {[
            [330, 770], [1180, 760], [1270, 856],
          ].map(([x, y]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <rect x="-3" y="-4" width="6" height="16" fill="#6a432f" />
              <circle cy="-14" r="16" fill="#3ea86f" />
            </g>
          ))}
          <g transform="translate(1040 748)">
            <rect x="-30" y="-24" width="60" height="34" fill="#ffefd2" />
            <path d="M-38,-22 L0,-50 L38,-22 Z" fill="#ff6b6b" />
            <rect x="-8" y="-6" width="16" height="16" fill="#8a5a3c" />
          </g>

          {/* Kid */}
          <g transform="translate(690 770) scale(1.15)">
            <path d="M-46,-4 C-12,16 40,12 66,-2" fill="none" stroke="#2b4479" strokeWidth="30" strokeLinecap="round" />
            <path d="M-34,6 C6,-8 46,-14 72,6" fill="none" stroke={JEANS} strokeWidth="28" strokeLinecap="round" />
            <ellipse cx="80" cy="6" rx="16" ry="11" fill="#f5f5f5" />
            <path d="M-6,-96 L28,-58 L44,-34" fill="none" stroke={HOODIE_SHADE} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="47" cy="-30" r="9" fill={SKIN} />
            <rect x="-36" y="-122" width="68" height="120" rx="30" fill={HOODIE} />
            <rect x="-36" y="-70" width="68" height="12" fill="#ffb547" />
            <g className="s1-head" transform="translate(6 -160)">
              <Head />
            </g>
            <g className="s1-push">
              <g transform="translate(58 -34) scale(0.21)">
                <Car uid="s1-hand-car" />
              </g>
              <path d="M-2,-94 L34,-60 L84,-30" fill="none" stroke="#ff9a50" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="88" cy="-27" r="11" fill={SKIN} />
            </g>
          </g>

          <path className="s1-road" d="M180,846 C420,770 600,914 830,846 S1180,770 1420,836" fill="none" stroke="#3a3e4c" strokeWidth="44" strokeLinecap="round" />
          <path className="s1-road-dash" d="M180,846 C420,770 600,914 830,846 S1180,770 1420,836" fill="none" stroke="#ffe08a" strokeWidth="3" strokeDasharray="16 14" />
          <g className="s1-toy-a">
            <g transform="scale(0.17)">
              <Car uid="s1-toy-a" color="#4f86ff" shade="#2346a8" />
            </g>
          </g>
          <g className="s1-toy-b">
            <g transform="scale(0.15)">
              <Car uid="s1-toy-b" color="#ffc93c" shade="#c98a10" />
            </g>
          </g>
        </g>

        {/* Headlights sweeping the wall from a car outside */}
        <path className="s1-sweep" d="M-200,-200 L200,-200 L520,700 L120,700 Z" fill="url(#s1-sweep)" opacity="0" />

        {/* Out-of-focus foreground */}
        <g data-depth="1" filter="url(#s1-blur)" opacity="0.9">
          <g transform="translate(40 790) rotate(-8)">
            <rect width="120" height="120" rx="14" fill="#ff6b6b" />
            <text x="60" y="86" textAnchor="middle" fontSize="80" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, sans-serif">A</text>
          </g>
          <g transform="translate(1460 820) rotate(10)">
            <rect width="110" height="110" rx="14" fill="#6b8cff" />
            <text x="55" y="80" textAnchor="middle" fontSize="74" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, sans-serif">B</text>
          </g>
        </g>
      </g>
      </g>
    </svg>
  )
}

export const buildScene1: SceneBuilder = (root) => {
  const q = gsap.utils.selector(root)
  const road = root.querySelector<SVGPathElement>('.s1-road')!
  const tl = gsap.timeline({ defaults: { ease: 'none' } })

  const motion = (alignOrigin: [number, number]) => ({ path: road, align: road, alignOrigin, autoRotate: true })
  gsap.set(q('.s1-toy-a'), { motionPath: { ...motion([0.5, 0.92]), end: 0 } })
  gsap.set(q('.s1-toy-b'), { motionPath: { ...motion([0.5, 0.92]), end: 0 } })

  tl.fromTo(q('.s1-cam'), zoom(760, 640, 1), { ...zoom(760, 640, 1.12), duration: 10, ease: 'sine.inOut' }, 0)
    .fromTo(road, { drawSVG: '0%' }, { drawSVG: '100%', duration: 2.4, ease: 'power2.inOut' }, 0)
    .from(q('.s1-road-dash'), { opacity: 0, duration: 1 }, 2)
    .from(q('.s1-toy-a, .s1-toy-b'), { opacity: 0, duration: 0.6, stagger: 1.4 }, 1.4)
    .to(q('.s1-toy-a'), { motionPath: { ...motion([0.5, 0.92]), start: 0, end: 1 }, duration: 6.5, ease: 'power1.inOut' }, 1.4)
    .to(q('.s1-toy-b'), { motionPath: { ...motion([0.5, 0.92]), start: 0, end: 0.82 }, duration: 6.6, ease: 'power1.inOut' }, 2.8)
    .to(q('.s1-toy-a .wheel, .s1-toy-b .wheel'), { rotation: 1440, transformOrigin: '50% 50%', duration: 8 }, 1.4)
    .to(q('.s1-push'), { x: 26, duration: 1, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0.3)
    .to(q('.s1-push .wheel'), { rotation: 300, transformOrigin: '50% 50%', duration: 1, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0.3)
    .fromTo(q('.s1-lamp-glow'), { opacity: 0.55 }, { opacity: 1, duration: 4 }, 0)
    // A real car passes outside: light sweeps the room and pulls the kid's gaze.
    .fromTo(q('.s1-sweep'), { x: 1500, opacity: 0 }, { x: -300, opacity: 1, duration: 2.6, ease: 'power1.in' }, 7.2)
    .to(q('.s1-sweep'), { opacity: 0, duration: 0.6 }, 9.4)
    .to(q('.s1-window-glow'), { opacity: 0.45, duration: 1.4, ease: 'power2.out' }, 7.8)
    .to(q('.s1-head'), { rotation: -14, transformOrigin: '50% 90%', duration: 1.6, ease: 'power2.inOut' }, 8.1)
    .to(q('.s1-head .eye'), { x: 3, y: -4, duration: 1, ease: 'power2.out' }, 8.3)

  gsap.to(q('.s1-star'), { opacity: 0.25, duration: 1.2, repeat: -1, yoyo: true, stagger: { each: 0.35, from: 'random' }, ease: 'sine.inOut' })
  gsap.to(q('.s1-curtain'), { skewX: 1.5, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 0%' })

  return padTimeline(tl)
}
