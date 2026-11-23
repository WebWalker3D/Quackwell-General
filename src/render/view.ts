/*
 * The contents of this file are subject to the Common Public Attribution License
 * Version 1.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * https://github.com/WebWalker3D/Quackwell-General/blob/main/LICENSE. The License is
 * based on the Mozilla Public License Version 1.1 but Sections 14 and 15 have been
 * added to cover use of software over a computer network and provide for limited
 * attribution for the Original Developer. In addition, Exhibit A has been modified
 * to be consistent with Exhibit B.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 *
 * The Original Code is Quackwell General.
 * The Initial Developer of the Original Code is Blaine Bouvier. All portions of the
 * code written by Blaine Bouvier are Copyright (c) 2026. All Rights Reserved.
 */
import * as THREE from 'three';
import type { Engine } from './engine';
import type { World } from '../sim/world';
import { Exterior } from './exterior';
import { BuildingView } from './building';
import { calendar, timeOfDay } from '../sim/economy';
import { ItemsView } from './itemsView';
import { Characters } from './characters';
import { Particles, type PKind } from './particles';
import { Floaters } from './floaters';
import type { SimEvent } from '../sim/events';
import { ILLNESSES, ROOMS } from '../sim/catalog';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Owns every scene object derived from the simulation and keeps it in sync each frame. */
export class View {
  readonly exterior: Exterior;
  readonly building: BuildingView;
  readonly items: ItemsView;
  readonly chars: Characters;
  readonly particles: Particles;
  readonly floaters: Floaters;
  time = 0;
  todOverride: number | null = null;
  weather = { rain: 0, snow: 0, target: 'clear' as 'clear' | 'rain' | 'snow', next: 40 };
  weatherOverride: 'clear' | 'rain' | 'snow' | null = null;
  onEvent: ((e: SimEvent) => void)[] = [];
  private started = false;
  private v = new THREE.Vector3();

  constructor(readonly engine: Engine, public world: World, overlay: HTMLElement) {
    this.exterior = new Exterior(engine.scene, engine.preset);
    this.building = new BuildingView(engine.scene, engine.preset);
    this.items = new ItemsView(engine.scene);
    this.chars = new Characters(engine.scene);
    this.particles = new Particles(engine.scene, engine.preset.particles);
    this.floaters = new Floaters(overlay, engine.camera);
    engine.rig.onYawStep = (q) => this.building.setQuadrant(q);
    this.building.setQuadrant(engine.rig.quadrant());
    engine.onQualityChange.push(() => this.exterior.setGrass(engine.preset.grass));
    this.items.onEmit = (kind, p, rate, dt) => this.particles.emit(`${kind}:${p.x.toFixed(1)},${p.z.toFixed(1)}`, kind as PKind, p, rate, dt);
    this.items.onLanded = (x, z) => { this.particles.dustRing(x, z, 16, 0.5); this.engine.rig.shake(0.12); };
    this.chars.onEmit = (kind, p, rate, dt) => this.particles.emit(`c:${kind}:${p.x.toFixed(0)},${p.z.toFixed(0)}`, kind, p, rate, dt, kind === 'snow' ? 0.35 : 0.25);
  }

  private posOf(id: number) {
    const m = this.world.patient(id) ?? this.world.staffById(id);
    return m ? this.v.set(m.x, 0, m.z).clone() : null;
  }

