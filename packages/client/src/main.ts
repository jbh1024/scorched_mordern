import { Application } from 'pixi.js';
import { GAME } from '@scorched/shared';
import { generateTerrain } from './terrain/terrain-generator.js';
import { TerrainRenderer } from './renderer/terrain-renderer.js';
import { Tank } from './core/tank.js';
import { TankRenderer } from './renderer/tank-renderer.js';

// 플레이어 색상
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

  // 지형 생성
  const seed = 42;
  const { mask, colorData } = generateTerrain(
    GAME.WORLD_WIDTH,
    GAME.WORLD_HEIGHT,
    seed,
  );

  // 지형 렌더링
  const terrainRenderer = new TerrainRenderer(GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
  await terrainRenderer.fullRedraw(colorData);
  app.stage.addChild(terrainRenderer.container);

  // 탱크 2대 생성 및 배치
  const tank1 = new Tank('t1', 'p1', PLAYER_COLORS[0]!);
  const tank2 = new Tank('t2', 'p2', PLAYER_COLORS[1]!);

  const margin = GAME.WORLD_WIDTH * 0.15;
  tank1.placeOnTerrain(Math.floor(margin), mask);
  tank2.placeOnTerrain(Math.floor(GAME.WORLD_WIDTH - margin), mask);

  const tankRenderer1 = new TankRenderer(tank1);
  const tankRenderer2 = new TankRenderer(tank2);
  app.stage.addChild(tankRenderer1.container);
  app.stage.addChild(tankRenderer2.container);

  // 현재 턴 플레이어 (0 또는 1)
  let currentPlayer = 0;
  const tanks = [tank1, tank2];
  const tankRenderers = [tankRenderer1, tankRenderer2];

  // 키보드 입력
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => keys.add(e.key));
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  // 게임 루프
  app.ticker.add(() => {
    const tank = tanks[currentPlayer]!;

    // 포탑 각도 조절 (좌우 방향키)
    if (keys.has('ArrowLeft')) tank.adjustAngle(2);
    if (keys.has('ArrowRight')) tank.adjustAngle(-2);

    // 렌더러 갱신
    for (const renderer of tankRenderers) {
      renderer.update();
    }
  });

  // 클릭으로 폭발 테스트 (디버그)
  app.canvas.addEventListener('click', async (e: MouseEvent) => {
    const rect = app.canvas.getBoundingClientRect();
    const scaleX = GAME.WORLD_WIDTH / rect.width;
    const scaleY = GAME.WORLD_HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const radius = 25;

    mask.explode(x, y, radius);

    const minX = Math.max(0, x - radius);
    const maxX = Math.min(GAME.WORLD_WIDTH - 1, x + radius);
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(GAME.WORLD_HEIGHT - 1, y + radius);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        if (!mask.isSolid(px, py)) {
          const ci = (py * GAME.WORLD_WIDTH + px) * 4;
          colorData[ci] = 0;
          colorData[ci + 1] = 0;
          colorData[ci + 2] = 0;
          colorData[ci + 3] = 0;
        }
      }
    }

    await terrainRenderer.redrawExplosion(mask, colorData, x, y, radius);

    // 폭발 후 탱크 재배치 (지형이 깎이면 아래로 떨어짐)
    for (const t of tanks) {
      if (t.isAlive) t.placeOnTerrain(t.x, mask);
    }

    // 턴 교대
    currentPlayer = (currentPlayer + 1) % tanks.length;
    console.log(`Explosion at (${x}, ${y}) - Player ${currentPlayer + 1}'s turn`);
  });

  console.log(`Scorched Modern initialized - Seed: ${seed}`);
}

init().catch(console.error);
