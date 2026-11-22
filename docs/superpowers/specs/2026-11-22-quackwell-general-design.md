# Quackwell General — Design

Date: 2026-11-22
Status: approved in conversation ("go")

## Intent

An original, long-play hospital management sim in the same genre as
Theme/Two Point Hospital, with the visuals pushed as far over the top as a
browser can go. The owner wants something to sink hours into, and wants it
to look spectacular while doing it.

Original IP only: own name, own illnesses, own characters, own look. Nothing
copied from Two Point Hospital (no names, illnesses, characters, art, music,
UI layout).

## Goals

- A deep management loop: build and furnish rooms, hire and manage staff,
  diagnose and cure patients with silly original illnesses, manage money.
- Long-term play: research unlocks, staff training, events (emergencies,
  epidemics), yearly awards, a campaign of hospitals with 1–3 star goals,
  plus a sandbox. Autosave.
- Over-the-top visuals: a glossy toy-diorama look — vinyl-toy characters
  with squash and stretch, tilt-shift miniature camera, PBR materials,
  soft shadows, ambient occlusion, bloom, reflective floors, color grading,
  day/night cycle through windows, weather outside, particle bursts on
  every satisfying event (cures, cash, construction).

## Non-goals

- Multiplayer, accounts, servers.
- Licensed or downloaded art assets. Everything is generated in code.
- Mobile/touch as a first-class target (desktop browser with mouse).

## Anti-goals (failure even if it "works")

- Looks like a programmer-art prototype. Every interaction gets juice.
- Shallow: a loop you've seen everything of in 10 minutes.
- Unplayably slow on the owner's laptop (integrated Radeon "Barcelo").
- Anything that reads as a reskin of Two Point Hospital.

## Constraints

- Owner's machine: Linux laptop, AMD integrated GPU. Must run smoothly at
  the "High" preset there; "Ultra" may assume a discrete GPU.
- Browser, WebGL2. Node 22 available for tooling.
- Builder must be able to verify visuals via headless Chromium screenshots.

## Approaches considered

1. **Three.js + TypeScript + Vite (picked).** Full control of a stacked
   post-processing pipeline (pmndrs `postprocessing` + N8AO), instancing,
   custom shaders. Runs in any browser. Builder can screenshot with
   Playwright to check visuals every step.
2. **Godot 4** (installed). Stronger built-in rendering (SDFGI, volumetric
   fog), but the builder would be tuning visuals it cannot easily see, so
   polish would be slower and blinder. Rejected.
3. **Babylon.js.** Similar to Three.js with more built in; no real advantage
   here, smaller ecosystem. Rejected.

Owner handed over the "how"; approach 1 is the builder's call.

## The game

### Core loop
Patients arrive → reception → GP office (diagnosis builds certainty) →
optional diagnostic rooms to raise certainty → treatment room for their
illness → cured (pay) or failed treatment. Patients have needs (thirst,
hunger, toilet, boredom, warmth) and patience; unhappy or waiting too long →
they leave (lost revenue, reputation hit).

### Building
- Hospital sits on a tile grid within purchasable plots.
- Rooms are dragged out as rectangles, get a door, must contain required
  items, can take decor (plants, posters, radiators, lamps).
- Corridor items: benches, vending machines, bins, radiators, plants.
- Walls rise with a bouncy animation; items drop in with dust puffs.

### Staff
Doctors, nurses, assistants, janitors. Each has skill level, traits,
salary, energy, happiness. They rest in the staff room, can be trained
(milestone 2). Janitors clean litter, water plants, fix machines.

### Illnesses (original)
Each illness: diagnosis difficulty, treatment room, base price, visual
effect on the patient. Starting set (more unlocked over the campaign):
- **Helium Lungs** — patient floats a little off the ground, bobbing.
  Cure: Ballast Booth.
- **Chromatic Flu** — skin cycles through rainbow hues. Cure: Pharmacy.
- **Static Cling** — hair on end, crackling sparks. Cure: Grounding Room.
- **Jellylegs** — wobbly walk. Cure: Pharmacy.
- **Glowbelly** — stomach glows like a lantern. Cure: Ward (nurses).
- **Frostbite Fever** — tiny snow cloud above head. Cure: Thaw Sauna.
- **Echo-itis** — speech bubbles repeat. Cure: Psychiatry (milestone 2).
- **Backwards Walking** — walks in reverse. Cure: Psychiatry (milestone 2).

### Economy
Treatment prices (global multiplier), salaries monthly, build/item costs,
loans, monthly finance report. Reputation affects arrivals.

### Long-term (milestones 2–3)
Research lab unlocks illnesses/rooms/items; training room; emergencies
(group of patients, time limit, bonus); epidemics; VIP visits; year-end
awards; campaign of 4–6 hospitals with star goals; sandbox; autosave +
save slots in localStorage.

## Visual design ("glossy toy diorama")

- Camera: orthographic-feeling perspective (narrow FOV, high angle),
  smooth pan/zoom/rotate in 90° steps, tilt-shift depth of field.
- Lighting: sun/moon directional with soft shadows, hemisphere fill,
  PMREM environment for reflections, warm interior point lights at night,
  day/night cycle with sky gradient shader.
- Post stack: N8AO ambient occlusion, bloom on emissives, tilt-shift DoF,
  SMAA, color grading (warm vibrant), vignette, subtle grain.
- Materials: procedurally generated canvas textures (tiles, wood, carpet,
  wallpaper) with normal maps; glossy clearcoat on toys and machines.
- Characters: built from rounded primitives, vinyl clearcoat, big heads,
  blinking eyes, procedural walk cycles, squash and stretch, illness
  effects layered on top.
- Particles: instanced GPU particles — confetti and coins on cure, sparks,
  dust, steam, snow, rain outside, dust motes in light.
- Exterior: lawn with grass, trees swaying in wind, road, lamp posts,
  weather.
- UI: distinctive, chunky, tactile HTML/CSS overlay (not generic glass);
  money counter ticks, toasts, room build menu with live preview.
- Quality presets: Ultra / High / Medium / Low, with auto-downscale of
  render resolution if FPS drops.

## Architecture (builder's call, recorded)

- `src/sim/` — pure, deterministic simulation (grid, rooms, entities,
  pathfinding, AI, economy). No three.js imports. Unit-tested with Vitest.
- `src/render/` — three.js scene, materials, post stack, characters,
  particles. Reads sim state each frame and interpolates.
- `src/ui/` — HTML overlay, input → sim commands.
- Fixed-tick sim (e.g. 10 ticks/sec game time, speed multiplier), render at
  display rate.

## Milestones

1. **Vertical slice:** one hospital plot, full visual pipeline, building
   rooms/items, reception/GP/pharmacy/ward/2 treatment rooms, staff hiring,
   patients flowing through the full cure loop, money, speed controls.
2. **Depth:** training, research, staff room/needs, janitors and
   cleanliness, events, more illnesses, save/load.
3. **Campaign:** multiple hospitals with star goals, unlocks, sandbox,
   balancing, awards.

## Left to the builder

Exact numbers/balancing, art details, file layout within the above split,
UI layout specifics.