  handle(events: SimEvent[]) {
    for (const e of events) {
      for (const f of this.onEvent) f(e);
      switch (e.type) {
        case 'cured': {
          this.chars.celebrate(e.id);
          const p = new THREE.Vector3(e.x, 0, e.z);
          this.particles.celebrate(p, 7);
          this.floaters.add(`+${fmt(e.fee)}`, p.clone().setY(2.2), 'money big', 2.2);
          this.floaters.add('CURED!', p.clone().setY(2.9), 'cured', 1.6);
          break;
        }
        case 'failed': {
          this.chars.slump(e.id);
          const p = new THREE.Vector3(e.x, 0, e.z);
          this.particles.puff(p, 16);
          this.floaters.add('Treatment failed', p.clone().setY(2.3), 'bad', 2);
          break;
        }
        case 'paid': {
          const p = new THREE.Vector3(e.x, 0, e.z);
          if (e.amount >= 100) this.particles.coinPop(p, 2);
          this.floaters.add(`+${fmt(e.amount)}`, p.clone().setY(2), e.amount >= 100 ? 'money' : 'money small', 1.5);
          break;
        }
        case 'diagnosed': {
          const p = this.posOf(e.id);
          if (p) {
            this.floaters.add(`${ILLNESSES[e.illness].name}!`, p.setY(2.4), 'diag', 1.8);
            this.particles.sparkleBurst(p.clone().setY(1.6), 14, new THREE.Color('#c58bff'));
          }
          break;
        }
        case 'left': {
          const p = this.posOf(e.id);
          if (p) this.floaters.add('😤', p.setY(2.2), 'mood', 1.4);
          break;
        }
        case 'hired': {
          const p = this.posOf(e.id);
          if (p) this.particles.sparkleBurst(p.setY(1), 24);
          break;
        }
        case 'built':
          if (e.kind === 'room') {
            const r = this.world.room(e.id);
            if (r) {
              const { x, z, w, h } = r.rect;
              for (let i = 0; i < w; i++) { this.particles.dustRing(x + i + 0.5, z, 3, 0.1); this.particles.dustRing(x + i + 0.5, z + h, 3, 0.1); }
              for (let i = 0; i < h; i++) { this.particles.dustRing(x, z + i + 0.5, 3, 0.1); this.particles.dustRing(x + w, z + i + 0.5, 3, 0.1); }
              this.particles.sparkleBurst(new THREE.Vector3(x + w / 2, 1.2, z + h / 2), 40, new THREE.Color(ROOMS[r.type].accent));
              this.engine.rig.shake(0.25);
            }
          }
          break;
        case 'sold': {
          const p = new THREE.Vector3(e.x, 0, e.z);
          this.particles.puff(p.clone().setY(-0.5), 20);
          this.particles.coinPop(p, 4);
          this.floaters.add(`+${fmt(e.refund)}`, p.setY(2), 'money', 1.6);
          break;
        }
      }
    }
  }

  private updateWeather(dt: number) {
    const w = this.weather;
    w.next -= dt;
    if (w.next <= 0) {
      const month = calendar(this.world.state.t).month;
      const winter = month === 11 || month <= 1;
      const r = Math.random();
      w.target = winter ? (r < 0.55 ? 'snow' : 'clear') : r < 0.3 ? 'rain' : 'clear';
      w.next = 50 + Math.random() * 70;
    }
    const target = this.weatherOverride ?? w.target;
    const k = 1 - Math.exp(-0.4 * dt);
    w.rain += ((target === 'rain' ? 1 : 0) - w.rain) * k;
    w.snow += ((target === 'snow' ? 1 : 0) - w.snow) * k;
    if (this.weatherOverride) { w.rain = target === 'rain' ? 1 : w.rain; w.snow = target === 'snow' ? 1 : w.snow; }
    const c = this.engine.rig.target;
    const b = this.world.grid.building;
    const spawnOutside = (kind: PKind, rate: number) => {
      let n = rate * dt;
      while (n > 0) {
        if (n < 1 && Math.random() > n) break;
        n -= 1;
        const x = c.x + (Math.random() - 0.5) * 60, z = c.z + (Math.random() - 0.5) * 50;
        if (x > b.x - 0.2 && x < b.x + b.w + 0.2 && z > b.z - 0.2 && z < b.z + b.h + 0.2) continue;
        this.particles.spawn(kind, this.v.set(x, kind === 'rain' ? 6 + Math.random() * 3 : 4 + Math.random() * 3, z), kind === 'rain' ? new THREE.Vector3(0.6, -10, 0.2) : new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.6, (Math.random() - 0.5) * 0.4));
      }
    };
    const budget = this.engine.preset.particles / 2500;
    if (w.rain > 0.02) spawnOutside('rain', 700 * w.rain * budget);
    if (w.snow > 0.02) spawnOutside('snow', 260 * w.snow * budget);
    this.engine.sky.overcast = Math.max(w.rain, w.snow * 0.7);
  }

  frame(dt: number, alpha: number) {
    this.time += dt;
    const tod = this.todOverride ?? timeOfDay(this.world.state.t);
    const night = this.engine.sky.update(tod, this.time);
    this.exterior.update(dt, this.time, night);
    this.building.update(dt, this.world, this.engine.sky.sunDir, this.engine.sky.daylight, night);
    this.items.sync(this.world, this.started);
    this.items.update(dt, this.time, this.world, night);
    this.chars.sync(this.world, alpha, dt, this.time);
    this.updateWeather(dt);
    // fountain spray
    for (let i = 0; i < 2; i++) {
      if (Math.random() > dt * 45) continue;
      const a = Math.random() * Math.PI * 2;
      this.particles.spawn('water', this.v.set(13.5, 1.55, 30.5), new THREE.Vector3(Math.cos(a) * 0.9, 2.2 + Math.random() * 0.5, Math.sin(a) * 0.9));
    }
    this.particles.update(dt);
    this.floaters.update(dt);
    this.started = true;
  }
}
