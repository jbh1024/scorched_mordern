import { TANK } from '@scorched/shared';
import type { TerrainMask } from '@scorched/shared';
import { clamp } from '@scorched/shared';
import type { Tank } from '../core/tank.js';
import { findBestShot } from './shot-solver.js';

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'brutal';

interface DifficultyConfig {
  angleSigma: number;    // 각도 오차 표준편차 (도)
  powerSigma: number;    // 파워 오차 표준편차 (%)
  correctionRate: number; // 학습 보정 비율 (0~1)
  correctionAfter: number; // N회차 이후 보정 시작
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, DifficultyConfig> = {
  easy:   { angleSigma: 15, powerSigma: 15, correctionRate: 0,   correctionAfter: 999 },
  normal: { angleSigma: 8,  powerSigma: 8,  correctionRate: 0.5, correctionAfter: 3 },
  hard:   { angleSigma: 3,  powerSigma: 3,  correctionRate: 0.5, correctionAfter: 2 },
  brutal: { angleSigma: 1,  powerSigma: 1,  correctionRate: 0.7, correctionAfter: 1 },
};

/** Box-Muller 변환으로 가우시안 난수 생성 */
function gaussian(mean: number, sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z;
}

export class AIController {
  readonly difficulty: AIDifficulty;
  private shotCount: Map<string, number> = new Map(); // targetId → 발사 횟수

  constructor(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
  }

  /** 가장 가까운 생존 적 탱크를 선택 */
  pickTarget(myTank: Tank, allTanks: Tank[]): Tank | null {
    let closest: Tank | null = null;
    let closestDist = Infinity;

    for (const t of allTanks) {
      if (t.id === myTank.id || !t.isAlive) continue;
      const dx = t.x - myTank.x;
      const dist = Math.abs(dx);
      if (dist < closestDist) {
        closestDist = dist;
        closest = t;
      }
    }

    return closest;
  }

  /** 타겟에 대한 최적 사격 계산 (난이도별 노이즈 포함) */
  computeShot(
    myTank: Tank,
    target: Tank,
    terrain: TerrainMask,
    wind: number,
  ): { angle: number; power: number } {
    const origin = myTank.getFireOrigin();
    const targetX = target.x + TANK.WIDTH / 2;
    const targetY = target.y + TANK.HEIGHT / 2;

    // 최적 사격 계산
    const best = findBestShot(origin.x, origin.y, targetX, targetY, wind, terrain);

    // 난이도별 노이즈 적용
    const config = DIFFICULTY_CONFIG[this.difficulty];
    const count = this.shotCount.get(target.id) ?? 0;

    // 보정 적용 여부
    const effectiveSigmaAngle = count >= config.correctionAfter
      ? config.angleSigma * (1 - config.correctionRate)
      : config.angleSigma;
    const effectiveSigmaPower = count >= config.correctionAfter
      ? config.powerSigma * (1 - config.correctionRate)
      : config.powerSigma;

    const noisyAngle = gaussian(best.angle, effectiveSigmaAngle);
    const noisyPower = gaussian(best.power, effectiveSigmaPower);

    // 발사 횟수 기록
    this.shotCount.set(target.id, count + 1);

    return {
      angle: clamp(Math.round(noisyAngle), 1, 179),
      power: clamp(Math.round(noisyPower), 5, 100),
    };
  }
}
