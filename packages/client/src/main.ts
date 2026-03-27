import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME } from '@scorched/shared';
import { generateTerrain } from './terrain/terrain-generator.js';
import { TerrainRenderer } from './renderer/terrain-renderer.js';
import { Tank } from './core/tank.js';
import { TankRenderer } from './renderer/tank-renderer.js';
import { ProjectileRenderer } from './renderer/projectile-renderer.js';
import { GameManager } from './core/game-manager.js';
import type { GameEvent } from './core/game-manager.js';
import { ParticleSystem } from './renderer/particle-system.js';

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
  const tank1 = new Tank('t1', 'p1', PLAYER_COLORS[0]!, 'Player 1');
  const tank2 = new Tank('t2', 'p2', PLAYER_COLORS[1]!, 'Player 2');
  const tanks = [tank1, tank2];

  const margin = GAME.WORLD_WIDTH * 0.15;
  tank1.placeOnTerrain(Math.floor(margin), mask);
  tank2.placeOnTerrain(Math.floor(GAME.WORLD_WIDTH - margin), mask);

  const tankRenderers = tanks.map(t => new TankRenderer(t));
  for (const tr of tankRenderers) app.stage.addChild(tr.container);

  // --- 포탄 렌더러 ---
  const projectileRenderer = new ProjectileRenderer();
  app.stage.addChild(projectileRenderer.container);

  // --- 파티클 시스템 ---
  const particleSystem = new ParticleSystem();
  app.stage.addChild(particleSystem.container);

  // --- HUD (하단) ---
  const HUD_TEXT_Y = GAME.WORLD_HEIGHT - 50;
  const HUD_CONTROLS_Y = GAME.WORLD_HEIGHT - 20;
  const CHARGE_BAR_W = 300;
  const CHARGE_BAR_H = 12;
  const CHARGE_BAR_Y = GAME.WORLD_HEIGHT - 80;

  const hudGraphics = new Graphics();
  app.stage.addChild(hudGraphics);

  const hudText = new Text({
    text: '',
    style: new TextStyle({ fill: 0xffffff, fontSize: 20, fontWeight: 'bold' }),
  });
  hudText.x = GAME.WORLD_WIDTH / 2;
  hudText.y = HUD_TEXT_Y;
  hudText.anchor.set(0.5, 0);
  app.stage.addChild(hudText);

  const controlsText = new Text({
    text: '←→ Move  ↑↓ Angle  [Space] Hold=Fire  [E] Weapon',
    style: new TextStyle({ fill: 0xaaaaaa, fontSize: 14 }),
  });
  controlsText.x = GAME.WORLD_WIDTH / 2;
  controlsText.y = HUD_CONTROLS_Y;
  controlsText.anchor.set(0.5, 0);
  app.stage.addChild(controlsText);

  // --- GameManager ---
  const game = new GameManager(tanks, mask, colorData);

  // --- 입력 ---
  const keys = new Set<string>();

  window.addEventListener('keydown', (e) => {
    if (keys.has(e.code)) return; // 키 반복 방지
    keys.add(e.code);

    if (e.code === 'Space' && game.state === 'player_action') {
      game.startCharging();
    }
    if (e.code === 'KeyE') {
      game.cycleWeapon();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);

    if (e.code === 'Space' && game.state === 'charging') {
      game.releaseAndFire();
    }
  });

  // --- 이벤트 핸들러 ---
  async function handleEvents(events: GameEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'explosion':
          await terrainRenderer.redrawExplosion(
            colorData, event.x, event.y, event.radius,
          );
          particleSystem.spawnExplosion(event.x, event.y, event.radius);
          break;
        case 'game_over':
          if (event.winnerId) {
            const winner = tanks.find(t => t.id === event.winnerId);
            hudText.text = `${winner?.name ?? '???'} Wins!`;
          } else {
            hudText.text = 'Draw!';
          }
          controlsText.text = '';
          break;
      }
    }
  }

  // --- 게임 루프 ---
  app.ticker.add(async (ticker) => {
    const dt = ticker.deltaMS / 1000;

    // 입력 처리
    if (game.state === 'player_action') {
      if (keys.has('ArrowLeft')) game.moveTank(-1, dt);
      if (keys.has('ArrowRight')) game.moveTank(1, dt);
      if (keys.has('ArrowUp')) game.adjustAngle(1);
      if (keys.has('ArrowDown')) game.adjustAngle(-1);
    }

    // 게임 + 파티클 업데이트
    particleSystem.update(dt);
    const events = game.update(dt);
    if (events.length > 0) {
      await handleEvents(events);
    }

    // --- 렌더링 ---

    projectileRenderer.updateBullet(game.projectile);

    if (game.state === 'player_action' || game.state === 'charging') {
      projectileRenderer.drawTrajectory(game.getTrajectoryPreview());
    } else {
      projectileRenderer.hideTrajectory();
    }

    for (const tr of tankRenderers) tr.update();

    // HUD 하단
    hudGraphics.clear();
    if (game.state === 'player_action') {
      const tank = game.currentTank;
      hudText.text = `${tank.name} | Angle: ${tank.angle}° | Fuel: ${Math.floor(tank.fuel)}px | Weapon: Shell`;
    } else if (game.state === 'charging') {
      const tank = game.currentTank;
      hudText.text = `${tank.name} | CHARGING: ${Math.floor(game.power)}%`;

      const barX = (GAME.WORLD_WIDTH - CHARGE_BAR_W) / 2;
      hudGraphics.rect(barX, CHARGE_BAR_Y, CHARGE_BAR_W, CHARGE_BAR_H).fill({ color: 0x333333 });
      hudGraphics.rect(barX, CHARGE_BAR_Y, CHARGE_BAR_W * (game.power / 100), CHARGE_BAR_H).fill({ color: 0xff4400 });
    } else if (game.state === 'projectile_flight') {
      hudText.text = '...';
    }
  });

  console.log(`Scorched Modern initialized - Seed: ${seed}`);
}

init().catch(console.error);
