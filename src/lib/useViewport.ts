import { useEffect, useState } from 'react'

export interface Viewport {
  w: number
  h: number
  portrait: boolean
}

const read = (): Viewport => ({
  w: window.innerWidth,
  h: window.innerHeight,
  portrait: window.innerWidth / window.innerHeight < 1.15,
})

export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(read)
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setVp(read()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return vp
}
