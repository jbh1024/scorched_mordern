import { describe, it, expect } from 'vitest';
import { Projectile, STANDARD_SHELL, predictTrajectory } from './projectile.js';
import { TerrainMask, TERRAIN, GAME, TANK } from '@scorched/shared';
import { Tank } from './tank.js';

function makeTerrain(width: number, height: number, surfaceY: number): TerrainMask {
  const mask = new TerrainMask(width, height);
  for (let x = 0; x < width; x++) {
    for (let y = surfaceY; y < height; y++) {
      mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    }
  }
  return mask;
}

describe('Projectile', () => {
  it('초기 속도 Y-down (위로 쏘면 vy 음수)', () => {
    const p = new Projectile(100, 100, Math.PI / 2, 500, STANDARD_SHELL, 'owner');
    expect(p.vx).toBeCloseTo(0); // cos(90°) ≈ 0
    expect(p.vy).toBeLessThan(0); // -sin(90°) * 500
  });

  it('초기 속도 수평 발사', () => {
    const p = new Projectile(100, 100, 0, 500, STANDARD_SHELL, 'owner');
    expect(p.vx).toBeCloseTo(500);
    expect(p.vy).toBeCloseTo(0);
  });

  it('update 중력으로 vy 증가', () => {
    const p = new Projectile(100, 100, Math.PI / 2, 500, STANDARD_SHELL, 'owner');
    const vyBefore = p.vy;
    p.update(0.1, 0);
    expect(p.vy).toBeGreaterThan(vyBefore); // 중력이 vy를 증가시킴
  });

  it('update 바람으로 vx 변화', () => {
    const p = new Projectile(100, 100, Math.PI / 2, 500, STANDARD_SHELL, 'owner');
    const vxBefore = p.vx;
    p.update(0.1, 100); // 오른쪽 바람
    expect(p.vx).toBeGreaterThan(vxBefore);
  });

  it('checkTerrainCollision 고체 지형에서 true', () => {
    const terrain = makeTerrain(200, 200, 100);
    const p = new Projectile(50, 110, 0, 100, STANDARD_SHELL, 'owner');
    expect(p.checkTerrainCollision(terrain)).toBe(true);
  });

  it('checkTerrainCollision 빈 공간에서 false', () => {
    const terrain = makeTerrain(200, 200, 100);
    const p = new Projectile(50, 50, 0, 100, STANDARD_SHELL, 'owner');
    expect(p.checkTerrainCollision(terrain)).toBe(false);
  });

  it('checkTankCollision AABB 히트', () => {
    const tank = new Tank('target', 'p2', 0x0000ff, 'T');
    tank.x = 100;
    tank.y = 50;
    const p = new Projectile(110, 60, 0, 100, STANDARD_SHELL, 'other');
    (p as unknown as { hasLeftOrigin: boolean }).hasLeftOrigin = true;
    expect(p.checkTankCollision(tank)).toBe(true);
  });

  it('checkTankCollision AABB 미스', () => {
    const tank = new Tank('target', 'p2', 0x0000ff, 'T');
    tank.x = 100;
    tank.y = 50;
    const p = new Projectile(200, 200, 0, 100, STANDARD_SHELL, 'other');
    (p as unknown as { hasLeftOrigin: boolean }).hasLeftOrigin = true;
    expect(p.checkTankCollision(tank)).toBe(false);
  });

  it('자기 탱크 원점 벗어나기 전 충돌 무시', () => {
    const tank = new Tank('owner', 'p1', 0xff0000, 'P');
    tank.x = 100;
    tank.y = 50;
    const p = new Projectile(110, 60, 0, 100, STANDARD_SHELL, 'owner');
    expect(p.checkTankCollision(tank)).toBe(false); // hasLeftOrigin = false
  });

  it('isOutOfBounds 좌측 이탈', () => {
    const p = new Projectile(-1, 100, 0, 100, STANDARD_SHELL, 'owner');
    expect(p.isOutOfBounds()).toBe(true);
  });

  it('isOutOfBounds 하단 이탈', () => {
    const p = new Projectile(100, GAME.WORLD_HEIGHT, 0, 100, STANDARD_SHELL, 'owner');
    expect(p.isOutOfBounds()).toBe(true);
  });

  it('isOutOfBounds 상단은 계속 비행', () => {
    const p = new Projectile(100, -50, 0, 100, STANDARD_SHELL, 'owner');
    expect(p.isOutOfBounds()).toBe(false);
  });

  it('explode 지형 파괴 + 데미지', () => {
    const terrain = makeTerrain(200, 200, 80);
    const colorData = new Uint8Array(200 * 200 * 4);
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.x = 95;
    tank.y = 70;

    const p = new Projectile(100, 90, 0, 100, STANDARD_SHELL, 'other');
    p.explode(terrain, colorData, [tank]);

    expect(p.state).toBe('exploded');
    expect(terrain.isSolid(100, 90)).toBe(false); // 폭발 중심 파괴됨
    expect(tank.hp).toBeLessThan(TANK.HP); // 데미지 받음
  });

  it('expire 상태 변경', () => {
    const p = new Projectile(100, 100, 0, 100, STANDARD_SHELL, 'owner');
    p.expire();
    expect(p.state).toBe('expired');
  });
});

describe('predictTrajectory', () => {
  it('점 배열 반환', () => {
    const terrain = makeTerrain(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT, 800);
    const points = predictTrajectory(100, 700, Math.PI / 4, 500, 0, terrain);
    expect(points.length).toBeGreaterThan(0);
  });

  it('지형 충돌 시 중단', () => {
    const terrain = makeTerrain(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT, 100);
    // 아래로 발사하면 금방 충돌
    const points = predictTrajectory(100, 90, -Math.PI / 4, 100, 0, terrain);
    expect(points.length).toBeLessThan(25); // max steps보다 적어야 함
  });
});
