/**
 * Shared vector "actors" for the story. Everything is drawn in local units
 * and positioned by the scene with a transform, so the same car and the same
 * face appear across all five scenes.
 */

export const SKIN = '#f1c09a'
export const SKIN_SHADE = '#d99e7a'
export const HAIR = '#4a2c1d'
export const HOODIE = '#ff8a3d'
export const HOODIE_SHADE = '#e36f25'
export const JEANS = '#34508f'

const CAR_BODY =
  'M10,118 L10,86 Q12,70 30,66 L98,58 L142,22 Q151,14 166,14 L282,14 Q298,14 309,25 L350,58 L396,67 Q415,71 415,92 L415,118 Q415,128 405,128 L360,128 A35,35 0 0 0 290,128 L130,128 A35,35 0 0 0 60,128 L20,128 Q10,128 10,118 Z'

interface CarProps {
  uid: string
  color?: string
  shade?: string
  className?: string
  /** Show the headlight beam (night scenes). */
  beam?: boolean
}

/** Side view hatchback facing right. Local box ~ 0..420 × 0..170, wheels touch y=163. */
export function Car({ uid, color = '#ff4d4f', shade = '#b8162a', className, beam }: CarProps) {
  return (
    <g className={className}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfe2ff" />
          <stop offset="1" stopColor="#4d6597" />
        </linearGradient>
        {beam && (
          <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff2c2" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff2c2" stopOpacity="0" />
          </linearGradient>
        )}
      </defs>
      {beam && <path className="car-beam" d="M410,78 L900,30 L900,160 L410,96 Z" fill={`url(#${uid}-beam)`} />}
      <ellipse cx="212" cy="164" rx="205" ry="9" fill="#000" opacity="0.35" />
      <path d={CAR_BODY} fill={`url(#${uid}-body)`} />
      <path d="M30,68 L98,60 L142,24 Q151,16 166,16 L282,16 Q296,16 306,26 L346,60 L392,68" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M116,58 L150,28 Q156,22 166,22 L218,22 L218,58 Z" fill={`url(#${uid}-glass)`} />
      <path d="M228,22 L278,22 Q291,22 299,31 L326,58 L228,58 Z" fill={`url(#${uid}-glass)`} />
      <path d="M160,26 L176,26 L150,54 L136,54 Z" fill="#fff" opacity="0.35" />
      <path d="M262,26 L272,26 L250,54 L240,54 Z" fill="#fff" opacity="0.3" />
      <path d="M222,62 L222,122" stroke={shade} strokeWidth="3" />
      <rect x="236" y="74" width="22" height="5" rx="2.5" fill={shade} />
      <rect x="150" y="74" width="22" height="5" rx="2.5" fill={shade} />
      <path className="car-headlight" d="M398,76 L413,78 L413,92 L396,90 Z" fill="#fff4c4" />
      <rect className="car-taillight" x="11" y="76" width="10" height="16" rx="3" fill="#ff2d3d" />
      <rect x="10" y="108" width="406" height="8" rx="4" fill={shade} opacity="0.7" />
      {[95, 325].map((cx) => (
        <g key={cx} transform={`translate(${cx} 128)`}>
          <g className="wheel">
            <circle r="31" fill="#1a1c24" />
            <circle r="18" fill="#c9ced8" />
            <circle r="18" fill="none" stroke="#7d8597" strokeWidth="2" />
            {[0, 72, 144, 216, 288].map((a) => (
              <rect key={a} x="-2.5" y="-17" width="5" height="12" rx="2" fill="#7d8597" transform={`rotate(${a})`} />
            ))}
            <circle r="5" fill="#59606e" />
          </g>
        </g>
      ))}
    </g>
  )
}

interface HeadProps {
  className?: string
  smile?: 'soft' | 'big'
  /** Use a lighter stroke weight when drawn small. */
  eyeClass?: string
}

/** Profile-ish face looking right, centred on (0,0), radius 40. */
export function Head({ className, smile = 'soft', eyeClass }: HeadProps) {
  return (
    <g className={className}>
      <path d="M-14,30 L-12,58 L14,58 L12,30 Z" fill={SKIN_SHADE} />
      <circle r="40" fill={SKIN} />
      <circle cx="-14" cy="6" r="9" fill={SKIN_SHADE} />
      <circle cx="16" cy="13" r="7" fill="#ff8f8f" opacity="0.45" />
      <path
        d="M-41,10 C-48,-46 16,-66 38,-24 C40,-18 41,-14 40,-10 C30,-24 14,-30 2,-26 C-6,-14 -14,-10 -22,-4 C-26,4 -30,14 -34,30 Z"
        fill={HAIR}
      />
      <path d="M2,-40 C20,-46 38,-34 40,-16 C30,-26 18,-30 4,-28 Z" fill="#5e3a27" />
      <g className={eyeClass ?? 'eye'}>
        <ellipse cx="21" cy="-3" rx="3.6" ry="4.4" fill="#2a1c14" />
        <circle cx="22.2" cy="-4.4" r="1.2" fill="#fff" />
      </g>
      <path d="M13,-14 Q20,-17 28,-13" fill="none" stroke={HAIR} strokeWidth="3" strokeLinecap="round" />
      <path d="M38,0 Q45,8 37,11" fill="none" stroke={SKIN_SHADE} strokeWidth="3" strokeLinecap="round" />
      {smile === 'soft' ? (
        <path className="mouth" d="M23,19 Q29,24 35,18" fill="none" stroke="#7a3b2a" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path className="mouth" d="M20,17 Q30,32 39,16 Z" fill="#7a2a24" stroke="#7a2a24" strokeWidth="2" strokeLinejoin="round" />
      )}
    </g>
  )
}

/** Small four-point sparkle centred on (0,0). */
export function Sparkle({ className, size = 12, color = '#fff6d6' }: { className?: string; size?: number; color?: string }) {
  const s = size
  return (
    <path
      className={className}
      d={`M0,${-s} C${s * 0.15},${-s * 0.15} ${s * 0.15},${-s * 0.15} ${s},0 C${s * 0.15},${s * 0.15} ${s * 0.15},${s * 0.15} 0,${s} C${-s * 0.15},${s * 0.15} ${-s * 0.15},${s * 0.15} ${-s},0 C${-s * 0.15},${-s * 0.15} ${-s * 0.15},${-s * 0.15} 0,${-s} Z`}
      fill={color}
    />
  )
}
