import type { Point } from './types.js';
import { GAME } from './constants.js';

/**
 * 시간 t에서의 포탄 위치 계산 (Y-down 화면 좌표계)
 *
 * x(t) = x0 + (v0 * cos(theta) + wind) * t
 * y(t) = y0 - (v0 * sin(theta)) * t + 0.5 * g * t^2
 *
 * Y-down: 위로 쏘려면 vy가 음수, 중력은 Y를 증가시킴
 */
export function projectilePosition(
  origin: Point,
  angle: number,
  power: number,
  wind: number,
  t: number,
): Point {
  const vx = power * Math.cos(angle) + wind;
  const vy = -power * Math.sin(angle);

  return {
    x: origin.x + vx * t,
    y: origin.y + vy * t + 0.5 * GAME.GRAVITY * t * t,
  };
}

/**
 * 두 점 사이 거리 계산
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 각도를 라디안으로 변환
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * 라디안을 각도로 변환
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * 값을 min~max 범위로 클램프
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
