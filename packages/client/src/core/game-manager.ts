import { GAME } from '@scorched/shared';
import type { TerrainMask, Point } from '@scorched/shared';
import { Tank } from './tank.js';
import { Projectile, STANDARD_SHELL, predictTrajectory } from './projectile.js';
import type { ProjectileConfig } from './projectile.js';
import { AIController } from '../ai/ai-controller.js';
import type { AIDifficulty } from '../ai/ai-controller.js';

// --- Constants ---

const CHARGE_RATE = 60;           // %/s (약 1.7초에 100%)
const PREVIEW_POWER_PCT = 50;     // 차징 전 궤적 프리뷰 파워 (%)
const ANGLE_STEP = 2;             // 프레임당 각도 조절량 (도)
const AI_THINK_TIME = 0.8;        // AI 사고 딜레이 (초)
const AI_CHARGE_SPEED = 80;       // AI 차징 속도 (%/s, 플레이어보다 빠름)

// --- Game State ---

export type GameState = 'player_action' | 'charging' | 'ai_thinking' | 'ai_charging' | 'projectile_flight' | 'turn_end' | 'game_over';

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
  power: number;
  readonly wind: number;
  private hasFired: boolean;
  currentWeapon: ProjectileConfig;

  // AI
  private aiControllers: Map<string, AIController> = new Map();
  private aiThinkTimer: number = 0;
  private aiTargetAngle: number = 90;
  private aiTargetPower: number = 50;

  constructor(tanks: Tank[], terrain: TerrainMask, colorData: Uint8Array, aiDifficulty: AIDifficulty = 'normal') {
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

    // 봇 탱크에 AI 컨트롤러 생성
    for (const tank of tanks) {
      if (tank.isBot) {
        this.aiControllers.set(tank.id, new AIController(aiDifficulty));
      }
    }

    // 첫 턴이 봇이면 AI 사고 시작
    if (this.currentTank.isBot) {
      this.startAITurn();
    }
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

  // --- 플레이어 입력 ---

  moveTank(direction: -1 | 1, dt: number): void {
    if (this.state !== 'player_action' || this.hasFired) return;
    if (this.currentTank.isBot) return;
    this.currentTank.move(direction, this.terrain, dt);
  }

  adjustAngle(delta: number): void {
    if (this.state !== 'player_action') return;
    if (this.currentTank.isBot) return;
    this.currentTank.adjustAngle(delta * ANGLE_STEP);
  }

  startCharging(): void {
    if (this.state !== 'player_action') return;
    if (this.currentTank.isBot) return;
    this.power = 0;
    this.state = 'charging';
  }

  releaseAndFire(): void {
    if (this.state !== 'charging') return;
    this.fire();
  }

  cycleWeapon(): void {
    if (this.state !== 'player_action') return;
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

  // --- AI 턴 ---

  private startAITurn(): void {
    const tank = this.currentTank;
    const ai = this.aiControllers.get(tank.id);
    if (!ai) return;

    const target = ai.pickTarget(tank, this.tanks);
    if (!target) {
      // 타겟 없음 → 스킵
      this.advanceTurn([]);
      return;
    }

    const shot = ai.computeShot(tank, target, this.terrain, this.wind);
    this.aiTargetAngle = shot.angle;
    this.aiTargetPower = shot.power;
    this.aiThinkTimer = AI_THINK_TIME;
    this.state = 'ai_thinking';
  }

  private updateAI(dt: number): void {
    if (this.state === 'ai_thinking') {
      this.aiThinkTimer -= dt;
      if (this.aiThinkTimer <= 0) {
        // 각도 설정 → 차징 시작
        this.currentTank.angle = this.aiTargetAngle;
        this.power = 0;
        this.state = 'ai_charging';
      }
    }

    if (this.state === 'ai_charging') {
      this.power = Math.min(this.aiTargetPower, this.power + AI_CHARGE_SPEED * dt);
      if (this.power >= this.aiTargetPower) {
        this.power = this.aiTargetPower;
        this.fire();
      }
    }
  }

  // --- 프레임 업데이트 ---

  update(dt: number): GameEvent[] {
    const events: GameEvent[] = [];

    // AI 턴 처리
    if (this.state === 'ai_thinking' || this.state === 'ai_charging') {
      this.updateAI(dt);
    }

    // 플레이어 차징
    if (this.state === 'charging') {
      this.power = Math.min(100, this.power + CHARGE_RATE * dt);
      if (this.power >= 100) {
        this.fire();
      }
    }

    // 포탄 비행
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

    // 봇이면 AI 턴 시작, 아니면 플레이어 턴
    if (this.currentTank.isBot) {
      this.startAITurn();
    } else {
      this.state = 'player_action';
    }
    events.push({ type: 'turn_change', playerIndex: this.currentPlayerIndex });
  }
}
