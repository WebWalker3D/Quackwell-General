import type { Dir, Grid } from './grid';
import type { Pt } from './path';
import type { IllnessType, ItemType, Pose, Role, RoomType } from './catalog';
import type { RngState } from './rng';

export interface Rect { x: number; z: number; w: number; h: number }
/** door tile is inside the room on its perimeter; dir points out of the room */
export interface DoorSpec { x: number; z: number; dir: Dir }

export interface Room {
  id: number;
  type: RoomType;
  rect: Rect;
  door: DoorSpec;
  items: number[];
  staffId: number;
  /** patients currently being served (or walking in) */
  occupants: number[];
  queue: number[];
  cost: number;
  builtAt: number;
}

export interface Item {
  id: number;
  type: ItemType;
  x: number;
  z: number;
  rot: number;
  roomId: number;
  /** per spot index: entity id that reserved it, or -1 */
  claims: number[];
  /** reception desks: patient ids in line, front first */
  queue: number[];
  cost: number;
  builtAt: number;
}

export interface Mover {
  id: number;
  x: number;
  z: number;
  px: number;
  pz: number;
  /** facing angle in radians (0 = +z) */
  face: number;
  path: Pt[];
  pathI: number;
  /** final destination of the current path (re-pathed when the grid changes) */
  dest: Pt | null;
  pathVer: number;
  speed: number;
  pose: Pose;
  /** item+spot this mover currently holds */
  spot: { item: number; idx: number } | null;
  name: string;
  look: number;
}

export type StaffState = 'idle' | 'toPost' | 'atPost' | 'leaving';
export interface Staff extends Mover {
  role: Role;
  skill: number;
  salary: number;
  trait: string;
  state: StaffState;
  /** room id or, for receptionists, -(item id) - 1 */
  post: number;
  busy: boolean;
  hiredAt: number;
}

export type PatientState =
  | 'arriving' | 'toReception' | 'queueReception' | 'atReception'
  | 'seekRoom' | 'waiting' | 'toRoom' | 'inRoom'
  | 'toVending' | 'atVending' | 'leaving' | 'gone';

export interface Patient extends Mover {
  illness: IllnessType;
  diagnosed: boolean;
  certainty: number;
  patience: number;
  thirst: number;
  happiness: number;
  gpVisits: number;
  scans: number;
  state: PatientState;
  /** room type the patient needs next */
  need: RoomType | null;
  /** room the patient is heading to / queued at, -1 if none exists yet */
  target: number;
  /** reception desk item id while checking in, else -1 */
  desk: number;
  /** remaining service seconds while being served */
  timer: number;
  cured: boolean;
  leaveReason: string;
  thought: string;
  waitedFor: number;
  arrivedAt: number;
}

export interface Candidate { id: number; role: Role; name: string; skill: number; salary: number; trait: string; look: number }

export interface Stats { cured: number; failed: number; left: number; visits: number; earned: number; spent: number }

export interface WorldState {
  money: number;
  reputation: number;
  /** total game seconds elapsed */
  t: number;
  priceMult: number;
  rooms: Room[];
  items: Item[];
  staff: Staff[];
  patients: Patient[];
  candidates: Candidate[];
  stats: Stats;
  monthStats: Stats;
  nextId: number;
  rng: RngState;
  spawnTimer: number;
  lastMonth: number;
  hints: Record<string, number>;
}

export interface Ctx { state: WorldState; grid: Grid }

export function emptyStats(): Stats {
  return { cured: 0, failed: 0, left: 0, visits: 0, earned: 0, spent: 0 };
}

export function createState(seed = 1): WorldState {
  return {
    money: 80000,
    reputation: 50,
    t: 0,
    priceMult: 1,
    rooms: [],
    items: [],
    staff: [],
    patients: [],
    candidates: [],
    stats: emptyStats(),
    monthStats: emptyStats(),
    nextId: 1,
    rng: { s: seed },
    spawnTimer: 4,
    lastMonth: 0,
    hints: {},
  };
}
