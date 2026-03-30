import { describe, it, expect } from 'vitest';
import { projectilePosition, distance, degToRad, radToDeg, clamp } from './formulas.js';
import { GAME } from './constants.js';

describe('projectilePosition', () => {
  const origin = { x: 0, y: 0 };

  it('t=0에서 원점 반환', () => {
    const pos = projectilePosition(origin, degToRad(45), 100, 0, 0);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(0);
  });

  it('수평 발사(angle=0) 시 x 증가, y는 중력으로 증가 (Y-down)', () => {
    const pos = projectilePosition(origin, 0, 100, 0, 1);
    expect(pos.x).toBeCloseTo(100);
    expect(pos.y).toBeCloseTo(0.5 * GAME.GRAVITY); // Y-down: 중력이 y를 증가시킴
  });

  it('바람이 수평 이동에만 영향', () => {
    const noWind = projectilePosition(origin, degToRad(45), 100, 0, 1);
    const withWind = projectilePosition(origin, degToRad(45), 100, 50, 1);
    expect(withWind.x - noWind.x).toBeCloseTo(50);
    expect(withWind.y).toBeCloseTo(noWind.y);
  });

  it('위로 발사(angle=90) 시 초기에 y 감소 후 중력으로 증가 (Y-down)', () => {
    const t1 = projectilePosition(origin, degToRad(90), 100, 0, 1);
    const t2 = projectilePosition(origin, degToRad(90), 100, 0, 2);
    // Y-down: 위로 쏘면 y가 먼저 감소했다가 중력으로 다시 증가
    expect(t2.y).toBeGreaterThan(t1.y);
  });
});

describe('distance', () => {
  it('같은 점은 거리 0', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('3-4-5 직각삼각형', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
});

describe('degToRad / radToDeg', () => {
  it('0도 = 0 라디안', () => {
    expect(degToRad(0)).toBe(0);
  });

  it('180도 = PI 라디안', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });

  it('왕복 변환 일치', () => {
    expect(radToDeg(degToRad(45))).toBeCloseTo(45);
    expect(degToRad(radToDeg(Math.PI))).toBeCloseTo(Math.PI);
  });
});

describe('clamp', () => {
  it('범위 내 값은 그대로', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('최소값 미만은 최소값', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('최대값 초과는 최대값', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('경계값 정확히 일치', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});
