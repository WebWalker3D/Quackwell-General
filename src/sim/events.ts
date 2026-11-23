import type { IllnessType, ItemType, RoomType } from './catalog';
import type { DoorSpec, Rect } from './state';

export type SimEvent =
  | { type: 'cured'; id: number; x: number; z: number; fee: number }
  | { type: 'failed'; id: number; x: number; z: number }
  | { type: 'paid'; amount: number; x: number; z: number; label: string }
  | { type: 'left'; id: number; reason: string }
  | { type: 'arrived'; id: number }
  | { type: 'diagnosed'; id: number; illness: IllnessType }
  | { type: 'built'; kind: 'room' | 'item'; id: number }
  | { type: 'sold'; kind: 'room' | 'item'; id: number; refund: number; x: number; z: number }
  | { type: 'hired'; id: number }
  | { type: 'fired'; id: number }
  | { type: 'service'; roomId: number; patientId: number; phase: 'start' | 'end' }
  | { type: 'toast'; text: string; tone: 'info' | 'warn' | 'good' | 'bad' }
  | { type: 'month'; salaries: number; label: string };

export type Command =
  | { type: 'buildRoom'; room: RoomType; rect: Rect; door: DoorSpec }
  | { type: 'placeItem'; item: ItemType; x: number; z: number; rot: number }
  | { type: 'sellRoom'; id: number }
  | { type: 'sellItem'; id: number }
  | { type: 'hire'; candidateId: number }
  | { type: 'fire'; id: number }
  | { type: 'setPriceMult'; value: number };

export interface CommandResult { ok: boolean; reason?: string; id?: number }
