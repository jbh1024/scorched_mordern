import { PerlinNoise, TerrainMask, TERRAIN } from '@scorched/shared';

/** Grassland 테마 색상 */
const GRASSLAND_COLORS = {
  surface: { r: 76, g: 153, b: 0 },      // 표면 잔디
  dirt: { r: 139, g: 90, b: 43 },         // 중간 흙
  deepDirt: { r: 101, g: 67, b: 33 },     // 깊은 흙
  rock: { r: 128, g: 128, b: 128 },       // 바위
  bedrock: { r: 64, g: 64, b: 64 },       // 최하단 기반암
} as const;

export interface TerrainTheme {
  surface: { r: number; g: number; b: number };
  dirt: { r: number; g: number; b: number };
  deepDirt: { r: number; g: number; b: number };
  rock: { r: number; g: number; b: number };
  bedrock: { r: number; g: number; b: number };
}

/**
 * seed 기반으로 지형을 생성한다.
 * 같은 seed → 같은 지형 (멀티플레이 동기화용).
 */
export function generateTerrain(
  width: number,
  height: number,
  seed: number,
  theme: TerrainTheme = GRASSLAND_COLORS,
): { mask: TerrainMask; colorData: Uint8Array } {
  const noise = new PerlinNoise(seed);
  const mask = new TerrainMask(width, height);
  // RGBA 색상 데이터 (렌더링용, mask와 분리)
  const colorData = new Uint8Array(width * height * 4);

  // 높이맵 생성: 각 x 좌표에 대해 지형 높이 계산
  const heightMap = new Float32Array(width);
  const minTerrainY = height * 0.3;  // 지형 최소 높이 (화면의 30%)
  const maxTerrainY = height * 0.8;  // 지형 최대 높이 (화면의 80%)
  const terrainRange = maxTerrainY - minTerrainY;

  for (let x = 0; x < width; x++) {
    const nx = x / width;
    const h = noise.fractal1d(nx * 4, 5, 2.0, 0.5);
    heightMap[x] = minTerrainY + h * terrainRange;
  }

  // TerrainMask + 색상 채우기
  const bedrockDepth = 4; // 최하단 파괴불가 레이어 두께
  const rockStartRatio = 0.7; // 지형 깊이 70% 이하부터 바위

  for (let x = 0; x < width; x++) {
    const surfaceY = Math.floor(heightMap[x]!);

    for (let y = surfaceY; y < height; y++) {
      const depth = y - surfaceY;
      const totalDepth = height - surfaceY;
      const depthRatio = depth / totalDepth;

      // Material 결정
      let material: number = TERRAIN.MATERIAL_DIRT;
      if (y >= height - bedrockDepth) {
        material = TERRAIN.MATERIAL_INDESTRUCTIBLE;
      } else if (depthRatio > rockStartRatio) {
        material = TERRAIN.MATERIAL_ROCK;
      }

      mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, material);

      // 색상 결정
      const ci = (y * width + x) * 4;
      let color: { r: number; g: number; b: number };

      if (depth <= 2) {
        color = theme.surface;
      } else if (y >= height - bedrockDepth) {
        color = theme.bedrock;
      } else if (depthRatio > rockStartRatio) {
        color = theme.rock;
      } else if (depthRatio > 0.4) {
        color = theme.deepDirt;
      } else {
        color = theme.dirt;
      }

      colorData[ci] = color.r;
      colorData[ci + 1] = color.g;
      colorData[ci + 2] = color.b;
      colorData[ci + 3] = 255;
    }
  }

  return { mask, colorData };
}

/**
 * TerrainMask 기반으로 배경색이 있는 색상 데이터를 업데이트한다.
 * 폭발 후 렌더링 갱신에 사용.
 */
export function updateColorFromMask(
  mask: TerrainMask,
  colorData: Uint8Array,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): void {
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const ci = (y * mask.width + x) * 4;
      if (!mask.isSolid(x, y)) {
        colorData[ci] = 0;
        colorData[ci + 1] = 0;
        colorData[ci + 2] = 0;
        colorData[ci + 3] = 0;
      }
    }
  }
}
