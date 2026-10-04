import * as THREE from 'three'
import { gsap } from '../lib/gsap'
import fragmentShader from './shaders/fx.frag.glsl?raw'
import vertexShader from './shaders/fx.vert.glsl?raw'

export type FxUniforms = {
  uTime: { value: number }
  uWarp: { value: number }
  uEnergy: { value: number }
  uRes: { value: THREE.Vector2 }
  uMouse: { value: THREE.Vector2 }
  uTint: { value: THREE.Color }
}

/** Plain values the scroll timeline animates; copied into the shader every frame. */
export interface FxState {
  warp: number
  energy: number
  tint: { r: number; g: number; b: number }
}

export interface WarpFx {
  setActive(active: boolean): void
  setMouse(x: number, y: number): void
  dispose(): void
}

/** Full-screen shader layer. Returns null when WebGL is unavailable; the story works without it. */
export function createWarpFx(canvas: HTMLCanvasElement, state: FxState): WarpFx | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setClearColor(0x000000, 1)

  const uniforms: FxUniforms = {
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uEnergy: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uTint: { value: new THREE.Color(state.tint.r, state.tint.g, state.tint.b) },
  }
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false })
  scene.add(new THREE.Mesh(geometry, material))

  const mouseTarget = new THREE.Vector2()
  let active = true

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    const small = Math.min(w, h) < 700
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1 : 1.5))
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w, h)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const tick = (time: number) => {
    if (!active) return
    uniforms.uTime.value = time
    uniforms.uWarp.value = state.warp
    uniforms.uEnergy.value = state.energy
    uniforms.uTint.value.setRGB(state.tint.r, state.tint.g, state.tint.b)
    uniforms.uMouse.value.lerp(mouseTarget, 0.06)
    renderer.render(scene, camera)
  }
  gsap.ticker.add(tick)

  return {
    setActive(next) {
      active = next
    },
    setMouse(x, y) {
      mouseTarget.set(x, y)
    },
    dispose() {
      gsap.ticker.remove(tick)
      ro.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
