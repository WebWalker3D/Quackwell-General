# Quackwell General — Milestone 1 (Vertical Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One fully playable hospital: build rooms and corridor items, hire staff, and watch patients flow through reception → GP → diagnostics → treatment → cure, rendered as an over-the-top glossy toy diorama.

**Architecture:** A pure, deterministic TypeScript simulation (`src/sim`, no three.js, Vitest-tested) advanced on a fixed 1/30 s game-time step. A three.js renderer (`src/render`) reads sim state each frame, interpolating entity positions, and owns all visuals. An HTML/CSS overlay (`src/ui`) turns input into sim commands.

**Tech Stack:** TypeScript, Vite, three, postprocessing (pmndrs), n8ao, Vitest, Playwright (screenshots only), @fontsource fonts, WebAudio (synthesized sound).

**Spec:** `docs/superpowers/specs/2026-11-22-quackwell-general-design.md`

## Global Constraints

- Original IP only: no Two Point Hospital names, illnesses, characters, art, UI.
- No downloaded/licensed art or audio; everything generated in code.
- Must run smoothly at "High" on the owner's integrated AMD Radeon (Barcelo); "Ultra" may assume a discrete GPU.
- `src/sim/**` must not import three.js or touch the DOM.
- 1 tile = 1 world unit. Wall height 2.4. Characters ~1.1 tall (big-head toy proportions).
- Commits: no co-author lines, no AI attribution.

## Review Focus

1. Building a room that cuts corridor access to the entrance, reception, or another room's door → placement rejected with a reason.
2. Selling a room while patients are inside/queued or staff assigned → they are released and re-routed, nothing stalls.
3. A diagnosed illness whose treatment room doesn't exist → patient waits (impatient) then leaves; GP keeps working; a hint toast names the missing room.
4. Not enough money → build/hire/place refused; salaries can push money negative without crashing.
5. Huge frame gaps (tab hidden, debugger) → sim clamps steps per frame; no teleports or spiral of death.

Each line has a test in the task that owns the code (Tasks 2–4).

---

## File Structure

```
index.html                      shell, loads src/main.ts
src/main.ts                     boot: world + engine + ui + loop
src/loop.ts                     fixed-step accumulator (clamped)
src/sim/rng.ts                  seeded RNG (mulberry32)
src/sim/grid.ts                 tiles, building shell, wall edges, passability
src/sim/path.ts                 8-dir A* + string-pull smoothing
src/sim/catalog.ts              RoomDefs, ItemDefs, IllnessDefs, role defs
src/sim/build.ts                room/item placement validation, auto-layout, sell
src/sim/world.ts                World state, commands, tick orchestration, events
src/sim/staff.ts                candidates, hiring, assignment, staff AI
src/sim/patients.ts             spawning, patient AI state machine, needs
src/sim/economy.ts              calendar, fees, salaries, reputation
src/render/engine.ts            renderer, scene, resize, quality presets, auto-res
src/render/post.ts              postprocessing stack
src/render/camera.ts            pan/zoom/rotate controller + picking
src/render/textures.ts          procedural canvas textures + normal maps
src/render/materials.ts         material library
src/render/sky.ts               sky dome, sun/moon, day/night lighting
src/render/exterior.ts          ground, grass blades, trees, road, cars, lamps, ambulance, fountain
src/render/building.ts          floors, walls (two-sided, cutaway), windows, doors
src/render/itemMeshes.ts        procedural meshes for every item + machine animations
src/render/characters.ts        instanced character rig, animation, illness FX, x-ray
src/render/particles.ts         particle pools (confetti, coins, sparks, dust, steam, snow, rain)
src/render/view.ts              syncs sim → scene (rooms, items, characters, events → FX)
src/render/ghost.ts             build previews (room rect, door, item ghosts)
src/ui/ui.css                   chunky "toy-box" UI theme
src/ui/hud.ts                   top bar, toolbar, panels, inspector, toasts, objectives
src/ui/input.ts                 tool modes (select/room/item), keyboard, mouse
src/audio/sfx.ts                WebAudio synthesized sfx + ambient pad
tests/*.test.ts                 Vitest suites for src/sim
scripts/shot.mjs                Playwright screenshot harness (?demo scenarios)
```

## Key Interfaces (shared across tasks)

