import { describe, it, expect } from 'vitest';
import { TerrainMask } from './terrain-mask.js';
import { TERRAIN } from './constants.js';

describe('TerrainMask', () => {
  it('초기 상태는 모두 빈 공간', () => {
    const mask = new TerrainMask(10, 10);
    expect(mask.getDensity(0, 0)).toBe(0);
    expect(mask.isSolid(0, 0)).toBe(false);
  });

  it('setPixel/getDensity/getMaterial 왕복', () => {
    const mask = new TerrainMask(10, 10);
    mask.setPixel(5, 5, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    expect(mask.getDensity(5, 5)).toBe(255);
    expect(mask.getMaterial(5, 5)).toBe(0);
    expect(mask.isSolid(5, 5)).toBe(true);
  });

  it('범위 밖 접근은 안전하게 0 반환', () => {
    const mask = new TerrainMask(10, 10);
    expect(mask.getDensity(-1, 0)).toBe(0);
    expect(mask.getDensity(10, 0)).toBe(0);
    expect(mask.isSolid(0, -1)).toBe(false);
  });

  it('범위 밖 setPixel은 무시', () => {
    const mask = new TerrainMask(10, 10);
    mask.setPixel(-1, 0, 255, 0); // should not throw
    mask.setPixel(10, 0, 255, 0);
    expect(mask.getDensity(0, 0)).toBe(0);
  });

  it('explode로 원형 영역 제거', () => {
    const mask = new TerrainMask(20, 20);
    // 전체를 고체로 채움
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
      }
    }
    // 중심 (10,10) 반경 3 폭발
    mask.explode(10, 10, 3);
    expect(mask.isSolid(10, 10)).toBe(false);
    expect(mask.isSolid(10, 8)).toBe(false); // 반경 내
    expect(mask.isSolid(10, 6)).toBe(true);  // 반경 밖
  });

  it('explode는 Indestructible 소재를 제거하지 않음', () => {
    const mask = new TerrainMask(20, 20);
    mask.setPixel(10, 10, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_INDESTRUCTIBLE);
    mask.explode(10, 10, 5);
    expect(mask.isSolid(10, 10)).toBe(true);
  });

  it('getSurfaceY는 가장 높은 고체 y 반환', () => {
    const mask = new TerrainMask(10, 20);
    // y=15부터 아래를 고체로
    for (let y = 15; y < 20; y++) {
      mask.setPixel(5, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    }
    expect(mask.getSurfaceY(5)).toBe(15);
  });

  it('getSurfaceY 고체 없으면 height 반환', () => {
    const mask = new TerrainMask(10, 20);
    expect(mask.getSurfaceY(5)).toBe(20);
  });
});
