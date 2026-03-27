import { Container, Graphics } from 'pixi.js';
import { GAME } from '@scorched/shared';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 남은 수명 (초)
  maxLife: number;  // 최초 수명
  size: number;
  color: number;
}

const EXPLOSION_PARTICLE_COUNT = 25;
const EXPLOSION_SPEED_MIN = 80;
const EXPLOSION_SPEED_MAX = 250;
const PARTICLE_LIFE_MIN = 0.4;
const PARTICLE_LIFE_MAX = 1.0;
const PARTICLE_SIZE_MIN = 2;
const PARTICLE_SIZE_MAX = 5;
const PARTICLE_GRAVITY = 400;

const DEBRIS_COLORS = [
  0x8b5a2b, // 갈색
  0x654321, // 암갈색
  0xa0522d, // 적갈색
  0xd2691e, // 초콜릿
  0x808080, // 회색 (바위)
  0xff6600, // 주황 (불꽃)
  0xffaa00, // 노랑 (불꽃)
];

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 폭발 파티클 시스템.
 * 폭발 이벤트마다 파편/먼지 파티클을 생성하고, 매 프레임 업데이트.
 */
export class ParticleSystem {
  readonly container: Container;
  private readonly graphics: Graphics;
  private particles: Particle[] = [];

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  /** 폭발 파티클 생성 */
  spawnExplosion(cx: number, cy: number, radius: number): void {
    const count = Math.floor(EXPLOSION_PARTICLE_COUNT * (radius / 25));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(EXPLOSION_SPEED_MIN, EXPLOSION_SPEED_MAX);
      const life = randomRange(PARTICLE_LIFE_MIN, PARTICLE_LIFE_MAX);

      this.particles.push({
        x: cx + randomRange(-radius * 0.3, radius * 0.3),
        y: cy + randomRange(-radius * 0.3, radius * 0.3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomRange(50, 150), // 약간 위로 편향
        life,
        maxLife: life,
        size: randomRange(PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX),
        color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)]!,
      });
    }
  }

  /** 매 프레임 업데이트 */
  update(dt: number): void {
    // 물리 업데이트
    for (const p of this.particles) {
      p.vy += PARTICLE_GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }

    // 죽은 파티클 제거
    this.particles = this.particles.filter(
      p => p.life > 0 && p.y < GAME.WORLD_HEIGHT,
    );

    // 렌더링
    this.graphics.clear();
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio;
      const size = p.size * lifeRatio;

      this.graphics
        .circle(p.x, p.y, size)
        .fill({ color: p.color, alpha });
    }
  }

  get activeCount(): number {
    return this.particles.length;
  }

  destroy(): void {
    this.particles = [];
    this.container.destroy({ children: true });
  }
}
