import { describe, it, expect } from 'vitest';
import { AIController } from './ai-controller.js';
import { Tank } from '../core/tank.js';
import { TerrainMask, TERRAIN } from '@scorched/shared';

function makeTerrain(surfaceY = 500): TerrainMask {
  const mask = new TerrainMask(1920, 1080);
  for (let x = 0; x < 1920; x++) {
    for (let y = surfaceY; y < 1080; y++) {
      mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    }
  }
  return mask;
}

describe('AIController', () => {
  describe('pickTarget', () => {
    it('가장 가까운 생존 적 선택', () => {
      const ai = new AIController('normal');
      const my = new Tank('t0', 'p0', 0xff0000, 'Me');
      my.x = 100;
      const far = new Tank('t1', 'p1', 0x0000ff, 'Far');
      far.x = 1500;
      const near = new Tank('t2', 'p2', 0x00ff00, 'Near');
      near.x = 400;

      const target = ai.pickTarget(my, [my, far, near]);
      expect(target?.id).toBe('t2');
    });

    it('사망한 탱크 제외', () => {
      const ai = new AIController('normal');
      const my = new Tank('t0', 'p0', 0xff0000, 'Me');
      my.x = 100;
      const dead = new Tank('t1', 'p1', 0x0000ff, 'Dead');
      dead.x = 200;
      dead.takeDamage(200); // 사망
      const alive = new Tank('t2', 'p2', 0x00ff00, 'Alive');
      alive.x = 1000;

      const target = ai.pickTarget(my, [my, dead, alive]);
      expect(target?.id).toBe('t2');
    });

    it('자기 자신 제외', () => {
      const ai = new AIController('normal');
      const my = new Tank('t0', 'p0', 0xff0000, 'Me');
      my.x = 100;

      const target = ai.pickTarget(my, [my]);
      expect(target).toBeNull();
    });
  });

  describe('computeShot', () => {
    it('유효한 angle/power 반환', () => {
      const ai = new AIController('normal');
      const terrain = makeTerrain();
      const my = new Tank('t0', 'p0', 0xff0000, 'Me');
      my.placeOnTerrain(200, terrain);
      const target = new Tank('t1', 'p1', 0x0000ff, 'Target');
      target.placeOnTerrain(1000, terrain);

      const shot = ai.computeShot(my, target, terrain, 0);
      expect(shot.angle).toBeGreaterThanOrEqual(1);
      expect(shot.angle).toBeLessThanOrEqual(179);
      expect(shot.power).toBeGreaterThanOrEqual(5);
      expect(shot.power).toBeLessThanOrEqual(100);
    });

    it('Brutal 난이도는 Easy보다 정확', () => {
      const terrain = makeTerrain();
      const my = new Tank('t0', 'p0', 0xff0000, 'Me');
      my.placeOnTerrain(200, terrain);
      const target = new Tank('t1', 'p1', 0x0000ff, 'Target');
      target.placeOnTerrain(1000, terrain);

      // 여러 번 시도하여 분산 비교
      const brutalAngles: number[] = [];
      const easyAngles: number[] = [];

      for (let i = 0; i < 20; i++) {
        const brutal = new AIController('brutal');
        brutalAngles.push(brutal.computeShot(my, target, terrain, 0).angle);
        const easy = new AIController('easy');
        easyAngles.push(easy.computeShot(my, target, terrain, 0).angle);
      }

      const brutalVariance = variance(brutalAngles);
      const easyVariance = variance(easyAngles);

      expect(brutalVariance).toBeLessThan(easyVariance);
    });
  });
});

function variance(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
}
