import { GAME } from '@scorched/shared';
import type { TerrainMask } from '@scorched/shared';
import { degToRad } from '@scorched/shared';

interface ShotResult {
  angle: number;   // 도
  power: number;   // 0~100 (%)
  score: number;   // 착탄점과 타겟 간 거리 (낮을수록 좋음)
}

const SIM_DT = 0.02;
const SIM_MAX_STEPS = 500;

/**
 * 발사 원점에서 궤적을 시뮬레이션하여 착탄 좌표를 반환한다.
 * 지형 충돌 또는 화면 이탈 시 종료.
 */
function simulateShot(
  originX: number,
  originY: number,
  angleDeg: number,
  powerPct: number,
  wind: number,
  terrain: TerrainMask,
): { x: number; y: number } | null {
  const power = (powerPct / 100) * GAME.MAX_POWER;
  const rad = degToRad(angleDeg);
  let x = originX;
  let y = originY;
  let vx = power * Math.cos(rad);
  let vy = -power * Math.sin(rad);

  for (let i = 0; i < SIM_MAX_STEPS; i++) {
    vx += wind * SIM_DT;
    vy += GAME.GRAVITY * SIM_DT;
    x += vx * SIM_DT;
    y += vy * SIM_DT;

    // 화면 이탈
    if (x < 0 || x >= GAME.WORLD_WIDTH || y >= GAME.WORLD_HEIGHT) return null;

    // 지형 충돌
    if (terrain.isSolid(Math.floor(x), Math.floor(y))) {
      return { x, y };
    }
  }

  return null; // 시간 초과
}

/**
 * 브루트포스 시뮬레이션으로 타겟에 가장 가까운 (angle, power)를 찾는다.
 */
export function findBestShot(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  wind: number,
  terrain: TerrainMask,
): ShotResult {
  let best: ShotResult = { angle: 90, power: 50, score: Infinity };

  // 1단계: 조대 탐색
  for (let angleDeg = 5; angleDeg <= 175; angleDeg += 5) {
    for (let powerPct = 10; powerPct <= 100; powerPct += 10) {
      const landing = simulateShot(originX, originY, angleDeg, powerPct, wind, terrain);
      if (!landing) continue;

      const dx = landing.x - targetX;
      const dy = landing.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < best.score) {
        best = { angle: angleDeg, power: powerPct, score: dist };
      }
    }
  }

  // 2단계: 정밀 탐색 (최적값 주변)
  const fineAngleMin = Math.max(1, best.angle - 4);
  const fineAngleMax = Math.min(179, best.angle + 4);
  const finePowerMin = Math.max(5, best.power - 8);
  const finePowerMax = Math.min(100, best.power + 8);

  for (let angleDeg = fineAngleMin; angleDeg <= fineAngleMax; angleDeg += 1) {
    for (let powerPct = finePowerMin; powerPct <= finePowerMax; powerPct += 2) {
      const landing = simulateShot(originX, originY, angleDeg, powerPct, wind, terrain);
      if (!landing) continue;

      const dx = landing.x - targetX;
      const dy = landing.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < best.score) {
        best = { angle: angleDeg, power: powerPct, score: dist };
      }
    }
  }

  return best;
}
