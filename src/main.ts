import * as THREE from 'three';
import { Engine, type Quality } from './render/engine';
import { vinyl, glow, floorMat, plastic, metal } from './render/materials';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app')!;
const engine = new Engine(app, (params.get('q') as Quality) || undefined);
const demo = params.get('demo') ?? '';
let tod = params.has('t') ? Number(params.get('t')) : 0.45;

if (demo === 'sky') {
  const g = new THREE.PlaneGeometry(60, 60);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 10);
  const ground = new THREE.Mesh(g, floorMat('grass'));
  ground.position.set(22, 0, 18);
  ground.receiveShadow = true;
  engine.scene.add(ground);
  const tg = new THREE.PlaneGeometry(10, 10);
  tg.rotateX(-Math.PI / 2);
  const tuv = tg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) * 5, tuv.getY(i) * 5);
  const tiles = new THREE.Mesh(tg, floorMat('corridor'));
  tiles.position.set(22, 0.01, 18);
  tiles.receiveShadow = true;
  engine.scene.add(tiles);
  const cols = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff'];
  cols.forEach((c, i) => {
    const m = vinyl().clone();
    m.color.set(c);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 48, 24), m);
    s.position.set(18 + i * 2, 0.6, 18);
    s.castShadow = s.receiveShadow = true;
    engine.scene.add(s);
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 16), glow('#ffb347', 6));
  orb.position.set(22, 2, 21);
  engine.scene.add(orb);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 0.3), plastic('#f3dcb8', 0.6, 0.2));
  box.position.set(22, 1.2, 15);
  box.castShadow = box.receiveShadow = true;
  engine.scene.add(box);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3), metal('#ccd'));
  pole.position.set(25, 1.5, 20);
  pole.castShadow = true;
  engine.scene.add(pole);
  engine.rig.focus(22, 18, 22);
}

let last = performance.now();
let frames = 0;
let time = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;
  engine.sky.update(tod, time);
  engine.render(dt);
  if (++frames === 5) (window as any).__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
(window as any).__info = () => ({ fps: engine.fps.toFixed(1), q: engine.quality, scale: engine.renderScale, gpu: engine.gpuName });
(window as any).__setTod = (t: number) => { tod = t; };
