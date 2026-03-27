import { TERRAIN } from './constants.js';

/**
 * 지형 데이터를 Uint8Array 기반으로 관리하는 클래스.
 * 각 픽셀은 4바이트 RGBA:
 *   R = Density (0=Empty, 255=Solid)
 *   G = Material (0=Dirt, 128=Rock, 255=Indestructible)
 *   B = Reserved (화염 잔류 등)
 *   A = Render alpha
 *
 * 클라이언트/서버 양쪽에서 사용 가능 (브라우저 API 의존 없음).
 */
export class TerrainMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  private offset(x: number, y: number): number {
    return (y * this.width + x) * 4;
  }

  /** 좌표가 유효한 범위인지 확인 */
  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** 해당 좌표의 Density (R channel) */
  getDensity(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.data[this.offset(x, y)]!;
  }

  /** 해당 좌표의 Material (G channel) */
  getMaterial(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.data[this.offset(x, y) + 1]!;
  }

  /** 해당 좌표가 고체인지 확인 */
  isSolid(x: number, y: number): boolean {
    return this.getDensity(x, y) > 0;
  }

  /** 픽셀 설정 (density + material) */
  setPixel(x: number, y: number, density: number, material: number): void {
    if (!this.inBounds(x, y)) return;
    const i = this.offset(x, y);
    this.data[i] = density;
    this.data[i + 1] = material;
    this.data[i + 2] = 0; // B reserved
    this.data[i + 3] = density > 0 ? 255 : 0; // A
  }

  /** 원형 영역의 지형을 제거 (Explosion Brush) */
  explode(cx: number, cy: number, radius: number): void {
    const r2 = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          if (this.getMaterial(x, y) < TERRAIN.MATERIAL_INDESTRUCTIBLE) {
            this.setPixel(x, y, TERRAIN.DENSITY_EMPTY, 0);
          }
        }
      }
    }
  }

  /** 특정 x 좌표에서 가장 높은 고체 지형의 y 좌표 (없으면 height) */
  getSurfaceY(x: number): number {
    for (let y = 0; y < this.height; y++) {
      if (this.isSolid(x, y)) return y;
    }
    return this.height;
  }
}
