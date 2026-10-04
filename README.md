# Via Libera — demo site for a driving school

Front end in React + TypeScript (Vite). One-page app with three routes:

The login and React backoffice live in `src/modules/backoffice`, with a separate HTML entry and no public animation dependencies. The independent Node/TypeScript API lives in `src/modules/backend`; its TypeScript project and Docker build remain isolated from Vite. See [the application README](../README.md) for backend/Authelia setup, secure local development, database commands and the full test pipeline. For the working login demo, use `npm run dev:secure` after starting the backend containers.

| Route       | Contents                                                                 |
|-------------|--------------------------------------------------------------------------|
| `/`         | 5-scene animated scroll story + "why us", "how it works", call to action |
| `/faq`      | Accessible accordion with 8 questions                                    |
| `/contatti` | Contact form with validation, sent through `src/api/client.ts`          |

## Quick start

Requires **Node ≥ 20.19** (the system Node 14 is too old; `.nvmrc` pins 20.19.5).

```bash
nvm use            # or: export PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH
npm install
npm run dev        # http://localhost:5173
```

Other commands: `npm run build` (tsc + vite build in `dist/`), `npm run preview`, `npm run lint`, `npm run typecheck`.

## The scroll story

`src/story/ScrollStory.tsx` builds **a single GSAP timeline** scrubbed by ScrollTrigger on a pinned stage, with Lenis smooth scroll.

1. **Il sogno**: the child pushes toy cars along a road-map rug (DrawSVG + MotionPath); headlights sweep the room.
2. **La finestra**: you fly through the window; the real car drives by while the child holds up the toy.
3. **I quiz**: "fast forward" from 8 to 18; holographic quiz cards, 30/30 bar, IDONEO stamp.
4. **La patente**: POV of the licence in real 3D (CSS perspective), holographic sheen, fields typed in.
5. **Via libera**: sunset, keys raised, the car's lights blink, confetti, CTA.

How it works:
- Each scene lives in `src/story/scenes/SceneN.tsx`. It exports the illustration (inline SVG, or HTML for scene 4) and a `buildSceneN(root)` that returns a 10-unit timeline.
- Between scenes there are 2.4-unit transitions. If scrolling stops inside a transition, the page **glides on to the next scene by itself** (`glideTo`, Lenis `scrollTo` with `lock`).
- `src/story/warpFx.ts` + `shaders/`: a WebGL layer (Three.js, lazy-loaded) composited with `mix-blend-mode: screen`. It draws light motes, light leaks and the warp streaks during transitions. Without WebGL the story still works.
- HUD: chapter dots you can click, plus a speedometer showing progress.
- Mouse parallax on `[data-depth]` layers (pointer devices only).
- Portrait / mobile: each scene crops a window around its own focal point (`makeFrame` in `types.ts`).
- `prefers-reduced-motion`: no pinning, scrolling or shader; the scenes are shown statically one after another.

Animation conventions (lessons learned):
- Camera zooms use `zoom(ox, oy, s)` from `types.ts` (an attribute tween), not `svgOrigin`.
- For rotations of parts already positioned with `transform`, use `pivot(el, x, y)`. To move them, use relative values (`'+=140'`), never absolutes.

## Connecting the real backend

`src/api/client.ts` exposes an `ApiClient` interface. With no configuration it uses an in-browser mock. Set `VITE_API_URL` in `.env.local` (see `.env.example`) and the form will `POST {VITE_API_URL}/contact` with a `ContactRequest` JSON body.

## Notes

- Brand, address, phone and the licence data are fictional ("documento dimostrativo").
- Fonts: Bricolage Grotesque + Inter from Google Fonts.