```ts
// grid.ts
type Dir = 'N'|'E'|'S'|'W';
interface WallEdge { kind: 'outer'|'room'; door: boolean; window: boolean; roomId?: number }
class Grid {
  w: number; h: number;
  building: { x: number; z: number; w: number; h: number; entrance: {x:number; z:number} };
  roomAt: Int32Array;                 // -1 = none
  itemAt: Int32Array;                 // blocking item id or -1
  inside(x,z): boolean; inBuilding(x,z): boolean;
  edgeKey(x,z,dir): string; wall(x,z,dir): WallEdge|undefined;
  setWall(x,z,dir,e|undefined): void;
  canStep(x,z,dx,dz): boolean;        // 8-dir with corner rule
}
// path.ts
findPath(grid, from:{x,z}, to:{x,z}): {x:number;z:number}[] | null  // tile centers, smoothed
// build.ts
validateRoom(world, type, rect, door): { ok: boolean; reason?: string; cost: number }
validateItem(world, itemType, x, z, rot, roomId|null): { ok; reason?; cost }
// world.ts
class World {
  state: WorldState;  // plain JSON-able
  tick(dt: number): void;
  cmd(c: Command): CommandResult;   // buildRoom | placeItem | sellRoom | sellItem | hire | fire | setSpeed | setPriceMult
  drainEvents(): SimEvent[];        // cured, failed, paid, built, toast, …
}
```

`WorldState` holds `money, reputation, time {day, month, year, t}, rooms[], items[], staff[], patients[], candidates{}, stats, nextId, rngState`. Entities: `{ id, x, z, px, pz, path, state, … }` where `px/pz` are positions at the previous tick (renderer interpolates).

## Numbers (pinned for M1; balance pass in Task 12)

- Start money $80,000; game day = 90 s at 1×; month = 5 days; speeds 0/1/2/4.
- Diagnosis threshold 85%. GP adds `30 + 6·skill`%, Scan Lab adds `40 + 5·skill`%. Skill 1–5.
- Treatment success = `clamp(0.55 + 0.07·skill, 0, 0.97) · (0.6 + 0.4·certainty)`.
- Patience 100, drains 1/s waiting standing, 0.6/s seated, −15% near decor; leave at 0.
- Fees: GP $150, Scan $350, treatments $700–$1,800 (per illness) × price multiplier.
- Monthly salary: doctor $2,600+$500·skill, nurse $1,900+$400·skill, assistant $1,300+$300·skill.

---

