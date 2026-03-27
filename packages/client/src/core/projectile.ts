import { GAME, TANK } from '@scorched/shared';
import type { TerrainMask } from '@scorched/shared';
import type { Tank } from './tank.js';

export interface ProjectileConfig {
  damage: number;
  explosionRadius: number;
}

export const STANDARD_SHELL: ProjectileConfig = {
  damage: 30,
  explosionRadius: 25,
};

export type ProjectileState = 'flying' | 'exploded' | 'expired';

export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly config: ProjectileConfig;
  readonly ownerId: string;
  state: ProjectileState;
  private hasLeftOrigin: boolean;

  constructor(
    originX: number,
    originY: number,
    angle: number,
    power: number,
    config: ProjectileConfig,
    ownerId: string,
  ) {
    this.x = originX;
    this.y = originY;
    this.vx = power * Math.cos(angle);
    this.vy = -power * Math.sin(angle); // Y-down: 위로 쏘려면 음수
    this.config = config;
    this.ownerId = ownerId;
    this.state = 'flying';
    this.hasLeftOrigin = false;
  }

  /** 매 프레임 물리 업데이트 */
  update(dt: number, wind: number): void {
    if (this.state !== 'flying') return;

    this.vx += wind * dt;
    this.vy += GAME.GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /** 지형 충돌 체크 */
  checkTerrainCollision(terrain: TerrainMask): boolean {
    const px = Math.floor(this.x);
    const py = Math.floor(this.y);
    return terrain.isSolid(px, py);
  }

  /** 탱크 충돌 체크 (AABB) */
  checkTankCollision(tank: Tank): boolean {
    // 자기 탱크는 원점을 벗어나기 전까지 무시
    if (tank.id === this.ownerId && !this.hasLeftOrigin) return false;
    if (!tank.isAlive) return false;

    return (
      this.x >= tank.x &&
      this.x <= tank.x + TANK.WIDTH &&
      this.y >= tank.y &&
      this.y <= tank.y + TANK.HEIGHT
    );
  }

  /** 자기 탱크 히트박스를 벗어났는지 확인 (매 프레임 호출) */
  updateOriginCheck(ownerTank: Tank): void {
    if (this.hasLeftOrigin) return;
    const inBox =
      this.x >= ownerTank.x &&
      this.x <= ownerTank.x + TANK.WIDTH &&
      this.y >= ownerTank.y &&
      this.y <= ownerTank.y + TANK.HEIGHT;
    if (!inBox) {
      this.hasLeftOrigin = true;
    }
  }

  /** 화면 경계 체크 */
  isOutOfBounds(): boolean {
    return (
      this.x < 0 ||
      this.x >= GAME.WORLD_WIDTH ||
      this.y >= GAME.WORLD_HEIGHT
    );
    // y < 0 은 계속 비행 (위로 나갔다가 복귀)
  }

  /** 폭발 처리: 지형 파괴 + 데미지 계산 */
  explode(
    terrain: TerrainMask,
    colorData: Uint8Array,
    tanks: Tank[],
  ): void {
    this.state = 'exploded';
    const { explosionRadius, damage } = this.config;
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    // 지형 파괴
    terrain.explode(cx, cy, explosionRadius);

    // colorData 갱신
    const minX = Math.max(0, cx - explosionRadius);
    const maxX = Math.min(GAME.WORLD_WIDTH - 1, cx + explosionRadius);
    const minY = Math.max(0, cy - explosionRadius);
    const maxY = Math.min(GAME.WORLD_HEIGHT - 1, cy + explosionRadius);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        if (!terrain.isSolid(px, py)) {
          const ci = (py * GAME.WORLD_WIDTH + px) * 4;
          colorData[ci] = 0;
          colorData[ci + 1] = 0;
          colorData[ci + 2] = 0;
          colorData[ci + 3] = 0;
        }
      }
    }

    // 데미지 계산
    for (const tank of tanks) {
      if (!tank.isAlive) continue;
      const tcx = tank.x + TANK.WIDTH / 2;
      const tcy = tank.y + TANK.HEIGHT / 2;
      const dx = tcx - cx;
      const dy = tcy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < explosionRadius) {
        const actualDamage = Math.floor(damage * (1 - dist / explosionRadius));
        if (actualDamage > 0) {
          tank.takeDamage(actualDamage);
        }
      }
    }
  }

  /** 소멸 처리 (화면 이탈) */
  expire(): void {
    this.state = 'expired';
  }
}

/** 궤적 예측 포인트 생성 */
export function predictTrajectory(
  originX: number,
  originY: number,
  angle: number,
  power: number,
  wind: number,
  terrain: TerrainMask,
  steps = 25,
  stepTime = 0.02,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = originX;
  let y = originY;
  let vx = power * Math.cos(angle);
  let vy = -power * Math.sin(angle);

  for (let i = 0; i < steps; i++) {
    vx += wind * stepTime;
    vy += GAME.GRAVITY * stepTime;
    x += vx * stepTime;
    y += vy * stepTime;

    if (x < 0 || x >= GAME.WORLD_WIDTH || y >= GAME.WORLD_HEIGHT) break;
    if (terrain.isSolid(Math.floor(x), Math.floor(y))) break;

    points.push({ x, y });
  }

  return points;
}
