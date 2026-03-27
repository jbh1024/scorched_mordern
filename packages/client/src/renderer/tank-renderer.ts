import { Container, Graphics } from 'pixi.js';
import { TANK } from '@scorched/shared';
import type { Tank } from '../core/tank.js';

const TURRET_LENGTH = TANK.WIDTH * 0.8;
const HP_BAR_WIDTH = TANK.WIDTH + 8;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = 10;

/**
 * 탱크 한 대를 PixiJS Graphics로 렌더링한다.
 * 본체(사각형) + 포탑(선) + HP 바
 */
export class TankRenderer {
  readonly container: Container;
  private readonly body: Graphics;
  private readonly turret: Graphics;
  private readonly hpBarBg: Graphics;
  private readonly hpBar: Graphics;
  private readonly tank: Tank;

  constructor(tank: Tank) {
    this.tank = tank;
    this.container = new Container();

    // 탱크 본체
    this.body = new Graphics();
    this.container.addChild(this.body);

    // 포탑
    this.turret = new Graphics();
    this.container.addChild(this.turret);

    // HP 바 배경
    this.hpBarBg = new Graphics();
    this.container.addChild(this.hpBarBg);

    // HP 바
    this.hpBar = new Graphics();
    this.container.addChild(this.hpBar);

    this.drawBody();
    this.update();
  }

  private drawBody(): void {
    const color = this.tank.color;

    // 탱크 본체 (반원 + 사각형)
    this.body.clear();

    // 하부 (사각형)
    this.body
      .rect(0, TANK.HEIGHT * 0.4, TANK.WIDTH, TANK.HEIGHT * 0.6)
      .fill({ color });

    // 상부 (반원형 돔)
    this.body
      .ellipse(TANK.WIDTH / 2, TANK.HEIGHT * 0.4, TANK.WIDTH * 0.35, TANK.HEIGHT * 0.4)
      .fill({ color });
  }

  /** 탱크 상태에 따라 렌더링을 갱신한다 */
  update(): void {
    const tank = this.tank;

    // 위치
    this.container.x = tank.x;
    this.container.y = tank.y;

    // 포탑 그리기
    this.turret.clear();
    const centerX = TANK.WIDTH / 2;
    const centerY = TANK.HEIGHT * 0.4;
    const rad = tank.angleRad;
    const endX = centerX + Math.cos(rad) * TURRET_LENGTH;
    const endY = centerY - Math.sin(rad) * TURRET_LENGTH;

    this.turret
      .moveTo(centerX, centerY)
      .lineTo(endX, endY)
      .stroke({ color: 0x333333, width: 4 });

    // HP 바
    const hpRatio = tank.hp / TANK.HP;
    const barX = (TANK.WIDTH - HP_BAR_WIDTH) / 2;
    const barY = -HP_BAR_OFFSET_Y;

    this.hpBarBg.clear();
    this.hpBarBg
      .rect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT)
      .fill({ color: 0x333333 });

    this.hpBar.clear();
    const hpColor = hpRatio > 0.5 ? 0x00cc00 : hpRatio > 0.25 ? 0xcccc00 : 0xcc0000;
    this.hpBar
      .rect(barX, barY, HP_BAR_WIDTH * hpRatio, HP_BAR_HEIGHT)
      .fill({ color: hpColor });

    // 사망 시 숨김
    this.container.visible = tank.isAlive;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
