// Additive light layer composited over the scenes with mix-blend-mode: screen.
// Black = no effect. Draws floating dust/light motes, soft light leaks and,
// during scene changes, a hyperspace-style warp of radial streaks.
precision highp float;

uniform float uTime;
uniform float uWarp;
uniform float uEnergy;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform vec3 uTint;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float motes(vec2 p, float scale, float speed, float seed) {
  p *= scale;
  p.y -= uTime * speed;
  p.x += sin(uTime * 0.15 + seed + p.y * 0.2) * 0.35;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = hash(id + seed);
  vec2 off = vec2(hash(id + seed + 1.3), hash(id + seed + 7.1)) - 0.5;
  float d = length(f - off * 0.7);
  float size = mix(0.02, 0.07, h * h);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
  float core = smoothstep(size, 0.0, d);
  float halo = smoothstep(size * 4.0, 0.0, d) * 0.25;
  return (core + halo) * step(0.62, h) * twinkle;
}

void main() {
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * aspect;
  vec3 col = vec3(0.0);

  // Depth layers of motes, each with its own parallax against the pointer.
  float m = 0.0;
  m += motes(p + uMouse * 0.010, 5.0, 0.020, 1.0) * 0.85;
  m += motes(p + uMouse * 0.022, 9.0, 0.032, 4.0) * 0.55;
  m += motes(p + uMouse * 0.040, 15.0, 0.050, 9.0) * 0.35;
  col += uTint * m * uEnergy;

  // Slow light leaks.
  float n = noise(p * 1.3 + vec2(uTime * 0.04, -uTime * 0.025));
  float n2 = noise(p * 2.1 - vec2(uTime * 0.03, uTime * 0.05) + 7.0);
  col += uTint * smoothstep(0.55, 1.0, n) * 0.16 * uEnergy;
  col += vec3(1.0, 0.55, 0.35) * smoothstep(0.7, 1.0, n2) * 0.08 * uEnergy;

  // Warp streaks.
  if (uWarp > 0.001) {
    float r = length(p);
    float a = atan(p.y, p.x);
    float bins = 140.0;
    float bin = floor(a / 6.28318 * bins);
    float id = hash(vec2(bin, 3.0));
    float thin = smoothstep(0.42, 0.0, abs(fract(a / 6.28318 * bins) - 0.5));
    float ray = step(0.55, id) * thin;
    float travel = fract(r * (0.8 + id) - uTime * (1.6 + id * 2.4) * (0.4 + uWarp));
    float streak = smoothstep(0.0, 0.25, travel) * smoothstep(1.0, 0.55, travel);
    streak *= smoothstep(0.04, 0.5, r);
    vec3 warpCol = mix(vec3(0.55, 0.72, 1.0), vec3(1.0, 0.78, 0.5), id);
    col += warpCol * ray * streak * uWarp * 1.6;
    col += vec3(1.0, 0.95, 0.88) * smoothstep(0.75, 0.0, r) * pow(uWarp, 2.5) * 0.55;
  }

  gl_FragColor = vec4(col, 1.0);
}
