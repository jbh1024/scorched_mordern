import { Application } from 'pixi.js';
import { GAME } from '@scorched/shared';

async function init() {
  const app = new Application();

  await app.init({
    background: '#1a1a2e',
    resizeTo: window,
    antialias: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');
  container.appendChild(app.canvas);

  console.log(
    `Scorched Modern initialized - World: ${GAME.WORLD_WIDTH}x${GAME.WORLD_HEIGHT}`,
  );
}

init().catch(console.error);
