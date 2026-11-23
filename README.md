# Quackwell General

A hospital management sim with toy-box graphics. You build rooms, hire staff and cure the town of illnesses
no textbook has heard of, all inside a glossy miniature diorama rendered in real time in your browser.

![The hospital at work on a sunny afternoon](docs/images/hospital-day.jpg)

## What's in it

**The game**

- Drag out rooms in the corridor and the equipment installs itself. There are seven rooms, from the Consult Room to the Grounding Room and its lightning coil.
- Hire doctors, nurses and assistants, each with a skill rating, a trait and a monthly salary.
- Patients check in at the front desk, see a doctor until they're diagnosed, then head to the right treatment room.
- Six original illnesses: Helium Lungs, Chromatic Flu, Static Cling, Jellylegs, Glowbelly and Frostbite Fever. New ones turn up as the months go by.
- Queues, benches, thirst, patience, decor, treatment prices, reputation and payday at the end of each month. Neglect any of them and patients storm out.

**The graphics**

- Vinyl-toy characters, shown in the hundreds through instanced rendering, with walk cycles, blinking, expressions and an effect for each illness.
- A day/night cycle with soft shadows, bloom, tilt-shift depth of field, color grading and seasonal rain and snow.
- Wind-blown grass and trees, road traffic, a working fountain and an ambulance with flashing lights.
- Walls cut away automatically as you rotate the camera, and characters show as silhouettes behind them.
- Confetti, spinning coins and floating cash on every cure. Room walls spring up and furniture drops in with a bounce.
- Every texture, model and sound is generated in code, with no downloaded assets. That includes a background tune that composes itself.

| | |
|---|---|
| ![A ward and the ballast booth up close](docs/images/closeup.jpg) | ![The hospital at night](docs/images/hospital-night.jpg) |
| ![Looking north over the entrance](docs/images/north-view.jpg) | ![The welcome screen](docs/images/welcome.jpg) |

## Playing

You need Node.js 20 or newer and a browser with WebGL 2.

```bash
npm install
npm run dev
```

Then open the address it prints, usually http://localhost:5173.

| Action | Control |
|---|---|
| Pan | Right-drag, middle-drag, WASD or arrow keys |
| Zoom | Mouse wheel |
| Rotate the view | Q / E |
| Pause, speeds | Space, 1, 2, 3 |
| Rooms, Items, Staff, Hospital | B, N, H, J |
| Sell tool | X |
| Rotate an item before placing it | R |
| Sell the selected room or item | Delete (twice for rooms) |
| Hide the interface | P |

### Graphics settings

Settings has four presets. The game picks High on integrated graphics and Ultra on dedicated cards. Ultra
adds screen-space ambient occlusion, 4K shadow maps and about 70,000 grass blades. On every preset the
render resolution drops automatically if the frame rate falls below 45 fps; you can switch this off.

## Development

```bash
npm test           # simulation tests (Vitest)
npm run typecheck
npm run build      # typecheck and production bundle in dist/
```

The simulation in `src/sim` is plain TypeScript with no rendering code. It runs on a fixed 1/30 s step and
is covered by the tests. `src/render` reads the simulation state each frame and owns everything you see. `src/ui`
turns clicks and keys into simulation commands. Balance numbers live together in `BALANCE` in
`src/sim/catalog.ts`.

The scripts in `scripts/` drive a real GPU-backed Chromium through Playwright:

- `node scripts/shot.mjs <url> <out.png>` takes a screenshot
- `node scripts/play.mjs` plays a short game through the interface
- `node scripts/perf.mjs <url> 1920x1080` measures frame rate

These URL flags are handy with them:

| Flag | Effect |
|---|---|
| `?demo=1` | A busy showcase hospital |
| `?demo=items` | Every item side by side |
| `&t=0.95` | Night |
| `&weather=rain` or `&weather=snow` | Force the weather |
| `&cam=0` to `&cam=3` | Camera angle |
| `&q=ultra`, `high`, `medium` or `low` | Graphics preset |
| `&ui=0` | Hide the interface |

## Roadmap

- **Milestone 2:** staff training, research, staff needs and janitors, emergencies and epidemics, saving and loading.
- **Milestone 3:** a campaign of hospitals with star goals, unlocks, a sandbox mode, and yearly awards.

## License

Quackwell General is licensed under the [Common Public Attribution License 1.0](LICENSE) (CPAL-1.0).

The CPAL is the Mozilla Public License 1.1 with two additions:

- **Attribution:** anything built from this code, including larger works that contain it, must display the
  attribution in Exhibit B each time it starts. The game already shows it on the welcome screen and in Settings.

  > © 2026 Blaine Bouvier. Originally created by Blaine Bouvier. https://github.com/WebWalker3D/Quackwell-General

- **Network use:** letting other people use a modified version over a network counts as distribution, so you
  must make your source code available.
