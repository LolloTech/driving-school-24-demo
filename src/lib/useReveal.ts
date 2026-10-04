import { useLayoutEffect, type RefObject } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

/** Fades up every `[data-reveal]` element inside `ref` as it scrolls into view. */
export function useReveal(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', root)
      gsap.set(items, { y: 40, opacity: 0 })
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out' }),
      })
    }, root)
    return () => ctx.revert()
  }, [ref])
}
