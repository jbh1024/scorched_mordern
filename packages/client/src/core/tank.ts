import { TANK } from '@scorched/shared';
import type { TankStatus, TerrainMask } from '@scorched/shared';
import { degToRad, clamp } from '@scorched/shared';

export class Tank {
  readonly id: string;
  readonly playerId: string;
  name: string;
  readonly isBot: boolean;
  x: number;
  y: number;
  hp: number;
  angle: number;       // 포탑 각도 (도, 0~180)
  bodyAngle: number;   // 본체 기울기 (라디안, 지형 경사)
  color: number;
  fuel: number;
  status: TankStatus;

  constructor(id: string, playerId: string, color: number, name: string, isBot = false) {
    this.id = id;
    this.playerId = playerId;
    this.name = name;
    this.isBot = isBot;
    this.x = 0;
    this.y = 0;
    this.hp = TANK.HP;
    this.angle = 90;
    this.bodyAngle = 0;
    this.color = color;
    this.fuel = TANK.FUEL_PER_TURN;
    this.status = 'alive';
  }

  /** 지형 위에 탱크를 배치한다 (표면 스냅 + 기울기 계산) */
  placeOnTerrain(xPos: number, terrain: TerrainMask): void {
    this.x = xPos;
    const surfaceY = terrain.getSurfaceY(Math.floor(xPos));
    this.y = surfaceY - TANK.HEIGHT;
    this.updateBodyAngle(terrain);
  }

  /** 본체 기울기를 지형 경사에 맞게 갱신 */
  updateBodyAngle(terrain: TerrainMask): void {
    const leftY = terrain.getSurfaceY(Math.floor(this.x));
    const rightY = terrain.getSurfaceY(Math.floor(this.x + TANK.WIDTH));
    this.bodyAngle = Math.atan2(rightY - leftY, TANK.WIDTH);
  }

  /** 좌우 이동 (fuel 소비, 지형 추적). 이동한 거리를 반환. */
  move(direction: -1 | 1, terrain: TerrainMask, dt: number): number {
    if (this.fuel <= 0 || this.status === 'buried') return 0;

    const speed = 100; // px/s
    const distance = Math.min(speed * dt, this.fuel);
    const nextX = this.x + direction * distance;

    // 월드 경계 체크
    if (nextX < 0 || nextX + TANK.WIDTH >= terrain.width) return 0;

    // 경사 체크
    const currentY = terrain.getSurfaceY(Math.floor(nextX + TANK.WIDTH / 2));
    const prevY = terrain.getSurfaceY(Math.floor(this.x + TANK.WIDTH / 2));
    const slope = Math.abs(Math.atan2(currentY - prevY, distance));
    if (slope > degToRad(TANK.MAX_CLIMB_ANGLE)) return 0;

    this.fuel -= distance;
    this.placeOnTerrain(nextX, terrain);
    return distance;
  }

  /** 턴 시작 시 fuel 리셋 */
  resetFuel(): void {
    this.fuel = TANK.FUEL_PER_TURN;
  }

  /** 포탑 각도를 변경한다 (0~180도 범위) */
  adjustAngle(delta: number): void {
    this.angle = clamp(this.angle + delta, 0, 180);
  }

  get angleRad(): number {
    return degToRad(this.angle);
  }

  /** 포탑 끝 좌표 (렌더링용) */
  getTurretEnd(turretLength: number): { x: number; y: number } {
    const rad = this.angleRad;
    return {
      x: this.x + TANK.WIDTH / 2 + Math.cos(rad) * turretLength,
      y: this.y - Math.sin(rad) * turretLength,
    };
  }

  /** 포탄 발사 원점 (포탑 끝) */
  getFireOrigin(): { x: number; y: number } {
    return this.getTurretEnd(TANK.WIDTH * 0.8);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.status = 'dead';
    }
  }

  get isAlive(): boolean {
    return this.status !== 'dead';
  }
}
