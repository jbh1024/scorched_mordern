import { Container, Graphics } from 'pixi.js';
import type { Projectile } from '../core/projectile.js';

const PROJECTILE_RADIUS = 3;
const TRAJECTORY_DOT_RADIUS = 2;
const TRAJECTORY_ALPHA = 0.6;

/**
 * 포탄과 궤적 예측선을 렌더링한다.
 */
export class ProjectileRenderer {
  readonly container: Container;
  private readonly bullet: Graphics;
  private readonly trajectoryLine: Graphics;

  constructor() {
    this.container = new Container();

    this.bullet = new Graphics();
    this.bullet.circle(0, 0, PROJECTILE_RADIUS).fill({ color: 0xffffff });
    this.bullet.visible = false;
    this.container.addChild(this.bullet);

    this.trajectoryLine = new Graphics();
    this.container.addChild(this.trajectoryLine);
  }

  /** 비행 중 포탄 위치 업데이트 */
  updateBullet(projectile: Projectile | null): void {
    if (projectile && projectile.state === 'flying') {
      this.bullet.x = projectile.x;
      this.bullet.y = projectile.y;
      this.bullet.visible = true;
    } else {
      this.bullet.visible = false;
    }
  }

  /** 궤적 예측선 그리기 */
  drawTrajectory(points: { x: number; y: number }[]): void {
    this.trajectoryLine.clear();
    for (const pt of points) {
      this.trajectoryLine
        .circle(pt.x, pt.y, TRAJECTORY_DOT_RADIUS)
        .fill({ color: 0xffffff, alpha: TRAJECTORY_ALPHA });
    }
  }

  /** 궤적 예측선 숨기기 */
  hideTrajectory(): void {
    this.trajectoryLine.clear();
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
