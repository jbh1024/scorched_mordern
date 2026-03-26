// --- Game State ---

export type GamePhase =
  | 'init_round'
  | 'turn_start'
  | 'player_action'
  | 'projectile_flight'
  | 'terrain_settle'
  | 'turn_end'
  | 'round_end'
  | 'shop_phase';

export type TankStatus = 'alive' | 'buried' | 'dead';

export interface Point {
  x: number;
  y: number;
}

export interface TankState {
  id: string;
  playerId: string;
  x: number;
  y: number;
  hp: number;
  angle: number;
  color: number;
  fuel: number;
  status: TankStatus;
  inventory: WeaponSlot[];
}

export interface WeaponSlot {
  weaponId: string;
  quantity: number;
}

// --- Network Messages ---

export type ClientMessage =
  | { type: 'fire'; angle: number; power: number; weaponId: string }
  | { type: 'move'; direction: 'left' | 'right'; distance: number }
  | { type: 'buy'; weaponId: string; quantity: number }
  | { type: 'ready' };

export type ServerMessage =
  | { type: 'turn_start'; playerId: string; wind: number }
  | { type: 'fire_result'; trajectory: Point[]; impacts: Impact[] }
  | { type: 'terrain_update'; explosions: Explosion[] }
  | { type: 'damage'; tankId: string; amount: number; newHp: number }
  | { type: 'kill'; tankId: string; killerId: string }
  | { type: 'round_end'; results: RoundResult }
  | { type: 'game_end'; winnerId: string };

export interface Explosion {
  x: number;
  y: number;
  radius: number;
}

export interface Impact {
  x: number;
  y: number;
  damage: number;
  tankId?: string;
}

export interface RoundResult {
  winnerId: string;
  kills: Record<string, number>;
  goldEarned: Record<string, number>;
}

// --- Room Options ---

export interface RoomOptions {
  name: string;
  password?: string;
  maxPlayers: number;
  aiSlots: number;
  aiDifficulty: AIDifficulty;
  rounds: number;
  mapTheme: MapTheme;
}

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'brutal';

export type MapTheme = 'grassland' | 'desert' | 'arctic' | 'volcano' | 'moon' | 'random';
