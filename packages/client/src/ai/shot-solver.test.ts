import { describe, it, expect } from 'vitest';
import { findBestShot } from './shot-solver.js';
import { TerrainMask, TERRAIN } from '@scorched/shared';

function makeFlatTerrain(surfaceY = 500): TerrainMask {
  const mask = new TerrainMask(1920, 1080);
  for (let x = 0; x < 1920; x++) {
    for (let y = surfaceY; y < 1080; y++) {
      mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    }
  }
  return mask;
}

describe('findBestShot', () => {
  it('평탄 지형에서 오른쪽 타겟에 대한 사격 계산', () => {
    const terrain = makeFlatTerrain(500);
    const result = findBestShot(200, 475, 800, 485, 0, terrain);

    expect(result.angle).toBeGreaterThan(0);
    expect(result.angle).toBeLessThan(180);
    expect(result.power).toBeGreaterThan(0);
    expect(result.power).toBeLessThanOrEqual(100);
    expect(result.score).toBeLessThan(100); // 100px 이내 착탄
  });

  it('평탄 지형에서 왼쪽 타겟에 대한 사격 계산', () => {
    const terrain = makeFlatTerrain(500);
    const result = findBestShot(1600, 475, 400, 485, 0, terrain);

    expect(result.angle).toBeGreaterThan(90); // 왼쪽으로 쏴야 하므로 90도 이상
    expect(result.score).toBeLessThan(200); // 먼 거리는 오차 여유
  });

  it('가까운 타겟은 낮은 파워', () => {
    const terrain = makeFlatTerrain(500);
    const near = findBestShot(200, 475, 400, 485, 0, terrain);
    const far = findBestShot(200, 475, 1600, 485, 0, terrain);

    expect(near.power).toBeLessThan(far.power);
  });

  it('angle과 power가 유효 범위', () => {
    const terrain = makeFlatTerrain(500);
    const result = findBestShot(200, 475, 1000, 485, 0, terrain);

    expect(result.angle).toBeGreaterThanOrEqual(1);
    expect(result.angle).toBeLessThanOrEqual(179);
    expect(result.power).toBeGreaterThanOrEqual(5);
    expect(result.power).toBeLessThanOrEqual(100);
  });

  it('score가 0 이상', () => {
    const terrain = makeFlatTerrain(500);
    const result = findBestShot(200, 475, 800, 485, 0, terrain);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
