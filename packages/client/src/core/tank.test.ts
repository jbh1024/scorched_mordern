import { describe, it, expect } from 'vitest';
import { Tank } from './tank.js';
import { TerrainMask, TERRAIN, TANK } from '@scorched/shared';

function makeTerrain(width: number, height: number, surfaceY: number): TerrainMask {
  const mask = new TerrainMask(width, height);
  for (let x = 0; x < width; x++) {
    for (let y = surfaceY; y < height; y++) {
      mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    }
  }
  return mask;
}

describe('Tank', () => {
  it('constructor 기본값', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'Player');
    expect(tank.hp).toBe(TANK.HP);
    expect(tank.angle).toBe(90);
    expect(tank.fuel).toBe(TANK.FUEL_PER_TURN);
    expect(tank.status).toBe('alive');
    expect(tank.isBot).toBe(false);
    expect(tank.name).toBe('Player');
  });

  it('isBot 플래그', () => {
    const bot = new Tank('t2', 'b1', 0x0000ff, 'Bot-1', true);
    expect(bot.isBot).toBe(true);
  });

  it('adjustAngle 범위 내', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.adjustAngle(-30);
    expect(tank.angle).toBe(60);
    tank.adjustAngle(50);
    expect(tank.angle).toBe(110);
  });

  it('adjustAngle 클램프 (0~180)', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.adjustAngle(-100); // 90 - 100 = -10 → 0
    expect(tank.angle).toBe(0);
    tank.adjustAngle(200); // 0 + 200 = 200 → 180
    expect(tank.angle).toBe(180);
  });

  it('angleRad 변환', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.angle = 90;
    expect(tank.angleRad).toBeCloseTo(Math.PI / 2);
    tank.angle = 0;
    expect(tank.angleRad).toBeCloseTo(0);
  });

  it('placeOnTerrain 표면 스냅', () => {
    const terrain = makeTerrain(100, 100, 60);
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.placeOnTerrain(50, terrain);
    expect(tank.x).toBe(50);
    expect(tank.y).toBe(60 - TANK.HEIGHT);
  });

  it('move fuel 소비', () => {
    const terrain = makeTerrain(200, 100, 60);
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.placeOnTerrain(100, terrain);
    const initialFuel = tank.fuel;
    tank.move(1, terrain, 0.1);
    expect(tank.fuel).toBeLessThan(initialFuel);
  });

  it('move fuel 0이면 이동 불가', () => {
    const terrain = makeTerrain(200, 100, 60);
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.placeOnTerrain(100, terrain);
    tank.fuel = 0;
    const prevX = tank.x;
    tank.move(1, terrain, 0.1);
    expect(tank.x).toBe(prevX);
  });

  it('move 월드 경계 체크', () => {
    const terrain = makeTerrain(200, 100, 60);
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.placeOnTerrain(0, terrain);
    const moved = tank.move(-1, terrain, 0.1);
    expect(moved).toBe(0); // 왼쪽 경계
  });

  it('takeDamage HP 감소', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.takeDamage(30);
    expect(tank.hp).toBe(70);
    expect(tank.isAlive).toBe(true);
  });

  it('takeDamage HP 0 → dead', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.takeDamage(100);
    expect(tank.hp).toBe(0);
    expect(tank.status).toBe('dead');
    expect(tank.isAlive).toBe(false);
  });

  it('takeDamage 음수 HP 방지', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.takeDamage(150);
    expect(tank.hp).toBe(0);
  });

  it('resetFuel', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.fuel = 10;
    tank.resetFuel();
    expect(tank.fuel).toBe(TANK.FUEL_PER_TURN);
  });

  it('getFireOrigin 포탑 끝 좌표', () => {
    const tank = new Tank('t1', 'p1', 0xff0000, 'P');
    tank.x = 100;
    tank.y = 50;
    tank.angle = 90; // 위쪽
    const origin = tank.getFireOrigin();
    expect(origin.x).toBeCloseTo(100 + TANK.WIDTH / 2); // cos(90°) ≈ 0
    expect(origin.y).toBeLessThan(50); // sin(90°) > 0 → y 감소
  });
});
