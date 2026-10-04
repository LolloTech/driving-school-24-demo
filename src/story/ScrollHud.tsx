import { useImperativeHandle, useRef, type Ref } from 'react'

export interface HudApi {
  update(progress: number, scene: number): void
}

interface Props {
  labels: string[]
  onJump(index: number): void
  apiRef: Ref<HudApi>
}

const ARC = 'M-70,40 A80,80 0 1 1 70,40'

/** Chapter dots + a speedometer that reads total story progress. */
export default function ScrollHud({ labels, onJump, apiRef }: Props) {
  const dotsRef = useRef<HTMLOListElement>(null)
  const fillRef = useRef<SVGPathElement>(null)
  const needleRef = useRef<SVGGElement>(null)
  const speedRef = useRef<HTMLSpanElement>(null)
  const current = useRef(-1)

  useImperativeHandle(apiRef, () => ({
    update(progress, scene) {
      fillRef.current?.style.setProperty('stroke-dashoffset', String(100 - progress * 100))
      needleRef.current?.setAttribute('transform', `rotate(${-120 + progress * 240})`)
      if (speedRef.current) speedRef.current.textContent = String(Math.round(progress * 130))
      if (scene !== current.current && dotsRef.current) {
        current.current = scene
        dotsRef.current.querySelectorAll('button').forEach((b, i) => {
          if (i === scene) b.setAttribute('aria-current', 'step')
          else b.removeAttribute('aria-current')
        })
      }
    },
  }))

  return (
    <div className="hud">
      <ol className="hud__dots" ref={dotsRef}>
        {labels.map((label, i) => (
          <li key={label}>
            <button type="button" onClick={() => onJump(i)} aria-current={i === 0 ? 'step' : undefined}>
              <span className="hud__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="hud__label">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="hud__gauge" aria-hidden="true">
        <svg viewBox="-100 -100 200 160">
          <path d={ARC} pathLength={100} className="hud__track" />
          <path d={ARC} pathLength={100} className="hud__fill" ref={fillRef} />
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1="0" y1="-66" x2="0" y2={i % 3 === 0 ? -56 : -61} transform={`rotate(${-120 + i * 20})`} className="hud__tick" />
          ))}
          <g ref={needleRef} transform="rotate(-120)">
            <path d="M-3,0 L0,-60 L3,0 Z" className="hud__needle" />
          </g>
          <circle r="7" className="hud__hub" />
        </svg>
        <div className="hud__speed">
          <span ref={speedRef}>0</span>
          <small>km/h</small>
        </div>
      </div>
    </div>
  )
}
