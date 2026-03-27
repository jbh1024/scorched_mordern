/**
 * Seed 기반 재현 가능한 Perlin Noise 구현.
 * 클라이언트/서버 양쪽에서 동일 seed로 동일 지형을 생성할 수 있다.
 */

// seed → 0~1 의사 난수 생성 (MurmurHash3 inspired)
function seedRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 0~255 셔플된 permutation 테이블 생성
function buildPermutation(seed: number): Uint8Array {
  const rng = seedRandom(seed);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = tmp;
  }
  return perm;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number): number {
  return hash & 1 ? -x : x;
}

export class PerlinNoise {
  private readonly perm: Uint8Array;

  constructor(seed: number) {
    const base = buildPermutation(seed);
    // 512 테이블로 확장 (모듈로 연산 제거)
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = base[i & 255]!;
    }
  }

  /** 1D Perlin Noise (-1 ~ +1) */
  noise1d(x: number): number {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = fade(xf);

    const a = this.perm[xi]!;
    const b = this.perm[xi + 1]!;

    return lerp(grad(a, xf), grad(b, xf - 1), u);
  }

  /** 다중 옥타브 1D Noise (0 ~ 1 정규화) */
  fractal1d(x: number, octaves: number, lacunarity = 2.0, persistence = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise1d(x * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // -1~1 → 0~1 정규화
    return (value / maxValue + 1) / 2;
  }
}
