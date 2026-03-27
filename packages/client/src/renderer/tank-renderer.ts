import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TANK } from '@scorched/shared';
import type { Tank } from '../core/tank.js';

const TURRET_LENGTH = TANK.WIDTH * 0.8;
const HP_BAR_WIDTH = TANK.WIDTH + 8;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = 10;
const NAME_OFFSET_Y = 22;

/**
 * 탱크 한 대를 PixiJS Graphics로 렌더링한다.
 * 이름 → HP 바 → 포탑 → 본체 (위에서 아래 순서)
 */
export class TankRenderer {
  readonly container: Container;
  private readonly bodyContainer: Container; // 본체+포탑 (기울기 회전용)
  private readonly body: Graphics;
  private readonly turret: Graphics;
  private readonly hpBarBg: Graphics;
  private readonly hpBar: Graphics;
  private readonly nameText: Text;
  private readonly tank: Tank;

  constructor(tank: Tank) {
    this.tank = tank;
    this.container = new Container();

    // 본체+포탑 컨테이너 (기울기 회전 적용 대상)
    this.bodyContainer = new Container();
    this.bodyContainer.pivot.set(TANK.WIDTH / 2, TANK.HEIGHT);
    this.container.addChild(this.bodyContainer);

    // 탱크 본체
    this.body = new Graphics();
    this.bodyContainer.addChild(this.body);

    // 포탑
    this.turret = new Graphics();
    this.bodyContainer.addChild(this.turret);

    // 이름 텍스트
    this.nameText = new Text({
      text: tank.name,
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: 12,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 },
      }),
    });
    this.nameText.anchor.set(0.5, 1);
    this.container.addChild(this.nameText);

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
    this.body.clear();
    // 하부
    this.body.rect(0, TANK.HEIGHT * 0.4, TANK.WIDTH, TANK.HEIGHT * 0.6).fill({ color });
    // 상부 (돔)
    this.body.ellipse(TANK.WIDTH / 2, TANK.HEIGHT * 0.4, TANK.WIDTH * 0.35, TANK.HEIGHT * 0.4).fill({ color });
  }

  update(): void {
    const tank = this.tank;

    // 본체+포탑 위치 및 기울기
    this.bodyContainer.x = tank.x + TANK.WIDTH / 2;
    this.bodyContainer.y = tank.y + TANK.HEIGHT;
    this.bodyContainer.rotation = tank.bodyAngle;

    // 포탑
    this.turret.clear();
    const centerX = TANK.WIDTH / 2;
    const centerY = TANK.HEIGHT * 0.4;
    const rad = tank.angleRad;
    const endX = centerX + Math.cos(rad) * TURRET_LENGTH;
    const endY = centerY - Math.sin(rad) * TURRET_LENGTH;
    this.turret.moveTo(centerX, centerY).lineTo(endX, endY).stroke({ color: 0x333333, width: 4 });

    // 이름 (본체 기울기와 무관하게 수평 유지)
    this.nameText.text = tank.name;
    this.nameText.x = tank.x + TANK.WIDTH / 2;
    this.nameText.y = tank.y - NAME_OFFSET_Y;

    // HP 바 (수평 유지)
    const hpRatio = tank.hp / TANK.HP;
    const barX = tank.x + (TANK.WIDTH - HP_BAR_WIDTH) / 2;
    const barY = tank.y - HP_BAR_OFFSET_Y;

    this.hpBarBg.clear();
    this.hpBarBg.rect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT).fill({ color: 0x333333 });

    this.hpBar.clear();
    const hpColor = hpRatio > 0.5 ? 0x00cc00 : hpRatio > 0.25 ? 0xcccc00 : 0xcc0000;
    this.hpBar.rect(barX, barY, HP_BAR_WIDTH * hpRatio, HP_BAR_HEIGHT).fill({ color: hpColor });

    // 사망 시 숨김
    this.container.visible = tank.isAlive;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
