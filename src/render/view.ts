import * as THREE from 'three';
import type { Engine } from './engine';
import type { World } from '../sim/world';
import { Exterior } from './exterior';
import { BuildingView } from './building';
import { timeOfDay } from '../sim/economy';
import { ItemsView } from './itemsView';

/** Owns every scene object derived from the simulation and keeps it in sync each frame. */
export class View {
  readonly exterior: Exterior;
  readonly building: BuildingView;
  readonly items: ItemsView;
  time = 0;
  private started = false;
  todOverride: number | null = null;

  constructor(readonly engine: Engine, public world: World) {
    this.exterior = new Exterior(engine.scene, engine.preset);
    this.building = new BuildingView(engine.scene, engine.preset);
    this.items = new ItemsView(engine.scene);
    engine.rig.onYawStep = (q) => this.building.setQuadrant(q);
    this.building.setQuadrant(engine.rig.quadrant());
    engine.onQualityChange.push(() => this.exterior.setGrass(engine.preset.grass));
  }

  frame(dt: number, alpha: number) {
    this.time += dt;
    const tod = this.todOverride ?? timeOfDay(this.world.state.t);
    const night = this.engine.sky.update(tod, this.time);
    this.exterior.update(dt, this.time, night);
    this.building.update(dt, this.world, this.engine.sky.sunDir, this.engine.sky.daylight, night);
    this.items.sync(this.world, this.started);
    this.items.update(dt, this.time, this.world, night);
    this.started = true;
    void alpha;
    void THREE;
  }
}
