import { Engine, type Quality } from './render/engine';
import { View } from './render/view';
import { World } from './sim/world';
import { createDemoWorld } from './sim/demo';
import { createLoop } from './loop';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app')!;
const engine = new Engine(app, (params.get('q') as Quality) || undefined);
const demo = params.get('demo');
const world = demo ? createDemoWorld() : new World();
const view = new View(engine, world);
if (params.has('t')) view.todOverride = Number(params.get('t'));
if (params.has('cam')) engine.rig.setView(Number(params.get('cam')));
if (params.has('zoom')) engine.rig.focus(Number(params.get('fx') ?? 22), Number(params.get('fz') ?? 18), Number(params.get('zoom')));

let speed = Number(params.get('speed') ?? 1);
const loop = createLoop((dt) => world.tick(dt), { fixed: 1 / 30, maxSteps: 8 });

let last = performance.now();
let frames = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const alpha = loop.advance(dt, speed);
  world.drainEvents();
  view.frame(dt, alpha);
  engine.render(dt);
  if (++frames === 8) (window as any).__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
(window as any).__info = () => ({ fps: engine.fps.toFixed(1), q: engine.quality, scale: engine.renderScale, calls: engine.renderer.info.render.calls, tris: engine.renderer.info.render.triangles });
(window as any).__speed = (s: number) => { speed = s; };
