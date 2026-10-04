/** Every scene timeline is normalised to this many units. */
export const SCENE_LEN = 10

export interface SceneFrame {
  viewBox: string
  par: string
  portrait: boolean
}

export interface SceneProps {
  frame: (focusX: number) => SceneFrame
}

export type SceneBuilder = (root: HTMLElement) => gsap.core.Timeline

/** Landscape: full 16:9 artboard, cropped to cover. Portrait: a window around the scene's focus, anchored to the bottom. */
export function makeFrame(portrait: boolean) {
  return (focusX: number): SceneFrame => {
    if (!portrait) return { viewBox: '0 0 1600 900', par: 'xMidYMid slice', portrait }
    const w = 760
    const x = Math.round(Math.min(Math.max(focusX - w / 2, 0), 1600 - w))
    return { viewBox: `${x} 0 ${w} 900`, par: 'xMidYMax meet', portrait }
  }
}

/** Pads a scene timeline to exactly SCENE_LEN units. */
export function padTimeline(tl: gsap.core.Timeline): gsap.core.Timeline {
  if (tl.duration() < SCENE_LEN) tl.set({}, {}, SCENE_LEN)
  return tl
}

/**
 * transformOrigin that pins a rotation to the point (x, y) of the element's own
 * user space. More predictable than svgOrigin when x/y are tweened too.
 */
export function pivot(el: Element | undefined, x: number, y: number): string {
  if (!(el instanceof SVGGraphicsElement)) return '50% 50%'
  const bb = el.getBBox()
  return `${x - bb.x}px ${y - bb.y}px`
}

/** Camera zoom about (ox, oy) as a plain attribute tween — no GSAP origin bookkeeping. */
export function zoom(ox: number, oy: number, s: number) {
  return { attr: { transform: `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})` } }
}
