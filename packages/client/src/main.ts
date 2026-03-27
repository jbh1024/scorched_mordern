import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME } from '@scorched/shared';
import { generateTerrain } from './terrain/terrain-generator.js';
import { TerrainRenderer } from './renderer/terrain-renderer.js';
import { Tank } from './core/tank.js';
import { TankRenderer } from './renderer/tank-renderer.js';
import { Projectile, STANDARD_SHELL, predictTrajectory } from './core/projectile.js';
import { ProjectileRenderer } from './renderer/projectile-renderer.js';

const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1];

type GameState = 'player_action' | 'projectile_flight' | 'turn_end';

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

  // 지형 생성
  const seed = 42;
  const { mask, colorData } = generateTerrain(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT, seed);

  const terrainRenderer = new TerrainRenderer(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
  await terrainRenderer.fullRedraw(colorData);
  app.stage.addChild(terrainRenderer.container);

  // 탱크 생성
  const tank1 = new Tank('t1', 'p1', PLAYER_COLORS[0]!);
  const tank2 = new Tank('t2', 'p2', PLAYER_COLORS[1]!);
  const tanks = [tank1, tank2];

  const margin = GAME.WORLD_WIDTH * 0.15;
  tank1.placeOnTerrain(Math.floor(margin), mask);
  tank2.placeOnTerrain(Math.floor(GAME.WORLD_WIDTH - margin), mask);

  const tankRenderers = tanks.map(t => new TankRenderer(t));
  for (const tr of tankRenderers) app.stage.addChild(tr.container);

  // 포탄 렌더러
  const projectileRenderer = new ProjectileRenderer();
  app.stage.addChild(projectileRenderer.container);

  // HUD: 파워 게이지 + 턴 표시
  const hudContainer = new Graphics();
  app.stage.addChild(hudContainer);

  const turnText = new Text({
    text: '',
    style: new TextStyle({ fill: 0xffffff, fontSize: 24, fontWeight: 'bold' }),
  });
  turnText.x = GAME.WORLD_WIDTH / 2;
  turnText.y = 20;
  turnText.anchor.set(0.5, 0);
  app.stage.addChild(turnText);

  // 게임 상태
  let gameState: GameState = 'player_action';
  let currentPlayer = 0;
  let power = 50; // 0~100 (%)
  let projectile: Projectile | null = null;
  const wind = 0; // Phase 1: 바람 없음

  // 키 입력
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    // Space로 발사
    if (e.code === 'Space' && gameState === 'player_action') {
      fire();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  function fire() {
    const tank = tanks[currentPlayer]!;
    const origin = tank.getFireOrigin();
    const actualPower = (power / 100) * GAME.MAX_POWER;

    projectile = new Projectile(
      origin.x,
      origin.y,
      tank.angleRad,
      actualPower,
      STANDARD_SHELL,
      tank.id,
    );

    gameState = 'projectile_flight';
    projectileRenderer.hideTrajectory();
  }

  function nextTurn() {
    // 승패 판정
    const alive = tanks.filter(t => t.isAlive);
    if (alive.length <= 1) {
      const winner = alive[0];
      turnText.text = winner ? `Player ${tanks.indexOf(winner) + 1} Wins!` : 'Draw!';
      gameState = 'turn_end';
      return;
    }

    // 다음 플레이어
    do {
      currentPlayer = (currentPlayer + 1) % tanks.length;
    } while (!tanks[currentPlayer]!.isAlive);

    power = 50;
    gameState = 'player_action';
  }

  // 게임 루프
  app.ticker.add(async (ticker) => {
    const dt = ticker.deltaMS / 1000;
    const tank = tanks[currentPlayer]!;

    if (gameState === 'player_action') {
      // 각도 조절
      if (keys.has('ArrowLeft')) tank.adjustAngle(2);
      if (keys.has('ArrowRight')) tank.adjustAngle(-2);
      // 파워 조절
      if (keys.has('ArrowUp')) power = Math.min(100, power + 1);
      if (keys.has('ArrowDown')) power = Math.max(0, power - 1);

      // 궤적 예측선
      const origin = tank.getFireOrigin();
      const actualPower = (power / 100) * GAME.MAX_POWER;
      const points = predictTrajectory(
        origin.x, origin.y, tank.angleRad, actualPower, wind, mask,
      );
      projectileRenderer.drawTrajectory(points);

      // HUD
      turnText.text = `Player ${currentPlayer + 1} | Angle: ${tank.angle}° | Power: ${power}% | [Space] Fire`;
    }

    if (gameState === 'projectile_flight' && projectile) {
      projectile.update(dt, wind);
      projectile.updateOriginCheck(tank);

      // 충돌 체크
      let hit = false;

      // 탱크 충돌
      for (const t of tanks) {
        if (projectile.checkTankCollision(t)) {
          hit = true;
          break;
        }
      }

      // 지형 충돌
      if (!hit && projectile.checkTerrainCollision(mask)) {
        hit = true;
      }

      if (hit) {
        projectile.explode(mask, colorData, tanks);
        await terrainRenderer.redrawExplosion(mask, colorData,
          Math.floor(projectile.x), Math.floor(projectile.y),
          projectile.config.explosionRadius);

        // 탱크 재배치
        for (const t of tanks) {
          if (t.isAlive) t.placeOnTerrain(t.x, mask);
        }

        projectile = null;
        nextTurn();
      } else if (projectile.isOutOfBounds()) {
        projectile.expire();
        projectile = null;
        nextTurn();
      }
    }

    // 렌더러 갱신
    projectileRenderer.updateBullet(projectile);
    for (const tr of tankRenderers) tr.update();

    // 파워 게이지 HUD
    hudContainer.clear();
    if (gameState === 'player_action') {
      const barX = tank.x - 10;
      const barY = tank.y - 30;
      const barW = 52;
      const barH = 6;
      hudContainer
        .rect(barX, barY, barW, barH)
        .fill({ color: 0x333333 });
      hudContainer
        .rect(barX + 1, barY + 1, (barW - 2) * (power / 100), barH - 2)
        .fill({ color: 0xff8800 });
    }
  });

  console.log(`Scorched Modern initialized - Seed: ${seed}`);
}

init().catch(console.error);
