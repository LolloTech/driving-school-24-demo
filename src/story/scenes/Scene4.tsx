import { gsap, SplitText } from '../../lib/gsap'
import { Head, HOODIE, HOODIE_SHADE, SKIN, SKIN_SHADE } from '../parts'
import { padTimeline, type SceneBuilder } from '../types'

const BOKEH = [
  [8, 18, 120], [22, 70, 80], [35, 30, 160], [52, 80, 110], [64, 12, 70], [78, 60, 150],
  [90, 28, 90], [14, 88, 60], [46, 48, 50], [70, 90, 130], [86, 82, 54], [30, 58, 40],
] as const

const FIELDS: [string, string][] = [
  ['1.', 'BIANCHI'],
  ['2.', 'LUCA'],
  ['3.', '14.03.2008 MILANO (MI)'],
  ['4a.', '02.10.2026'],
  ['4b.', '02.10.2036'],
  ['5.', 'VL-26-000001'],
  ['9.', 'AM / B1 / B'],
]

const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  return [30 + Math.cos(a) * 18, 30 + Math.sin(a) * 18] as const
})

function Hand() {
  return (
    <>
      <path d="M-200,720 L-40,720 L8,436 L-130,404 Z" fill={HOODIE} />
      <path d="M-200,720 L-150,720 L-110,420 L-130,404 Z" fill={HOODIE_SHADE} />
      {[226, 266, 306].map((y) => (
        <rect key={y} x="-74" y={y} width="120" height="36" rx="18" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="2" />
      ))}
      <ellipse cx="-30" cy="362" rx="72" ry="90" transform="rotate(-14 -30 362)" fill={SKIN} />
    </>
  )
}

function Thumb() {
  return (
    <>
      <path d="M-24,368 Q30,344 70,306" fill="none" stroke={SKIN} strokeWidth="44" strokeLinecap="round" />
      <ellipse cx="70" cy="304" rx="13" ry="10" transform="rotate(-40 70 304)" fill="#f8dcc6" />
    </>
  )
}

/** Scene 4 — POV: our hands, holding the freshly printed licence. Built in HTML for real 3D tilt. */
export function Scene4() {
  return (
    <div className="s4">
      <div className="s4-bg">
        {BOKEH.map(([x, y, s], i) => (
          <span
            key={i}
            className="s4-bokeh"
            style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${i * -0.7}s` }}
          />
        ))}
      </div>
      <div className="s4-stage">
        <div className="s4-rig">
          <div className="s4-tilt">
            <svg className="s4-hands" viewBox="0 0 680 430" aria-hidden="true">
              <Hand />
              <g transform="translate(680 0) scale(-1 1)">
                <Hand />
              </g>
            </svg>
            <div className="licence" role="img" aria-label="Patente di guida illustrata di Luca Bianchi, categoria B">
              <div className="licence__guilloche" />
              <div className="licence__head">
                <svg className="licence__eu" viewBox="0 0 60 60" aria-hidden="true">
                  <rect width="60" height="60" rx="6" fill="#1f3fa8" />
                  {STARS.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="2.6" fill="#ffd23c" />
                  ))}
                  <text x="30" y="37" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">
                    I
                  </text>
                </svg>
                <div>
                  <div className="licence__title">PATENTE DI GUIDA</div>
                  <div className="licence__sub">Via Libera · documento dimostrativo</div>
                </div>
              </div>
              <div className="licence__body">
                <div className="licence__photo">
                  <svg viewBox="-70 -70 140 160" aria-hidden="true">
                    <rect x="-70" y="-70" width="140" height="160" fill="#cfe0f5" />
                    <path d="M-60,90 Q-50,40 0,40 Q50,40 60,90 Z" fill={HOODIE} />
                    <g transform="translate(-4 0) scale(1.05)">
                      <Head smile="big" />
                    </g>
                  </svg>
                </div>
                <dl className="licence__fields">
                  {FIELDS.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd className="lic-type">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="licence__foot">
                <svg className="licence__sign" viewBox="0 0 200 60" aria-hidden="true">
                  <path
                    className="lic-sign"
                    d="M6,42 C18,10 30,8 26,34 C24,48 36,46 44,30 C50,18 54,40 62,36 C70,32 72,22 80,28 C88,34 84,46 96,40 C108,34 116,20 124,30 C132,40 146,36 160,28 C170,22 182,26 194,20"
                    fill="none"
                    stroke="#1d2a6b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="licence__cat">
                  <svg viewBox="0 0 64 30" aria-hidden="true">
                    <path d="M4,22 L4,16 Q5,12 10,11 L18,10 L26,3 L44,3 L52,10 L60,12 L60,22 Z" fill="#1d2a6b" />
                    <circle cx="16" cy="23" r="5" fill="#1d2a6b" stroke="#f6c3d6" strokeWidth="2" />
                    <circle cx="48" cy="23" r="5" fill="#1d2a6b" stroke="#f6c3d6" strokeWidth="2" />
                  </svg>
                  <span>B</span>
                </div>
              </div>
              <div className="licence__holo" />
              <div className="licence__sheen" />
            </div>
            <svg className="s4-hands s4-hands--front" viewBox="0 0 680 430" aria-hidden="true">
              <Thumb />
              <g transform="translate(680 0) scale(-1 1)">
                <Thumb />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export const buildScene4: SceneBuilder = (root) => {
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  const split = SplitText.create(q('.lic-type'), { type: 'chars' })

  tl.fromTo(q('.s4-rig'), { yPercent: 75, rotationX: 58, scale: 0.8, opacity: 0 }, { yPercent: 0, rotationX: 8, scale: 1, opacity: 1, duration: 2.2, ease: 'power3.out' }, 0)
    .fromTo(q('.s4-tilt'), { rotationY: -18, rotationX: 10 }, { rotationY: 16, rotationX: -6, duration: 8, ease: 'sine.inOut' }, 1.6)
    .fromTo(q('.licence__sheen'), { xPercent: -120 }, { xPercent: 120, duration: 7, ease: 'sine.inOut' }, 2.2)
    .fromTo(q('.licence__holo'), { opacity: 0.25, filter: 'hue-rotate(0deg)' }, { opacity: 0.9, filter: 'hue-rotate(220deg)', duration: 8 }, 1.6)
    .from(q('.licence__photo'), { scale: 0.4, opacity: 0, duration: 1, ease: 'back.out(1.8)' }, 1.8)
    .from(split.chars, { opacity: 0, y: 6, duration: 0.05, stagger: 0.045, ease: 'power1.out' }, 2.4)
    .fromTo(q('.lic-sign'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.4, ease: 'power1.inOut' }, 6.6)
    .fromTo(q('.licence__cat'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.5)' }, 7.8)
    .fromTo(q('.s4-bokeh'), { y: 40 }, { y: -60, duration: 10, stagger: 0.02 }, 0)

  return padTimeline(tl)
}
