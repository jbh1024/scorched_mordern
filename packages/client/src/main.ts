import { Application } from 'pixi.js';
import { GAME } from '@scorched/shared';
import { generateTerrain } from './terrain/terrain-generator.js';
import { TerrainRenderer } from './renderer/terrain-renderer.js';

async function init() {
  const app = new Application();

  await app.init({
    background: '#87CEEB', // 하늘색 배경
    width: GAME.WORLD_WIDTH,
    height: GAME.WORLD_HEIGHT,
    antialias: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');
  container.appendChild(app.canvas);

  // 캔버스를 화면에 맞게 스케일링
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

  // 지형 생성 (seed: 42)
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

  console.log(
    `Scorched Modern initialized - Seed: ${seed}, World: ${GAME.WORLD_WIDTH}x${GAME.WORLD_HEIGHT}`,
  );

  // 디버그: 클릭으로 폭발 테스트
  app.canvas.addEventListener('click', async (e: MouseEvent) => {
    const rect = app.canvas.getBoundingClientRect();
    const scaleX = GAME.WORLD_WIDTH / rect.width;
    const scaleY = GAME.WORLD_HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const radius = 25;

    mask.explode(x, y, radius);

    // colorData에서 폭발 영역을 투명으로 갱신
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
    console.log(`Explosion at (${x}, ${y}) radius=${radius}`);
  });
}

init().catch(console.error);
