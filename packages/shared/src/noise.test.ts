import { describe, it, expect } from 'vitest';
import { PerlinNoise } from './noise.js';

describe('PerlinNoise', () => {
  it('같은 seed는 같은 결과', () => {
    const a = new PerlinNoise(42);
    const b = new PerlinNoise(42);
    for (let x = 0; x < 100; x += 0.7) {
      expect(a.noise1d(x)).toBe(b.noise1d(x));
    }
  });

  it('다른 seed는 다른 결과', () => {
    const a = new PerlinNoise(42);
    const b = new PerlinNoise(99);
    let different = false;
    for (let x = 0; x < 10; x += 0.5) {
      if (a.noise1d(x) !== b.noise1d(x)) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('noise1d 값은 -1~1 범위', () => {
    const noise = new PerlinNoise(12345);
    for (let x = 0; x < 1000; x += 0.1) {
      const v = noise.noise1d(x);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('fractal1d 값은 0~1 범위', () => {
    const noise = new PerlinNoise(12345);
    for (let x = 0; x < 1000; x += 0.1) {
      const v = noise.fractal1d(x, 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('fractal1d는 연속적 (인접 값의 차이가 작음)', () => {
    const noise = new PerlinNoise(42);
    const step = 0.01;
    for (let x = 0; x < 10; x += step) {
      const a = noise.fractal1d(x, 4);
      const b = noise.fractal1d(x + step, 4);
      expect(Math.abs(a - b)).toBeLessThan(0.1);
    }
  });
});
