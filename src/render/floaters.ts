import * as THREE from 'three';

interface Floater { el: HTMLDivElement; pos: THREE.Vector3; age: number; life: number; rise: number }

/** Floating DOM labels anchored to world positions (+$ amounts, diagnoses, moods). */
export class Floaters {
  private root: HTMLDivElement;
  private list: Floater[] = [];
  private v = new THREE.Vector3();

  constructor(container: HTMLElement, private camera: THREE.Camera) {
    this.root = document.createElement('div');
    this.root.className = 'floaters';
    container.appendChild(this.root);
  }

  add(text: string, pos: THREE.Vector3, cls = 'money', life = 1.8) {
    const el = document.createElement('div');
    el.className = `floater ${cls}`;
    el.textContent = text;
    this.root.appendChild(el);
    this.list.push({ el, pos: pos.clone(), age: 0, life, rise: 1.2 });
    if (this.list.length > 40) this.kill(this.list.shift()!);
  }

  private kill(f: Floater) {
    f.el.remove();
  }

  update(dt: number) {
    const w = innerWidth, h = innerHeight;
    this.list = this.list.filter((f) => {
      f.age += dt;
      if (f.age >= f.life) { this.kill(f); return false; }
      const t = f.age / f.life;
      this.v.copy(f.pos);
      this.v.y += f.rise * (1 - (1 - t) * (1 - t));
      this.v.project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
      const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.55 : t < 0.22 ? 1.15 - ((t - 0.12) / 0.1) * 0.15 : 1;
      f.el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${pop.toFixed(3)})`;
      f.el.style.opacity = String(t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
      f.el.style.display = this.v.z > 1 ? 'none' : '';
      return true;
    });
  }
}
