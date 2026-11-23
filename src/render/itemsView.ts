import * as THREE from 'three';
import type { World } from '../sim/world';
import type { Item } from '../sim/state';
import { rotatedSize } from '../sim/build';
import { buildItemMesh, updateSharedItemFx, type AnimState, type Animate, type Emitter } from './itemMeshes';

const ROT_ANGLE = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

interface Rec {
  id: number;
  obj: THREE.Group;
  anim?: Animate;
  emitters: Emitter[];
  state: AnimState;
  drop: number;
  baseY: number;
}

export function placeObject(obj: THREE.Object3D, item: Pick<Item, 'type' | 'x' | 'z' | 'rot'>) {
  const sz = rotatedSize(item.type, item.rot);
  obj.position.set(item.x + sz.w / 2, 0, item.z + sz.d / 2);
  obj.rotation.y = ROT_ANGLE[item.rot % 4];
}

/** Keeps one mesh per sim item; drives machine animations from room activity. */
export class ItemsView {
  readonly group = new THREE.Group();
  private recs = new Map<number, Rec>();
  /** called for each emitter each frame so the particle system can spawn */
  onEmit: ((kind: Emitter['kind'], world: THREE.Vector3, rate: number, dt: number) => void) | null = null;
  onLanded: ((x: number, z: number) => void) | null = null;
  private tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  sync(world: World, animateNew: boolean) {
    const seen = new Set<number>();
    for (const it of world.state.items) {
      seen.add(it.id);
      if (this.recs.has(it.id)) continue;
      const obj = buildItemMesh(it.type);
      placeObject(obj, it);
      this.group.add(obj);
      const rec: Rec = {
        id: it.id, obj, anim: obj.userData.animate, emitters: obj.userData.emitters,
        state: { active: false, night: 0, level: 0 }, drop: animateNew ? 1 : 0, baseY: 0,
      };
      if (animateNew) obj.position.y = 3;
      this.recs.set(it.id, rec);
    }
    for (const [id, rec] of this.recs) {
      if (seen.has(id)) continue;
      this.group.remove(rec.obj);
      rec.obj.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      this.recs.delete(id);
    }
  }

  update(dt: number, t: number, world: World, night: number) {
    updateSharedItemFx(t, night);
    const busyRooms = new Set<number>();
    for (const p of world.state.patients) if (p.state === 'inRoom' && p.target >= 0) busyRooms.add(p.target);
    for (const it of world.state.items) {
      const rec = this.recs.get(it.id);
      if (!rec) continue;
      const active = it.roomId !== -1 ? busyRooms.has(it.roomId) : it.claims.some((c) => c !== -1 && world.patient(c)?.state === 'atVending');
      rec.state.active = active;
      rec.state.night = night;
      rec.state.level += ((active ? 1 : 0) - rec.state.level) * (1 - Math.exp(-4 * dt));
      rec.anim?.(t, dt, rec.state);
      if (rec.drop > 0) {
        // drop in from above with a bounce
        rec.drop = Math.max(0, rec.drop - dt * 2.2);
        const p = 1 - rec.drop;
        const bounce = p < 0.6 ? 3 * (1 - (p / 0.6) ** 2) : Math.abs(Math.sin((p - 0.6) * Math.PI * 2.5)) * 0.25 * (1 - p) * 2.5;
        rec.obj.position.y = bounce;
        const squash = p > 0.55 && p < 0.75 ? 1 - Math.sin(((p - 0.55) / 0.2) * Math.PI) * 0.18 : 1;
        rec.obj.scale.set(2 - squash, squash, 2 - squash);
        if (rec.drop === 0) {
          rec.obj.position.y = 0;
          rec.obj.scale.set(1, 1, 1);
        }
        if (p >= 0.6 && p - dt * 2.2 < 0.6) this.onLanded?.(rec.obj.position.x, rec.obj.position.z);
      }
      if (this.onEmit) {
        for (const e of rec.emitters) {
          if (e.whenActive && rec.state.level < 0.3) continue;
          this.tmp.copy(e.at);
          rec.obj.localToWorld(this.tmp);
          this.onEmit(e.kind, this.tmp, e.rate * (e.whenActive ? rec.state.level : 1), dt);
        }
      }
    }
  }
}
