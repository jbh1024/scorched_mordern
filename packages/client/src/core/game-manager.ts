import { GAME } from '@scorched/shared';
import type { TerrainMask, Point } from '@scorched/shared';
import { Tank } from './tank.js';
import { Projectile, STANDARD_SHELL, predictTrajectory } from './projectile.js';
import type { ProjectileConfig } from './projectile.js';

// --- Constants ---

const CHARGE_RATE = 60;           // %/s (약 1.7초에 100%)
const PREVIEW_POWER_PCT = 50;     // 차징 전 궤적 프리뷰 파워 (%)
const ANGLE_STEP = 2;             // 프레임당 각도 조절량 (도)

// --- Game State ---

export type GameState = 'player_action' | 'charging' | 'projectile_flight' | 'turn_end' | 'game_over';

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
  power: number;       // 0~100 (차징 중 증가)
  readonly wind: number;
  private hasFired: boolean; // 이번 턴에 발사했는지 (발사 후 이동 불가)
  currentWeapon: ProjectileConfig;

  constructor(tanks: Tank[], terrain: TerrainMask, colorData: Uint8Array) {
    this.state = 'player_action';
    this.currentPlayerIndex = 0;
    this.tanks = tanks;
    this.terrain = terrain;
    this.colorData = colorData;
    this.projectile = null;
    this.power = 0;
    this.wind = 0;
    this.hasFired = false;
    this.currentWeapon = STANDARD_SHELL;
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

  // --- 입력: 이동 (좌/우 방향키) ---

  moveTank(direction: -1 | 1, dt: number): void {
    if (this.state !== 'player_action' || this.hasFired) return;
    this.currentTank.move(direction, this.terrain, dt);
  }

  // --- 입력: 각도 (상/하 방향키) ---

  adjustAngle(delta: number): void {
    if (this.state !== 'player_action') return;
    this.currentTank.adjustAngle(delta * ANGLE_STEP);
  }

  // --- 입력: Space 차징 시작 ---

  startCharging(): void {
    if (this.state !== 'player_action') return;
    this.power = 0;
    this.state = 'charging';
  }

  // --- 입력: Space 릴리즈 → 발사 ---

  releaseAndFire(): void {
    if (this.state !== 'charging') return;
    this.fire();
  }

  // --- 입력: 무기 변경 (E 키) ---

  cycleWeapon(): void {
    if (this.state !== 'player_action') return;
    // Phase 1: Standard Shell만 → 향후 인벤토리 순환
    this.currentWeapon = STANDARD_SHELL;
  }

  // --- 궤적 예측 ---

  getTrajectoryPreview(): Point[] {
    if (this.state !== 'player_action' && this.state !== 'charging') return [];

    const tank = this.currentTank;
    const origin = tank.getFireOrigin();
    const previewPower = this.state === 'charging'
      ? (this.power / 100) * GAME.MAX_POWER
      : (PREVIEW_POWER_PCT / 100) * GAME.MAX_POWER;

    return predictTrajectory(
      origin.x, origin.y,
      tank.angleRad, previewPower,
      this.wind, this.terrain,
    );
  }

  // --- 프레임 업데이트 ---

  update(dt: number): GameEvent[] {
    const events: GameEvent[] = [];

    if (this.state === 'charging') {
      this.power = Math.min(100, this.power + CHARGE_RATE * dt);
      if (this.power >= 100) {
        this.fire(); // 100% 도달 시 자동 발사
      }
    }

    if (this.state === 'projectile_flight' && this.projectile) {
      this.updateProjectile(dt, events);
    }

    return events;
  }

  private fire(): void {
    const tank = this.currentTank;
    const origin = tank.getFireOrigin();
    const actualPower = (this.power / 100) * GAME.MAX_POWER;

    this.projectile = new Projectile(
      origin.x, origin.y,
      tank.angleRad, actualPower,
      this.currentWeapon, tank.id,
    );

    this.hasFired = true;
    this.state = 'projectile_flight';
  }

  private updateProjectile(dt: number, events: GameEvent[]): void {
    const projectile = this.projectile!;

    projectile.update(dt, this.wind);
    projectile.updateOriginCheck(this.currentTank);

    let hit = false;
    for (const tank of this.tanks) {
      if (projectile.checkTankCollision(tank)) { hit = true; break; }
    }
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

    const hpBefore = new Map(this.tanks.map(t => [t.id, t.hp]));
    projectile.explode(this.terrain, this.colorData, this.tanks);
    events.push({ type: 'explosion', x: cx, y: cy, radius });

    for (const tank of this.tanks) {
      const prevHp = hpBefore.get(tank.id)!;
      if (tank.hp < prevHp) {
        events.push({ type: 'damage', tankId: tank.id, amount: prevHp - tank.hp, newHp: tank.hp });
      }
      if (prevHp > 0 && tank.hp <= 0) {
        events.push({ type: 'kill', tankId: tank.id });
      }
    }

    for (const tank of this.tanks) {
      if (tank.isAlive) tank.placeOnTerrain(tank.x, this.terrain);
    }

    this.projectile = null;
    this.advanceTurn(events);
  }

  private advanceTurn(events: GameEvent[]): void {
    const alive = this.tanks.filter(t => t.isAlive);

    if (alive.length <= 1) {
      this.state = 'game_over';
      const winnerId = alive.length === 1 ? alive[0]!.id : null;
      events.push({ type: 'game_over', winnerId });
      return;
    }

    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.tanks.length;
    } while (!this.currentTank.isAlive);

    this.power = 0;
    this.hasFired = false;
    this.currentTank.resetFuel();
    this.state = 'player_action';
    events.push({ type: 'turn_change', playerIndex: this.currentPlayerIndex });
  }
}
