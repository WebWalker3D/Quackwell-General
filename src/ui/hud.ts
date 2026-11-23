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
import type { World } from '../sim/world';
import type { Engine, Quality } from '../render/engine';
import { QUALITY_NAMES } from '../render/engine';
import type { Input, Selection } from './input';
import type { SimEvent } from '../sim/events';
import { ILLNESSES, ITEMS, ROLES, ROOMS, roomCost, type ItemType, type Role, type RoomType } from '../sim/catalog';
import { calendar, isNight, MONTH_NAMES, timeOfDay } from '../sim/economy';
import { HIRE_ROLES, signingBonus } from '../sim/staff';
import type { Patient, Staff } from '../sim/state';

const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const stars = (n: number) => `<span class="stars" aria-label="${n} of 5 stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;

const ITEM_ICON: Partial<Record<ItemType, string>> = {
  reception: '🛎️', bench: '🪑', vending: '🥤', cooler: '💧', plant: '🪴', radiator: '♨️', bin: '🗑️', lamp: '💡', cabinet: '🗄️',
};
/** CPAL-1.0 Exhibit B attribution; must stay visible in derived works. */
export const ATTRIBUTION = {
  copyright: '© 2026 Blaine Bouvier',
  phrase: 'Originally created by Blaine Bouvier',
  url: 'https://github.com/WebWalker3D/Quackwell-General',
};
const creditHtml = () =>
  `<p class="credit"><span>${ATTRIBUTION.copyright}</span><span>${ATTRIBUTION.phrase}</span><a href="${ATTRIBUTION.url}" target="_blank" rel="noopener">${ATTRIBUTION.url.replace('https://', '')}</a></p>`;

const ROLE_ICON: Record<Role, string> = { doctor: '🩺', nurse: '💉', assistant: '📋', janitor: '🧹' };

type TrayName = 'rooms' | 'items' | 'staff' | 'hospital' | 'settings';

interface Goal { text: string; done: (w: World) => boolean }
const GOALS: Goal[] = [
  { text: 'Place a Front Desk', done: (w) => w.state.items.some((i) => i.type === 'reception') },
  { text: 'Hire an Assistant for the desk', done: (w) => w.state.staff.some((s) => s.role === 'assistant') },
  { text: 'Build a Consult Room', done: (w) => w.state.rooms.some((r) => r.type === 'gp') },
  { text: 'Hire a Doctor', done: (w) => w.state.staff.some((s) => s.role === 'doctor') },
  { text: 'Build a Dispensary', done: (w) => w.state.rooms.some((r) => r.type === 'pharmacy') },
  { text: 'Hire a Nurse', done: (w) => w.state.staff.some((s) => s.role === 'nurse') },
  { text: 'Put out two benches', done: (w) => w.state.items.filter((i) => i.type === 'bench').length >= 2 },
  { text: 'Cure 10 patients', done: (w) => w.state.stats.cured >= 10 },
  { text: 'Build a Ballast Booth and a Thaw Sauna', done: (w) => ['ballast', 'sauna'].every((t) => w.state.rooms.some((r) => r.type === t)) },
  { text: 'Reach $100,000 in the bank', done: (w) => w.state.money >= 100_000 },
  { text: 'Reach 75 reputation', done: (w) => w.state.reputation >= 75 },
];

export interface HudDeps {
  engine: Engine;
  input: Input;
  getSpeed: () => number;
  setSpeed: (s: number) => void;
  sfx: { play(name: string): void; volume: number; setVolume(v: number): void };
  setWeather: (w: 'clear' | 'rain' | 'snow' | null) => void;
  newGame: () => void;
}

export class Hud {
  private root: HTMLDivElement;
  private el: Record<string, HTMLElement> = {};
  private tray: TrayName | null = null;
  private trayHtml = '';
  private staffTab: Role = 'doctor';
  private shownMoney = 0;
  private inspectorHtml = '';
  private acc = 0;
  private hidden = false;
  showFps = false;

  constructor(private world: World, private d: HudDeps) {
    this.root = document.createElement('div');
    this.root.id = 'ui';
    document.body.appendChild(this.root);
    this.shownMoney = world.state.money;
    this.root.innerHTML = `
      <div class="strip" role="status">
        <div class="seg money"><span class="odo" data-k="money"></span></div>
        <div class="seg" title="Reputation"><span aria-hidden="true">♥</span><div class="rep"><i data-k="rep"></i></div><span data-k="repn"></span></div>
        <div class="seg clock"><span class="sky" data-k="sky"></span><span data-k="day"></span><small data-k="month"></small></div>
        <div class="seg speed" data-k="speed">
          <button data-speed="0" title="Pause (Space)" aria-label="Pause">❚❚</button>
          <button data-speed="1" title="Normal speed (1)" aria-label="Normal speed">▶</button>
          <button data-speed="2" title="Fast (2)" aria-label="Fast">▶▶</button>
          <button data-speed="4" title="Fastest (3)" aria-label="Fastest">▶▶▶</button>
        </div>
        <div class="seg count"><span>🧍 <b data-k="pats"></b></span><span>✨ <b data-k="cured"></b> cured</span></div>
      </div>
      <div class="panel goals" data-k="goals"></div>
      <div class="panel inspector" data-k="inspector" hidden></div>
      <div class="toasts" data-k="toasts"></div>
      <div class="hint" data-k="hint" hidden></div>
      <div class="tray" data-k="tray" hidden></div>
      <nav class="toolbar" aria-label="Build tools">
        ${this.capsule('rooms', '🏥', 'Rooms', '#19a7a0', '#e9fbf8', 'B')}
        ${this.capsule('items', '🪴', 'Items', '#ff5c8a', '#fff0f4', 'N')}
        ${this.capsule('staff', '🧑‍⚕️', 'Staff', '#ffc93c', '#fff8e6', 'H')}
        ${this.capsule('hospital', '📋', 'Hospital', '#7c8cff', '#eef0ff', 'J')}
        ${this.capsule('settings', '⚙️', 'Settings', '#9fb0c4', '#f3f7fb', '')}
        <button class="capsule" data-tool="sell" title="Sell rooms and items (X)" style="--c1:#1d2b4f;--c2:#f3f7fb"><span class="a" style="color:#fff">✂️</span><span class="b">Sell</span></button>
      </nav>
      <div class="fps" data-k="fps" hidden></div>`;
    this.root.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => (this.el[e.dataset.k!] = e));
    this.root.addEventListener('click', (e) => this.click(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    window.addEventListener('keydown', (e) => this.key(e));
    d.input.onToolChange.push(() => this.syncToolButtons());
    d.input.onSelect.push(() => { this.inspectorHtml = ''; this.renderInspector(); });
    d.input.onToast = (t, tone) => this.toast(t, tone);
    this.renderGoals();
  }

  setWorld(w: World) {
    this.world = w;
    this.shownMoney = w.state.money;
    this.closeTray();
    this.renderGoals();
  }

  private capsule(name: TrayName, icon: string, label: string, c1: string, c2: string, key: string) {
    return `<button class="capsule" data-tray="${name}" style="--c1:${c1};--c2:${c2}" aria-pressed="false" title="${label}${key ? ` (${key})` : ''}"><span class="a" aria-hidden="true">${icon}</span><span class="b">${label}${key ? `<kbd>${key}</kbd>` : ''}</span></button>`;
  }

  welcome() {
    const w = document.createElement('div');
    w.className = 'welcome';
    w.innerHTML = `<div class="card" role="dialog" aria-labelledby="wt">
      <h1 id="wt">Quackwell General</h1>
      <p>The town's newest hospital is an empty shell, a fountain and $80,000. Patients are already queuing up with conditions no textbook has heard of.</p>
      <ul>
        <li>Drag with the right mouse button, or use WASD, to move around</li>
        <li>Scroll to zoom; Q and E rotate the view</li>
        <li>Space pauses; 1, 2 and 3 set the speed</li>
        <li>The clipboard on the left lists your first goals</li>
      </ul>
      <button class="btn" data-act="start">Open the doors</button>
      ${creditHtml()}
    </div>`;
    this.root.appendChild(w);
    w.querySelector<HTMLButtonElement>('button')!.focus();
  }

  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    const map: Record<string, TrayName> = { b: 'rooms', n: 'items', h: 'staff', j: 'hospital' };
    if (map[k]) this.toggleTray(map[k]);
    if (k === 'x') this.d.input.setTool(this.d.input.tool.kind === 'sell' ? { kind: 'select' } : { kind: 'sell' });
    if (k === 'escape' && this.tray) this.closeTray();
    if (k === 'p') { this.hidden = !this.hidden; this.root.style.visibility = this.hidden ? 'hidden' : ''; }
  }

  private click(e: MouseEvent) {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button, [data-act]');
    if (!t) return;
    const ds = t.dataset;
    if (ds.speed !== undefined) { this.d.setSpeed(Number(ds.speed)); this.d.sfx.play('click'); }
    if (ds.tray) this.toggleTray(ds.tray as TrayName);
    if (ds.tool === 'sell') { this.d.input.setTool(this.d.input.tool.kind === 'sell' ? { kind: 'select' } : { kind: 'sell' }); this.closeTray(); }
    if (ds.room) { this.d.input.setTool({ kind: 'room', type: ds.room as RoomType }); this.closeTray(); this.d.sfx.play('click'); }
    if (ds.item) { this.d.input.setTool({ kind: 'item', type: ds.item as ItemType, rot: 0 }); this.closeTray(); this.d.sfx.play('click'); }
    if (ds.tab) { this.staffTab = ds.tab as Role; this.renderTray(true); this.d.sfx.play('click'); }
    if (ds.hire) {
      const r = this.world.cmd({ type: 'hire', candidateId: Number(ds.hire) });
      if (r.ok) { this.d.sfx.play('hire'); this.toast('New hire on the way in!', 'good'); }
      else { this.d.sfx.play('error'); this.toast(`Can't hire: ${r.reason}.`, 'bad'); }
      this.renderTray(true);
    }
    if (ds.fire) {
      const st = this.world.staffById(Number(ds.fire));
      const r = this.world.cmd({ type: 'fire', id: Number(ds.fire) });
      if (r.ok && st) this.toast(`${st.name} has cleared out their locker.`, 'info');
      this.renderTray(true);
      this.inspectorHtml = '';
    }
    if (ds.q) { this.d.engine.setQuality(ds.q as Quality); this.renderTray(true); this.toast(`Graphics set to ${QUALITY_NAMES[ds.q as Quality]}.`, 'info'); }
    if (ds.weather) { this.d.setWeather(ds.weather === 'auto' ? null : (ds.weather as 'rain')); this.renderTray(true); }
    if (ds.act === 'autores') { this.d.engine.autoRes = !this.d.engine.autoRes; if (!this.d.engine.autoRes) { this.d.engine.renderScale = 1; this.d.engine.resize(); } this.renderTray(true); }
    if (ds.act === 'fps') { this.showFps = !this.showFps; this.el.fps.hidden = !this.showFps; this.renderTray(true); }
    if (ds.act === 'start') { (t.closest('.welcome') as HTMLElement)?.remove(); this.d.sfx.play('cure'); this.d.setSpeed(1); }
    if (ds.act === 'closeInspector') this.d.input.select(null);
    if (ds.act === 'sell' && ds.id) {
      const kind = ds.kind as 'room' | 'item';
      const r = this.world.cmd(kind === 'room' ? { type: 'sellRoom', id: Number(ds.id) } : { type: 'sellItem', id: Number(ds.id) });
      if (r.ok) { this.d.sfx.play('whoosh'); this.d.input.select(null); }
    }
    if (ds.act === 'goals') this.el.goals.classList.toggle('min');
    if (ds.act === 'newgame') { if (confirm('Start a new hospital? Your current one will be lost.')) this.d.newGame(); }
  }

  private onInput(e: Event) {
    const t = e.target as HTMLInputElement;
    if (t.dataset.price !== undefined) {
      this.world.cmd({ type: 'setPriceMult', value: Number(t.value) / 100 });
      const out = this.root.querySelector('[data-k="priceOut"]');
      if (out) out.textContent = `${t.value}%`;
    }
    if (t.dataset.vol !== undefined) this.d.sfx.setVolume(Number(t.value) / 100);
  }

  toggleTray(name: TrayName) {
    if (this.tray === name) { this.closeTray(); return; }
    this.tray = name;
    if (this.d.input.tool.kind !== 'select') this.d.input.setTool({ kind: 'select' });
    this.renderTray(true);
    this.el.tray.hidden = false;
    this.syncToolButtons();
    this.d.sfx.play('click');
  }

  closeTray() {
    this.tray = null;
    this.el.tray.hidden = true;
    this.syncToolButtons();
  }

  private syncToolButtons() {
    this.root.querySelectorAll<HTMLButtonElement>('[data-tray]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tray === this.tray)));
    const sell = this.root.querySelector<HTMLButtonElement>('[data-tool="sell"]');
    sell?.setAttribute('aria-pressed', String(this.d.input.tool.kind === 'sell'));
  }

  private renderTray(force = false) {
    if (!this.tray) return;
    const s = this.world.state;
    let html = '';
    switch (this.tray) {
      case 'rooms': {
        html = `<h2>Rooms</h2><p class="sub">Pick a room, then drag out its floor in the corridor. Equipment is installed for you.</p><div class="grid">`;
        for (const [k, def] of Object.entries(ROOMS) as [RoomType, (typeof ROOMS)[RoomType]][]) {
          const cost = roomCost(k, def.minW, def.minH);
          html += `<button class="card" data-room="${k}" ${s.money < cost ? 'disabled' : ''}>
            <div class="icon" aria-hidden="true">${def.icon}</div><div class="name">${def.name}</div>
            <div class="meta"><span class="tag cost">from ${money(cost)}</span><span class="tag">${def.minW}×${def.minH}+</span><span class="tag role">${ROLE_ICON[def.staff]} ${ROLES[def.staff].name}</span></div>
            <div class="desc">${def.desc}</div></button>`;
        }
        html += '</div>';
        break;
      }
      case 'items': {
        html = `<h2>Items</h2><p class="sub">Decor makes waiting patients calmer. Drinks earn a little and keep them from storming out.</p><div class="grid">`;
        for (const [k, def] of Object.entries(ITEMS) as [ItemType, (typeof ITEMS)[ItemType]][]) {
          if (!def.buyable) continue;
          html += `<button class="card" data-item="${k}" ${s.money < def.cost ? 'disabled' : ''}>
            <div class="icon" aria-hidden="true">${ITEM_ICON[k] ?? '📦'}</div><div class="name">${def.name}</div>
            <div class="meta"><span class="tag cost">${money(def.cost)}</span>${def.where === 'room' ? '<span class="tag">rooms</span>' : def.where === 'corridor' ? '<span class="tag">corridors</span>' : ''}</div>
            <div class="desc">${def.desc}</div></button>`;
        }
        html += '</div>';
        break;
      }
      case 'staff': {
        const tab = this.staffTab;
        html = `<h2>Staff</h2><p class="sub">Hiring costs a signing bonus of a quarter month's pay. Salaries go out at the end of every month.</p>
          <div class="tabs">${HIRE_ROLES.map((r) => `<button data-tab="${r}" aria-pressed="${r === tab}">${ROLE_ICON[r]} ${ROLES[r].plural}</button>`).join('')}</div><div class="grid">`;
        for (const c of s.candidates.filter((c) => c.role === tab)) {
          const bonus = signingBonus(c.salary);
          html += `<div class="card"><div class="name">${esc(c.name)}</div><div class="meta">${stars(c.skill)}<span class="tag">${esc(c.trait)}</span></div>
            <div class="desc">${money(c.salary)} a month</div>
            <div class="row" style="margin-top:8px"><button class="btn" data-hire="${c.id}" ${s.money < bonus ? 'disabled' : ''}>Hire for ${money(bonus)}</button></div></div>`;
        }
        html += `</div><h2 style="margin-top:16px;font-size:20px">Your team</h2>`;
        const team = s.staff.filter((st) => st.state !== 'leaving');
        if (!team.length) html += `<p class="sub">Nobody yet. Every room needs someone to run it.</p>`;
        for (const st of team) {
          html += `<div class="staffrow"><span>${ROLE_ICON[st.role]} ${esc(st.name)} <small style="color:var(--ink-soft)">${this.staffStatus(st)}</small></span>${stars(st.skill)}<span>${money(st.salary)}/mo</span><button class="btn pink" data-fire="${st.id}">Fire</button></div>`;
        }
        break;
      }
      case 'hospital': {
        const m = s.monthStats, a = s.stats;
        html = `<h2>Hospital</h2><p class="sub">Cheaper treatment brings more patients and builds reputation faster. Pricier treatment earns more per cure.</p>
          <div class="cols"><div>
            <label style="font-weight:800">Treatment prices: <span data-k="priceOut">${Math.round(s.priceMult * 100)}%</span></label>
            <input type="range" min="50" max="200" step="5" value="${Math.round(s.priceMult * 100)}" data-price aria-label="Treatment price">
            <dl class="kv" style="margin-top:14px">
              <dt>Reputation</dt><dd>${Math.round(s.reputation)} / 100</dd>
              <dt>Monthly salaries</dt><dd>${money(s.staff.reduce((x, st) => x + st.salary, 0))}</dd>
              <dt>Patients inside now</dt><dd>${s.patients.length}</dd>
            </dl></div>
            <div><dl class="kv">
              <dt>Earned this month</dt><dd>${money(m.earned)}</dd>
              <dt>Cured this month</dt><dd>${m.cured}</dd>
              <dt>Cured all time</dt><dd>${a.cured}</dd>
              <dt>Treatments failed</dt><dd>${a.failed}</dd>
              <dt>Walked out</dt><dd>${a.left}</dd>
              <dt>Earned all time</dt><dd>${money(a.earned)}</dd>
            </dl></div></div>`;
        break;
      }
      case 'settings': {
        const e = this.d.engine;
        html = `<h2>Settings</h2><p class="sub">Running on ${esc(e.gpuName.replace(/^ANGLE \(|\)$/g, '') || 'your GPU')}. Ultra assumes a dedicated graphics card.</p>
          <div class="cols"><div>
            <div style="font-weight:800;margin-bottom:6px">Graphics</div>
            <div class="tabs">${(['ultra', 'high', 'medium', 'low'] as Quality[]).map((q) => `<button data-q="${q}" aria-pressed="${e.quality === q}">${QUALITY_NAMES[q]}</button>`).join('')}</div>
            <div class="row"><button class="btn quiet" data-act="autores">${e.autoRes ? 'Auto resolution: on' : 'Auto resolution: off'}</button><button class="btn quiet" data-act="fps">${this.showFps ? 'Hide FPS' : 'Show FPS'}</button></div>
            <div style="font-weight:800;margin:14px 0 6px">Weather</div>
            <div class="tabs"><button data-weather="auto">Seasonal</button><button data-weather="clear">Sunny</button><button data-weather="rain">Rain</button><button data-weather="snow">Snow</button></div>
          </div><div>
            <label style="font-weight:800">Sound volume</label>
            <input type="range" min="0" max="100" value="${Math.round(this.d.sfx.volume * 100)}" data-vol aria-label="Sound volume">
            <p class="sub" style="margin-top:12px">Press P to hide the interface for screenshots.</p>
            <button class="btn pink" data-act="newgame">Start a new hospital</button>
          </div></div>
          <div class="about"><b>Quackwell General</b>, licensed under the Common Public Attribution License 1.0.${creditHtml()}</div>`;
        break;
      }
    }
    if (force || html !== this.trayHtml) {
      if (html !== this.trayHtml) {
        this.trayHtml = html;
        this.el.tray.innerHTML = html;
      }
    }
  }

  private patientStatus(p: Patient): string {
    const room = p.target >= 0 ? this.world.room(p.target) : undefined;
    const rn = room ? ROOMS[room.type].name : '';
    switch (p.state) {
      case 'arriving': return 'Heading in through the front doors.';
      case 'queueReception': return p.desk === -1 ? 'Looking for somewhere to check in.' : 'Queuing at the Front Desk.';
      case 'atReception': return 'Checking in.';
      case 'seekRoom': return 'Working out where to go next.';
      case 'waiting': return room ? `Waiting for the ${rn}.` : p.need ? `Waiting for someone to build a ${ROOMS[p.need].name}.` : 'Waiting.';
      case 'toRoom': return `Walking into the ${rn}.`;
      case 'inRoom': return `Being seen in the ${rn}.`;
      case 'toVending': case 'atVending': return 'Grabbing a drink.';
      case 'leaving': return p.cured ? 'Going home cured!' : p.leaveReason === 'impatient' ? 'Storming out after waiting too long.' : 'Going home, still unwell.';
      default: return '';
    }
  }

  private staffStatus(st: Staff): string {
    if (st.state === 'leaving') return 'Leaving for good';
    if (st.state === 'toPost') return 'Heading to work';
    if (st.state === 'atPost') {
      if (st.post < 0) return 'At the Front Desk';
      const r = this.world.room(st.post);
      return r ? (st.busy ? `Treating in the ${ROOMS[r.type].name}` : `Waiting in the ${ROOMS[r.type].name}`) : 'At work';
    }
    return 'Looking for a room to run';
  }

  private bar(label: string, v: number, color: string) {
    const pct = Math.max(0, Math.min(100, v * 100));
    return `<div class="bar">${label}<div class="track"><div class="fill" style="width:${pct.toFixed(0)}%;background:${color}"></div></div></div>`;
  }

  private renderInspector() {
    const sel: Selection = this.d.input.selection;
    const box = this.el.inspector;
    if (!sel) { box.hidden = true; this.inspectorHtml = ''; return; }
    let html = '<button class="close" data-act="closeInspector" aria-label="Close">✕</button>';
    if (sel.kind === 'patient') {
      const p = this.world.patient(sel.id);
      if (!p) { box.hidden = true; return; }
      const ill = ILLNESSES[p.illness];
      html += `<div class="who"><div class="avatar" aria-hidden="true">🤒</div><div><b>${esc(p.name)}</b><span>${p.diagnosed ? ill.name : 'Not diagnosed yet'}</span></div></div>`;
      if (p.diagnosed) html += `<div class="desc" style="font-size:13px;font-weight:600;color:var(--ink-soft)">${ill.desc} Cured in a ${ROOMS[ill.room].name}.</div>`;
      html += this.bar('Diagnosis', p.certainty, '#7c8cff');
      html += this.bar('Patience', p.patience / 100, p.patience < 30 ? '#ff4d6d' : '#24c08a');
      html += this.bar('Thirst', p.thirst / 100, '#3fb6ff');
      html += `<div class="status">${this.patientStatus(p)}</div>`;
    } else if (sel.kind === 'staff') {
      const st = this.world.staffById(sel.id);
      if (!st) { box.hidden = true; return; }
      html += `<div class="who"><div class="avatar" aria-hidden="true">${ROLE_ICON[st.role]}</div><div><b>${esc(st.name)}</b><span>${ROLES[st.role].name}</span></div></div>`;
      html += `<div class="meta">${stars(st.skill)} <span class="tag">${esc(st.trait)}</span></div>`;
      html += `<dl class="kv" style="margin-top:8px"><dt>Salary</dt><dd>${money(st.salary)}/mo</dd></dl>`;
      html += `<div class="status">${this.staffStatus(st)}.</div><button class="btn pink" data-fire="${st.id}">Fire</button>`;
    } else if (sel.kind === 'room') {
      const r = this.world.room(sel.id);
      if (!r) { box.hidden = true; return; }
      const def = ROOMS[r.type];
      const st = r.staffId !== -1 ? this.world.staffById(r.staffId) : undefined;
      html += `<div class="who"><div class="avatar" aria-hidden="true">${def.icon}</div><div><b>${def.name}</b><span>${r.rect.w}×${r.rect.h}</span></div></div>`;
      html += `<dl class="kv"><dt>${ROLES[def.staff].name}</dt><dd>${st ? esc(st.name) : 'Nobody'}</dd><dt>Queue</dt><dd>${r.queue.length}</dd><dt>Inside</dt><dd>${r.occupants.length}</dd></dl>`;
      html += `<div class="status">${st ? def.desc : `Hire a ${ROLES[def.staff].name} to open this room.`}</div>`;
      html += `<button class="btn quiet" data-act="sell" data-kind="room" data-id="${r.id}">Sell for ${money(r.cost / 2)}</button>`;
    } else {
      const it = this.world.item(sel.id);
      if (!it) { box.hidden = true; return; }
      const def = ITEMS[it.type];
      html += `<div class="who"><div class="avatar" aria-hidden="true">${ITEM_ICON[it.type] ?? '📦'}</div><div><b>${def.name}</b><span>${it.roomId === -1 ? 'Corridor' : 'Room'}</span></div></div>`;
      html += `<div class="status">${def.desc}</div>`;
      if (it.type === 'reception') html += `<dl class="kv"><dt>In line</dt><dd>${it.queue.length}</dd></dl>`;
      html += `<button class="btn quiet" data-act="sell" data-kind="item" data-id="${it.id}">Sell for ${money(it.cost / 2)}</button>`;
    }
    if (html !== this.inspectorHtml) {
      this.inspectorHtml = html;
      box.innerHTML = html;
    }
    box.hidden = false;
  }

  private renderGoals() {
    const s = this.world.state;
    let html = `<button class="collapse" data-act="goals" aria-label="Collapse goals">–</button><h3>First things first</h3><ul>`;
    let shown = 0;
    GOALS.forEach((g, i) => {
      const done = !!s.hints[`goal:${i}`];
      if (done || shown < 6) {
        html += `<li class="${done ? 'done' : ''}"><span class="box" aria-hidden="true">${done ? '✓' : ''}</span>${g.text}</li>`;
        if (!done) shown++;
      }
    });
    html += '</ul>';
    if (this.el.goals.innerHTML !== html) this.el.goals.innerHTML = html;
  }

  private checkGoals() {
    const s = this.world.state;
    GOALS.forEach((g, i) => {
      if (s.hints[`goal:${i}`]) return;
      if (g.done(this.world)) {
        s.hints[`goal:${i}`] = s.t || 1;
        this.toast(`Goal complete: ${g.text}`, 'good');
        this.d.sfx.play('goal');
      }
    });
    this.renderGoals();
  }

  toast(text: string, tone: 'info' | 'warn' | 'good' | 'bad' = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${tone}`;
    t.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${esc(text)}</span>`;
    t.setAttribute('role', 'status');
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstElementChild!.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 5200);
  }

  handle(events: SimEvent[]) {
    for (const e of events) {
      if (e.type === 'toast') this.toast(e.text, e.tone);
      if (e.type === 'month') this.toast(`Payday: ${money(e.salaries)} in salaries went out. Welcome to ${e.label}.`, 'info');
    }
  }

  update(dt: number) {
    const s = this.world.state;
    const k = 1 - Math.exp(-7 * dt);
    this.shownMoney += (s.money - this.shownMoney) * k;
    if (Math.abs(s.money - this.shownMoney) < 1) this.shownMoney = s.money;
    this.el.money.textContent = money(this.shownMoney);
    this.el.money.parentElement!.classList.toggle('neg', s.money < 0);
    (this.el.rep as HTMLElement).style.width = `${s.reputation.toFixed(0)}%`;
    this.el.repn.textContent = String(Math.round(s.reputation));
    const cal = calendar(s.t);
    const tod = timeOfDay(s.t);
    const hour = Math.floor(tod * 24), min = Math.floor((tod * 24 * 60) % 60 / 15) * 15;
    this.el.sky.textContent = isNight(s.t) ? '🌙' : tod < 0.3 || tod > 0.78 ? '🌅' : '☀️';
    this.el.day.textContent = `Day ${cal.day}`;
    this.el.month.textContent = `${MONTH_NAMES[cal.month]} Y${cal.year}, ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    this.el.pats.textContent = String(s.patients.length);
    this.el.cured.textContent = String(s.stats.cured);
    const sp = this.d.getSpeed();
    this.el.speed.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === sp)));
    const input = this.d.input;
    this.el.hint.hidden = !input.hintText || !!this.tray;
    if (input.hintText && this.el.hint.dataset.html !== input.hintText) {
      this.el.hint.dataset.html = input.hintText;
      this.el.hint.innerHTML = input.hintText;
    }
    this.el.hint.classList.toggle('bad', input.hintBad);
    this.acc += dt;
    if (this.acc > 0.25) {
      this.acc = 0;
      this.renderInspector();
      this.checkGoals();
      if (this.tray) this.renderTray();
      if (this.showFps) this.el.fps.textContent = `${this.d.engine.fps.toFixed(0)} fps, ${QUALITY_NAMES[this.d.engine.quality]}, ${Math.round(this.d.engine.renderScale * 100)}% resolution`;
    }
  }
}
