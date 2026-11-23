import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './ui/ui.css';
import type * as THREE from 'three';
import { Vector3 } from 'three';
import { Engine, type Quality } from './render/engine';
import { View } from './render/view';
import { World } from './sim/world';
import { createDemoWorld } from './sim/demo';
import { createLoop } from './loop';
import { ITEMS, type ItemType } from './sim/catalog';
import { buildItemMesh } from './render/itemMeshes';
import { placeObject } from './render/itemsView';
import { Ghost } from './render/ghost';
import { Input } from './ui/input';
import { Hud } from './ui/hud';
import { Sfx } from './audio/sfx';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app')!;
const engine = new Engine(app, (params.get('q') as Quality) || undefined);
const demo = params.get('demo');
const world = demo === '1' ? createDemoWorld() : new World();
const overlay = document.createElement('div');
overlay.id = 'overlay';
document.body.appendChild(overlay);
const view = new View(engine, world, overlay);
if (params.has('grass')) view.exterior.setGrass(Number(params.get('grass')));
if (params.has('shadow')) engine.sky.configureShadow(Number(params.get('shadow')));
if (params.has('weather')) view.weatherOverride = params.get('weather') as 'rain';
if (params.has('t')) view.todOverride = Number(params.get('t'));
if (params.has('cam')) engine.rig.setView(Number(params.get('cam')));
if (params.has('zoom')) engine.rig.focus(Number(params.get('fx') ?? 22), Number(params.get('fz') ?? 18), Number(params.get('zoom')));

const galleryObjs: THREE.Object3D[] = [];
if (demo === 'items') {
  (Object.keys(ITEMS) as ItemType[]).forEach((type, i) => {
    const o = buildItemMesh(type);
    placeObject(o, { type, x: 11 + (i % 7) * 3.5, z: 9 + Math.floor(i / 7) * 4, rot: 0 });
    o.userData.anim = { active: true, night: 0, level: 1 };
    galleryObjs.push(o);
    engine.scene.add(o);
  });
  engine.rig.focus(22, 13, 26);
}

const sfx = new Sfx();
const ghost = new Ghost(engine.scene);
const input = new Input(engine, world, ghost);
let speed = params.has('speed') ? Number(params.get('speed')) : demo ? 1 : 0;
let lastSpeed = 1;
const setSpeed = (s: number) => { if (s > 0) lastSpeed = s; speed = s; };
input.onSpeedKey = (s) => setSpeed(s === 'toggle' ? (speed > 0 ? 0 : lastSpeed) : s);
input.onSfx = (n) => sfx.play(n);
const hud = new Hud(world, {
  engine, input, sfx,
  getSpeed: () => speed,
  setSpeed: (s) => setSpeed(s),
  setWeather: (w) => { view.weatherOverride = w; },
  newGame: () => location.reload(),
});
if (!demo && !params.has('nowelcome')) hud.welcome();
if (params.has('tray')) hud.toggleTray(params.get('tray') as 'rooms');
if (params.has('tool')) input.setTool({ kind: 'room', type: params.get('tool') as 'gp' });
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
window.addEventListener('keydown', () => sfx.unlock(), { once: true });

const loop = createLoop((dt) => world.tick(dt), { fixed: 1 / 30, maxSteps: 8 });
let last = performance.now();
let frames = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const alpha = loop.advance(dt, speed);
  const events = world.drainEvents();
  view.handle(events);
  hud.handle(events);
  sfx.handle(events);
  view.frame(dt, alpha);
  for (const o of galleryObjs) o.userData.animate?.(view.time, dt, o.userData.anim);
  input.update(view.time);
  hud.update(dt);
  engine.render(dt);
  if (++frames === 8) (window as any).__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
(window as any).__info = () => ({ fps: engine.fps.toFixed(1), q: engine.quality, scale: engine.renderScale, patients: world.state.patients.length, money: world.state.money });
(window as any).__speed = setSpeed;
(window as any).__sfx = sfx;
(window as any).__engine = engine;
(window as any).__input = input;
(window as any).__world = world;
(window as any).__screenOf = (x: number, z: number, y = 0) => {
  const v = new Vector3(x + 0.5, y, z + 0.5).project(engine.camera);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
};
