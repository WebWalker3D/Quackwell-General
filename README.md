# Quackwell General

An original hospital management sim in a glossy toy-diorama style, built with three.js.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # simulation tests (Vitest)
npm run build      # typecheck + production bundle in dist/
```

Controls: right-drag or WASD to pan, scroll to zoom, Q/E to rotate. Space pauses, 1/2/3 set speed.
B rooms, N items, H staff, J hospital, X sell, R rotates an item, Delete twice sells the selection, P hides the UI.

Graphics presets live in Settings. Integrated GPUs start on High; Ultra adds screen-space AO, 4K shadows and more grass.

Handy URL flags for screenshots: `?demo=1` (busy showcase hospital), `?demo=items` (item gallery),
`&t=0.95` (night), `&weather=rain|snow`, `&cam=0..3`, `&q=ultra|high|medium|low`.
`node scripts/shot.mjs <url> <out.png>`, `node scripts/play.mjs` (scripted play-through) and
`node scripts/perf.mjs <url> 1920x1080` drive a real GPU-backed Chromium.