### Task 1: Scaffold, loop, screenshot harness

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/loop.ts`, `scripts/shot.mjs`, `tests/loop.test.ts`, `.gitignore`.

**Interfaces:** Produces `createLoop(step: (dt:number)=>void, opts:{fixed:number; maxSteps:number}) → { advance(realDt:number, speed:number): number /*alpha*/ }`.

- [ ] Write `tests/loop.test.ts`: `advance(0.1, 1)` with fixed 1/30 runs 3 steps; `advance(10, 4)` runs at most `maxSteps` (8) steps and returns alpha in [0,1) — **Review Focus 5**.
- [ ] Run `npx vitest run` → FAIL (module missing).
- [ ] Implement `src/loop.ts`; drop excess accumulated time when `maxSteps` hit.
- [ ] Run `npx vitest run` → PASS.
- [ ] `scripts/shot.mjs <url> <out.png> [waitMs]` launches Playwright Chromium (`--use-angle=swiftshader` fallback), sets 1600×900, waits for `window.__ready`, screenshots. `npm run shot` works against `vite preview`.
- [ ] Commit.

### Task 2: Grid, building shell, pathfinding

**Files:** Create `src/sim/rng.ts`, `src/sim/grid.ts`, `src/sim/path.ts`, `tests/grid.test.ts`, `tests/path.test.ts`.

**Interfaces:** Produces `Grid` (above), `createLot(): Grid` — lot 48×40, building x 8..35, z 6..27 (28×22), entrance door on the south outer wall at x 21–22, windows every 3rd outer segment except near the entrance; `findPath`.

- [ ] Tests: `canStep` blocked by a wall edge, allowed through a door edge; diagonal blocked if either orthogonal leg crosses a wall; `findPath` routes around a wall through the door; returns `null` for an enclosed target; path from road (24,36) to building center enters via entrance.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 3: Catalog, room/item placement, sell

**Files:** Create `src/sim/catalog.ts`, `src/sim/build.ts`, `tests/build.test.ts`.

**Interfaces:**
- Consumes `Grid`, `findPath`.
- Produces `ROOMS: Record<RoomType, RoomDef>` with `{ name, minW, minH, staff: Role, required: ItemType[], floor: FloorKind, wall: string /*hex*/, baseCost, tileCost, desc }` for `gp, pharmacy, scan, ward, ballast, grounding, sauna`; `ITEMS: Record<ItemType, ItemDef>` with `{ name, w, d, cost, blocking, where: 'corridor'|'room'|'any', use?: {dx,dz,face}, staffSpot?, decor?: number }` (reception, bench, vending, plant, radiator, bin, lamp, cooler, plus each room's machines); `ILLNESSES` with `{ name, room: RoomType, fee, difficulty, fx }` for `heliumLungs→ballast, chromaticFlu→pharmacy, staticCling→grounding, jellylegs→pharmacy, glowbelly→ward, frostbiteFever→sauna`.
- `validateRoom`, `validateItem`, `applyRoom(world, …) → roomId` (sets walls, door, auto-lays required items), `sellRoom(world, id)` (refunds 50%, releases entities), `applyItem`, `sellItem`.

- [ ] Tests: room must be inside building, ≥ min size, not overlap rooms or blocking items; door must face a corridor tile; **Review Focus 1**: a room that cuts the corridor so reception (or an existing room door) is unreachable from the entrance is rejected with reason `"blocks access"`; **Review Focus 4**: insufficient money → `ok:false, reason:"not enough money"`; auto-layout places all required items and leaves the door tile and patient/staff spots free; sell refunds 50% and removes walls.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 4: World, staff, patients, economy

**Files:** Create `src/sim/world.ts`, `src/sim/staff.ts`, `src/sim/patients.ts`, `src/sim/economy.ts`, `tests/flow.test.ts`, `tests/economy.test.ts`.

**Interfaces:**
- Consumes Tasks 2–3.
- Produces `World` (above). `SimEvent = {type:'cured'|'failed'|'paid'|'left'|'built'|'sold'|'hired'|'toast'|'month', …}` with world position where relevant (renderer spawns FX from these). Patient states: `arriving, queueReception, atReception, seekGP, waiting(room), walkingIn, inRoom, toVending, leaving`. Staff states: `idle, toPost, atPost, working`. Patient fields include `illness, certainty, patience, thirst, happiness, visits, nextRoom, seatId?`. `createDemoWorld(): World` builds a showcase hospital (all rooms, staff, ~12 patients) for screenshots.

- [ ] Tests: hired staff walk to an unstaffed matching post; a Chromatic Flu patient in a world with reception+assistant, GP+doctor, pharmacy+nurse is cured within 10 game-minutes and money rises by GP fee + treatment fee; certainty < 85 with no scan lab → returns to GP (max 3 visits) then proceeds; **Review Focus 3**: illness whose room doesn't exist → patient leaves after patience runs out, emits toast naming the room, GP serves the next patient meanwhile; **Review Focus 2**: selling a room mid-treatment releases the patient (re-queued elsewhere or leaving) and the staff member returns to idle; month rollover deducts salaries even below $0; thirsty patient uses a vending machine (+$ and thirst reset); patience 0 → leaves, reputation drops.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 5: Render engine, post stack, sky & lighting

**Files:** Create `src/render/engine.ts`, `src/render/post.ts`, `src/render/camera.ts`, `src/render/sky.ts`, `src/render/textures.ts`, `src/render/materials.ts`.

**Interfaces:** `Engine { renderer; scene; camera; composer; quality: Quality; setQuality(q); render(dt); onResize(); pick(clientX,clientY): {x:number; z:number} | null }`. `Quality = 'ultra'|'high'|'medium'|'low'`; default from GPU string (integrated → high). `Sky.update(timeOfDay: number /*0..1*/)` drives sun/moon light direction, color, intensity, hemisphere, fog, exposure, star visibility, and returns `nightFactor`. Camera: WASD/arrows/edge pan, right-drag pan, wheel zoom (smoothed, clamped), Q/E rotate 90° (smoothed), starts at 45°, pitch ~50°, FOV 30.

Post stack (per quality): N8AO → Bloom (mipmap, luminance threshold ~0.9) → TiltShift → SMAA → tone mapping AgX → hue/sat + brightness/contrast grade → vignette → noise. Auto-resolution: rolling FPS < 45 → render scale −0.1 (floor 0.6), > 58 for 3 s → +0.05.

- [ ] Verify: `npm run shot` with `?demo=sky` (ground plane + test spheres) shows soft shadows, AO, bloom on emissive sphere, tilt-shift blur at top/bottom. Inspect screenshot. Commit.

### Task 6: Exterior and building rendering

**Files:** Create `src/render/exterior.ts`, `src/render/building.ts`.

**Interfaces:** `Exterior(scene, quality) { update(dt, time, wind) }`. `BuildingView(scene, grid) { rebuild(world); setCameraYaw(yaw); update(dt, world) }`. Wall cutaway rule: each wall edge is two half-thickness slabs (one per side, colored by that side's space). A slab is full height if the far side (away from camera) is outside the building, or the near side is a room and the far side corridor; otherwise cut to 0.35 with a cap. Heights animate. Doors swing when an entity is within 1.2 tiles; entrance is sliding glass.

- [ ] Verify via `?demo=1` screenshots at 4 camera yaws and at night: lawn with wind grass blades, trees, road, cars, street lamps, ambulance light bar, fountain; floors per room, cutaway walls, windows with glass and light shafts. Commit.

### Task 7: Item meshes and machine animations

**Files:** Create `src/render/itemMeshes.ts`.

**Interfaces:** `buildItemMesh(type: ItemType): THREE.Object3D` with optional `userData.animate(t, active:boolean)`. Every `ItemType` in the catalog has a mesh. Signature machines: body scanner (rotating ring + scan plane), ballast booth (glass capsule + descending glowing weights), tesla coil (lightning arcs, flicker), sauna heater (glowing coals + steam), ward bed (IV drip + live heart-monitor canvas), GP computer (animated screen), vending machine (glowing panel).

- [ ] Verify `?demo=items` (all items in a grid) screenshot. Commit.

### Task 8: Characters

**Files:** Create `src/render/characters.ts`.

**Interfaces:** `Characters(scene, capacity=256) { sync(world, alpha, time) }`. One `InstancedMesh` per body part (torso, coat, head, eyes, hair styles, arms, legs, nurse cap, belly glow, frost cloud), clearcoat vinyl material, per-instance color. Poses: walk (leg/arm swing, bob, footfall squash), idle (breathe, blink), sit, lie, work. Illness FX: heliumLungs float+inflate, chromaticFlu hue cycle, staticCling spiky hair + sparks, jellylegs wobble, glowbelly emissive orb, frostbiteFever cloud + snow + blue tint. X-ray: a second instanced draw of torso/head with `depthFunc: GreaterDepth` flat rim color so occluded characters show through walls.

- [ ] Verify `?demo=1` close-up screenshot shows staff/patients with distinct roles and illness FX. Commit.

### Task 9: Particles, FX, juice

**Files:** Create `src/render/particles.ts`, `src/render/view.ts`, `src/render/ghost.ts`.

**Interfaces:** `Particles { burst(kind, pos, n, opts?); update(dt) }` for kinds `confetti, coin, sparkle, dust, steam, spark, snow, rain`. `View(engine, world) { sync(alpha, dt); handle(events) }`: cured → confetti + coins + floating "+$X" DOM text + patient hop; built → walls rise with elastic ease + dust; item placed → drop + bounce + dust; failed → grey puff + rain cloud. Weather: rain/snow outdoor emitters by month.

- [ ] Verify screenshot mid-cure in `?demo=1`. Commit.

### Task 10: UI and input

**Files:** Create `src/ui/ui.css`, `src/ui/hud.ts`, `src/ui/input.ts`.

**Interfaces:** Tool modes: `select`, `room(type)` (drag rect → click door edge → confirm), `item(type)` (R rotates), `sell`. HUD: money (ticks), reputation, date, speed (Space, 1/2/3), cured/patients; toolbar: Rooms, Items, Staff, Hospital (price multiplier, finances), Settings (quality). Inspector on click: patient (illness once diagnosed, certainty bar, patience, thoughts), staff (role, skill stars, salary, fire), room (staff, queue, sell). Toasts from sim `toast` events. Objectives panel (starter goals: build reception, hire, GP, pharmacy, cure 10, reach $100k).

- [ ] Verify: play from a fresh world in the browser via screenshots of each panel and a built room. Commit.

### Task 11: Audio

**Files:** Create `src/audio/sfx.ts`.

**Interfaces:** `Sfx { unlock(); play(name: 'click'|'build'|'drop'|'coin'|'cure'|'fail'|'hire'|'error'|'whoosh'); ambient(on:boolean) }` — synthesized with oscillators/noise; volume control in Settings.

- [ ] Verify no console errors; sounds trigger from view events. Commit.

### Task 12: Playtest, balance, performance

- [ ] Run a fresh game at 4× for 3 in-game months via `?autoplay` script hooks; check money/reputation trend is recoverable and patients cure. Adjust Numbers.
- [ ] Measure FPS at High in headed Chromium on this machine; target ≥ 50 fps with demo hospital. Tune presets.
- [ ] Full `npx vitest run` + `npx tsc --noEmit` clean. Commit.
