import { GAME } from '@scorched/shared';
import type { TerrainMask, Point } from '@scorched/shared';
import { clamp } from '@scorched/shared';
import { Tank } from './tank.js';
import { Projectile, STANDARD_SHELL, predictTrajectory } from './projectile.js';

// --- Game State ---

export type GameState = 'player_action' | 'projectile_flight' | 'turn_end' | 'game_over';

// --- Game Events ---

export type GameEvent =
  | { type: 'explosion'; x: number; y: number; radius: number }
  | { type: 'damage'; tankId: string; amount: number; newHp: number }
  | { type: 'kill'; tankId: string }
  | { type: 'turn_change'; playerIndex: number }
  | { type: 'game_over'; winnerId: string | null };

// --- GameManager ---

export class GameManager {
  state: GameState;
  currentPlayerIndex: number;
  readonly tanks: Tank[];
  readonly terrain: TerrainMask;
  readonly colorData: Uint8Array;
  projectile: Projectile | null;
  power: number; // 0~100
  readonly wind: number;

  constructor(tanks: Tank[], terrain: TerrainMask, colorData: Uint8Array) {
    this.state = 'player_action';
    this.currentPlayerIndex = 0;
    this.tanks = tanks;
    this.terrain = terrain;
    this.colorData = colorData;
    this.projectile = null;
    this.power = 50;
    this.wind = 0; // Phase 1: 바람 없음
  }

  get currentTank(): Tank {
    return this.tanks[this.currentPlayerIndex]!;
  }

  get isGameOver(): boolean {
    return this.state === 'game_over';
  }

  get winner(): Tank | null {
    const alive = this.tanks.filter(t => t.isAlive);
    return alive.length === 1 ? alive[0]! : null;
  }

  // --- 입력 ---

  adjustAngle(delta: number): void {
    if (this.state !== 'player_action') return;
    this.currentTank.adjustAngle(delta);
  }

  adjustPower(delta: number): void {
    if (this.state !== 'player_action') return;
    this.power = clamp(this.power + delta, 0, 100);
  }

  fire(): void {
    if (this.state !== 'player_action') return;

    const tank = this.currentTank;
    const origin = tank.getFireOrigin();
    const actualPower = (this.power / 100) * GAME.MAX_POWER;

    this.projectile = new Projectile(
      origin.x,
      origin.y,
      tank.angleRad,
      actualPower,
      STANDARD_SHELL,
      tank.id,
    );

    this.state = 'projectile_flight';
  }

  // --- 궤적 예측 ---

  getTrajectoryPreview(): Point[] {
    if (this.state !== 'player_action') return [];

    const tank = this.currentTank;
    const origin = tank.getFireOrigin();
    const actualPower = (this.power / 100) * GAME.MAX_POWER;

    return predictTrajectory(
      origin.x, origin.y,
      tank.angleRad, actualPower,
      this.wind, this.terrain,
    );
  }

  // --- 프레임 업데이트 ---

  update(dt: number): GameEvent[] {
    const events: GameEvent[] = [];

    if (this.state === 'projectile_flight' && this.projectile) {
      this.updateProjectile(dt, events);
    }

    return events;
  }

  private updateProjectile(dt: number, events: GameEvent[]): void {
    const projectile = this.projectile!;

    projectile.update(dt, this.wind);
    projectile.updateOriginCheck(this.currentTank);

    // 충돌 체크: 탱크
    let hit = false;
    for (const tank of this.tanks) {
      if (projectile.checkTankCollision(tank)) {
        hit = true;
        break;
      }
    }

    // 충돌 체크: 지형
    if (!hit && projectile.checkTerrainCollision(this.terrain)) {
      hit = true;
    }

    if (hit) {
      this.handleExplosion(projectile, events);
    } else if (projectile.isOutOfBounds()) {
      projectile.expire();
      this.projectile = null;
      this.advanceTurn(events);
    }
  }

  private handleExplosion(projectile: Projectile, events: GameEvent[]): void {
    const cx = Math.floor(projectile.x);
    const cy = Math.floor(projectile.y);
    const radius = projectile.config.explosionRadius;

    // 폭발 전 HP 기록 (데미지/킬 이벤트용)
    const hpBefore = new Map(this.tanks.map(t => [t.id, t.hp]));

    projectile.explode(this.terrain, this.colorData, this.tanks);

    events.push({ type: 'explosion', x: cx, y: cy, radius });

    // 데미지/킬 이벤트 생성
    for (const tank of this.tanks) {
      const prevHp = hpBefore.get(tank.id)!;
      if (tank.hp < prevHp) {
        events.push({ type: 'damage', tankId: tank.id, amount: prevHp - tank.hp, newHp: tank.hp });
      }
      if (prevHp > 0 && tank.hp <= 0) {
        events.push({ type: 'kill', tankId: tank.id });
      }
    }

    // 탱크 재배치
    for (const tank of this.tanks) {
      if (tank.isAlive) tank.placeOnTerrain(tank.x, this.terrain);
    }

    this.projectile = null;
    this.advanceTurn(events);
  }

  private advanceTurn(events: GameEvent[]): void {
    // 승패 판정
    const alive = this.tanks.filter(t => t.isAlive);

    if (alive.length <= 1) {
      this.state = 'game_over';
      const winnerId = alive.length === 1 ? alive[0]!.id : null;
      events.push({ type: 'game_over', winnerId });
      return;
    }

    // 다음 생존 플레이어
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.tanks.length;
    } while (!this.currentTank.isAlive);

    this.power = 50;
    this.state = 'player_action';
    events.push({ type: 'turn_change', playerIndex: this.currentPlayerIndex });
  }
}
