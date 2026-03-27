import { Container, Sprite, Texture } from 'pixi.js';
import type { TerrainMask } from '@scorched/shared';

/**
 * TerrainMask + colorData를 PixiJS Sprite로 렌더링한다.
 * 매 업데이트마다 ImageBitmap을 생성하여 PixiJS 텍스처 캐시를 우회.
 */
export class TerrainRenderer {
  readonly container: Container;
  private readonly sprite: Sprite;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.container = new Container();

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.sprite = new Sprite();
    this.container.addChild(this.sprite);
  }

  /** 전체 지형을 다시 그린다 (초기화 시) */
  async fullRedraw(colorData: Uint8Array): Promise<void> {
    const clamped = new Uint8ClampedArray(this.width * this.height * 4);
    clamped.set(colorData);
    const imageData = new ImageData(clamped, this.width, this.height);
    this.ctx.putImageData(imageData, 0, 0);
    await this.refreshTexture();
  }

  /** 변경된 영역만 다시 그린다 (Dirty Rect) */
  async partialRedraw(
    colorData: Uint8Array,
    dirtyX: number,
    dirtyY: number,
    dirtyW: number,
    dirtyH: number,
  ): Promise<void> {
    const sx = Math.max(0, dirtyX);
    const sy = Math.max(0, dirtyY);
    const ex = Math.min(this.width, dirtyX + dirtyW);
    const ey = Math.min(this.height, dirtyY + dirtyH);
    const w = ex - sx;
    const h = ey - sy;
    if (w <= 0 || h <= 0) return;

    const dirtyData = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      const srcOffset = ((sy + y) * this.width + sx) * 4;
      const dstOffset = y * w * 4;
      dirtyData.set(
        colorData.subarray(srcOffset, srcOffset + w * 4),
        dstOffset,
      );
    }

    const imageData = new ImageData(dirtyData, w, h);
    this.ctx.putImageData(imageData, sx, sy);
    await this.refreshTexture();
  }

  private async refreshTexture(): Promise<void> {
    // ImageBitmap으로 변환하여 매번 새로운 리소스 생성 (캐시 우회)
    const bitmap = await createImageBitmap(this.canvas);
    this.sprite.texture?.destroy(true);
    this.sprite.texture = Texture.from({ resource: bitmap });
  }

  /** 폭발 후 해당 영역을 다시 렌더링 */
  async redrawExplosion(
    _mask: TerrainMask,
    colorData: Uint8Array,
    cx: number,
    cy: number,
    radius: number,
  ): Promise<void> {
    const margin = 2;
    const dirtyX = Math.floor(cx - radius - margin);
    const dirtyY = Math.floor(cy - radius - margin);
    const dirtyW = Math.ceil(radius * 2 + margin * 2);
    const dirtyH = Math.ceil(radius * 2 + margin * 2);
    await this.partialRedraw(colorData, dirtyX, dirtyY, dirtyW, dirtyH);
  }

  destroy(): void {
    this.sprite.texture?.destroy(true);
    this.container.destroy({ children: true });
  }
}
