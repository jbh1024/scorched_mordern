import { TANK } from '@scorched/shared';
import type { TankStatus, TerrainMask } from '@scorched/shared';
import { degToRad, clamp } from '@scorched/shared';

export class Tank {
  readonly id: string;
  readonly playerId: string;
  x: number;
  y: number;
  hp: number;
  angle: number; // 포탑 각도 (도, 0=오른쪽 수평, 90=위, 180=왼쪽 수평)
  color: number;
  fuel: number;
  status: TankStatus;

  constructor(id: string, playerId: string, color: number) {
    this.id = id;
    this.playerId = playerId;
    this.x = 0;
    this.y = 0;
    this.hp = TANK.HP;
    this.angle = 90; // 기본: 위쪽
    this.color = color;
    this.fuel = TANK.FUEL_PER_TURN;
    this.status = 'alive';
  }

  /** 지형 위에 탱크를 배치한다 (표면 스냅) */
  placeOnTerrain(xPos: number, terrain: TerrainMask): void {
    this.x = xPos;
    const surfaceY = terrain.getSurfaceY(xPos);
    this.y = surfaceY - TANK.HEIGHT;
  }

  /** 포탑 각도를 변경한다 (0~180도 범위) */
  adjustAngle(delta: number): void {
    this.angle = clamp(this.angle + delta, 0, 180);
  }

  /** 포탑 각도를 라디안으로 변환 */
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

  /** 데미지를 받는다 */
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
