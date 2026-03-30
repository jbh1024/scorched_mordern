import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME } from '@scorched/shared';
import { generateTerrain } from './terrain/terrain-generator.js';
import { TerrainRenderer } from './renderer/terrain-renderer.js';
import { Tank } from './core/tank.js';
import { TankRenderer } from './renderer/tank-renderer.js';
import { ProjectileRenderer } from './renderer/projectile-renderer.js';
import { ParticleSystem } from './renderer/particle-system.js';
import { GameManager } from './core/game-manager.js';
import type { GameEvent } from './core/game-manager.js';
import type { AIDifficulty } from './ai/ai-controller.js';

const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1];

// HUD 레이아웃 상수
const HUD_TEXT_Y = GAME.WORLD_HEIGHT - 50;
const HUD_CONTROLS_Y = GAME.WORLD_HEIGHT - 20;
const CHARGE_BAR_W = 300;
const CHARGE_BAR_H = 12;
const CHARGE_BAR_Y = GAME.WORLD_HEIGHT - 80;

// --- 시작 화면 ---

function setupMenu(): Promise<{ botCount: number; difficulty: AIDifficulty }> {
  return new Promise((resolve) => {
    const startBtn = document.getElementById('start-btn')!;
    const botCountEl = document.getElementById('bot-count') as HTMLSelectElement;
    const difficultyEl = document.getElementById('difficulty') as HTMLSelectElement;

    startBtn.addEventListener('click', () => {
      const botCount = parseInt(botCountEl.value, 10);
      const difficulty = difficultyEl.value as AIDifficulty;

      document.getElementById('menu-screen')!.style.display = 'none';
      document.getElementById('game-container')!.style.display = 'block';

      resolve({ botCount, difficulty });
    });
  });
}

// --- 게임 시작 ---

async function startGame(botCount: number, difficulty: AIDifficulty) {
  const app = new Application();

  await app.init({
    background: '#87CEEB',
    width: GAME.WORLD_WIDTH,
    height: GAME.WORLD_HEIGHT,
    antialias: true,
  });

  const container = document.getElementById('game-container')!;
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
  const seed = Math.floor(Math.random() * 100000);
  const { mask, colorData } = generateTerrain(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT, seed);
  const terrainRenderer = new TerrainRenderer(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
  await terrainRenderer.fullRedraw(colorData);
  app.stage.addChild(terrainRenderer.container);

  // --- 탱크 생성 ---
  const totalPlayers = 1 + botCount;
  const tanks: Tank[] = [];

  // 플레이어
  tanks.push(new Tank('t0', 'p0', PLAYER_COLORS[0]!, 'Player'));

  // 봇
  for (let i = 0; i < botCount; i++) {
    const colorIdx = (i + 1) % PLAYER_COLORS.length;
    tanks.push(new Tank(`t${i + 1}`, `bot${i + 1}`, PLAYER_COLORS[colorIdx]!, `Bot-${i + 1}`, true));
  }

  // 균등 배치
  const marginPct = 0.1;
  const usableWidth = GAME.WORLD_WIDTH * (1 - marginPct * 2);
  const startX = GAME.WORLD_WIDTH * marginPct;
  for (let i = 0; i < tanks.length; i++) {
    const xPos = totalPlayers === 1
      ? GAME.WORLD_WIDTH / 2
      : startX + (usableWidth * i) / (totalPlayers - 1);
    tanks[i]!.placeOnTerrain(Math.floor(xPos), mask);
  }

  const tankRenderers = tanks.map(t => new TankRenderer(t));
  for (const tr of tankRenderers) app.stage.addChild(tr.container);

  // --- 렌더러 ---
  const projectileRenderer = new ProjectileRenderer();
  app.stage.addChild(projectileRenderer.container);

  const particleSystem = new ParticleSystem();
  app.stage.addChild(particleSystem.container);

  // --- HUD ---
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
  const game = new GameManager(tanks, mask, colorData, difficulty);

  // --- 입력 ---
  const keys = new Set<string>();

  window.addEventListener('keydown', (e) => {
    if (keys.has(e.code)) return;
    keys.add(e.code);
    if (e.code === 'Space') game.startCharging();
    if (e.code === 'KeyE') game.cycleWeapon();
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') game.releaseAndFire();
  });

  // --- 이벤트 핸들러 ---
  async function handleEvents(events: GameEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'explosion':
          await terrainRenderer.redrawExplosion(colorData, event.x, event.y, event.radius);
          particleSystem.spawnExplosion(event.x, event.y, event.radius);
          break;
        case 'game_over':
          if (event.winnerId) {
            const winner = tanks.find(t => t.id === event.winnerId);
            hudText.text = `${winner?.name ?? '???'} Wins!`;
          } else {
            hudText.text = 'Draw!';
          }
          controlsText.text = 'Refresh to play again';
          break;
      }
    }
  }

  // --- 게임 루프 ---
  app.ticker.add(async (ticker) => {
    const dt = ticker.deltaMS / 1000;

    // 플레이어 입력
    if (game.state === 'player_action') {
      if (keys.has('ArrowLeft')) game.moveTank(-1, dt);
      if (keys.has('ArrowRight')) game.moveTank(1, dt);
      if (keys.has('ArrowUp')) game.adjustAngle(1);
      if (keys.has('ArrowDown')) game.adjustAngle(-1);
    }

    // 파티클 + 게임 업데이트
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

    // HUD
    hudGraphics.clear();
    const tank = game.currentTank;

    if (game.state === 'player_action') {
      hudText.text = `${tank.name} | Angle: ${tank.angle}° | Fuel: ${Math.floor(tank.fuel)}px | Weapon: Shell`;
      controlsText.text = '←→ Move  ↑↓ Angle  [Space] Hold=Fire  [E] Weapon';
    } else if (game.state === 'charging') {
      hudText.text = `${tank.name} | CHARGING: ${Math.floor(game.power)}%`;
      const barX = (GAME.WORLD_WIDTH - CHARGE_BAR_W) / 2;
      hudGraphics.rect(barX, CHARGE_BAR_Y, CHARGE_BAR_W, CHARGE_BAR_H).fill({ color: 0x333333 });
      hudGraphics.rect(barX, CHARGE_BAR_Y, CHARGE_BAR_W * (game.power / 100), CHARGE_BAR_H).fill({ color: 0xff4400 });
    } else if (game.state === 'ai_thinking') {
      hudText.text = `${tank.name} is thinking...`;
      controlsText.text = '';
    } else if (game.state === 'ai_charging') {
      hudText.text = `${tank.name} | FIRE! ${Math.floor(game.power)}%`;
      const barX = (GAME.WORLD_WIDTH - CHARGE_BAR_W) / 2;
      hudGraphics.rect(barX, CHARGE_BAR_Y, CHARGE_BAR_W, CHARGE_BAR_H).fill({ color: 0x333333 });
      hudGraphics.rect(barX, CHARGE_BAR_Y, CHARGE_BAR_W * (game.power / 100), CHARGE_BAR_H).fill({ color: 0x3498db });
    } else if (game.state === 'projectile_flight') {
      hudText.text = '...';
      controlsText.text = '';
    }
  });

  console.log(`Scorched Modern started - Seed: ${seed}, Bots: ${botCount}, Difficulty: ${difficulty}`);
}

// --- 엔트리 포인트 ---

async function main() {
  const settings = await setupMenu();
  await startGame(settings.botCount, settings.difficulty);
}

main().catch(console.error);
