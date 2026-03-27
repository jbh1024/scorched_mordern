import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME } from '@scorched/shared';
import { generateTerrain } from './terrain/terrain-generator.js';
import { TerrainRenderer } from './renderer/terrain-renderer.js';
import { Tank } from './core/tank.js';
import { TankRenderer } from './renderer/tank-renderer.js';
import { ProjectileRenderer } from './renderer/projectile-renderer.js';
import { GameManager } from './core/game-manager.js';
import type { GameEvent } from './core/game-manager.js';

const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1];

async function init() {
  const app = new Application();

  await app.init({
    background: '#87CEEB',
    width: GAME.WORLD_WIDTH,
    height: GAME.WORLD_HEIGHT,
    antialias: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');
  container.appendChild(app.canvas);

  function resize() {
    const scale = Math.min(
      window.innerWidth / GAME.WORLD_WIDTH,
      window.innerHeight / GAME.WORLD_HEIGHT,
    );
    app.canvas.style.width = `${GAME.WORLD_WIDTH * scale}px`;
    app.canvas.style.height = `${GAME.WORLD_HEIGHT * scale}px`;
  }
  resize();
  window.addEventListener('resize', resize);

  // --- 지형 ---
  const seed = 42;
  const { mask, colorData } = generateTerrain(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT, seed);
  const terrainRenderer = new TerrainRenderer(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
  await terrainRenderer.fullRedraw(colorData);
  app.stage.addChild(terrainRenderer.container);

  // --- 탱크 ---
  const tank1 = new Tank('t1', 'p1', PLAYER_COLORS[0]!);
  const tank2 = new Tank('t2', 'p2', PLAYER_COLORS[1]!);
  const tanks = [tank1, tank2];

  const margin = GAME.WORLD_WIDTH * 0.15;
  tank1.placeOnTerrain(Math.floor(margin), mask);
  tank2.placeOnTerrain(Math.floor(GAME.WORLD_WIDTH - margin), mask);

  const tankRenderers = tanks.map(t => new TankRenderer(t));
  for (const tr of tankRenderers) app.stage.addChild(tr.container);

  // --- 포탄 렌더러 ---
  const projectileRenderer = new ProjectileRenderer();
  app.stage.addChild(projectileRenderer.container);

  // --- HUD ---
  const hudGraphics = new Graphics();
  app.stage.addChild(hudGraphics);

  const turnText = new Text({
    text: '',
    style: new TextStyle({ fill: 0xffffff, fontSize: 24, fontWeight: 'bold' }),
  });
  turnText.x = GAME.WORLD_WIDTH / 2;
  turnText.y = 20;
  turnText.anchor.set(0.5, 0);
  app.stage.addChild(turnText);

  // --- GameManager ---
  const game = new GameManager(tanks, mask, colorData);

  // --- 입력 ---
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') game.fire();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  // --- 이벤트 핸들러 ---
  async function handleEvents(events: GameEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'explosion':
          await terrainRenderer.redrawExplosion(
            mask, colorData, event.x, event.y, event.radius,
          );
          break;
        case 'game_over':
          if (event.winnerId) {
            const idx = tanks.findIndex(t => t.id === event.winnerId);
            turnText.text = `Player ${idx + 1} Wins!`;
          } else {
            turnText.text = 'Draw!';
          }
          break;
      }
    }
  }

  // --- 게임 루프 ---
  app.ticker.add(async (ticker) => {
    const dt = ticker.deltaMS / 1000;

    // 입력 처리
    if (game.state === 'player_action') {
      if (keys.has('ArrowLeft')) game.adjustAngle(2);
      if (keys.has('ArrowRight')) game.adjustAngle(-2);
      if (keys.has('ArrowUp')) game.adjustPower(1);
      if (keys.has('ArrowDown')) game.adjustPower(-1);
    }

    // 게임 업데이트
    const events = game.update(dt);
    if (events.length > 0) {
      await handleEvents(events);
    }

    // --- 렌더링 갱신 ---

    // 포탄
    projectileRenderer.updateBullet(game.projectile);

    // 궤적 예측선
    if (game.state === 'player_action') {
      projectileRenderer.drawTrajectory(game.getTrajectoryPreview());
    } else {
      projectileRenderer.hideTrajectory();
    }

    // 탱크
    for (const tr of tankRenderers) tr.update();

    // HUD
    hudGraphics.clear();
    if (game.state === 'player_action') {
      const tank = game.currentTank;
      turnText.text = `Player ${game.currentPlayerIndex + 1} | Angle: ${tank.angle}° | Power: ${game.power}% | [Space] Fire`;

      // 파워 게이지
      const barX = tank.x - 10;
      const barY = tank.y - 30;
      hudGraphics.rect(barX, barY, 52, 6).fill({ color: 0x333333 });
      hudGraphics.rect(barX + 1, barY + 1, 50 * (game.power / 100), 4).fill({ color: 0xff8800 });
    }
  });

  console.log(`Scorched Modern initialized - Seed: ${seed}`);
}

init().catch(console.error);
