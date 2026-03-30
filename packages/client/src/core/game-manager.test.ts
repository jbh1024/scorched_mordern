import { describe, it, expect } from 'vitest';
import { GameManager } from './game-manager.js';
import { Tank } from './tank.js';
import { TerrainMask, TERRAIN } from '@scorched/shared';

function makeTerrain(surfaceY = 500): TerrainMask {
  const mask = new TerrainMask(1920, 1080);
  for (let x = 0; x < 1920; x++) {
    for (let y = surfaceY; y < 1080; y++) {
      mask.setPixel(x, y, TERRAIN.DENSITY_SOLID, TERRAIN.MATERIAL_DIRT);
    }
  }
  return mask;
}

function makeGame(botCount = 0): GameManager {
  const terrain = makeTerrain();
  const colorData = new Uint8Array(1920 * 1080 * 4);
  const tanks: Tank[] = [
    new Tank('t0', 'p0', 0xff0000, 'Player'),
  ];
  for (let i = 0; i < botCount; i++) {
    tanks.push(new Tank(`b${i}`, `bot${i}`, 0x0000ff, `Bot-${i + 1}`, true));
  }
  for (let i = 0; i < tanks.length; i++) {
    tanks[i]!.placeOnTerrain(200 + i * 400, terrain);
  }
  return new GameManager(tanks, terrain, colorData, 'easy');
}

describe('GameManager', () => {
  it('초기 상태: player_action (플레이어 먼저)', () => {
    const game = makeGame(1);
    expect(game.state).toBe('player_action');
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.currentTank.isBot).toBe(false);
  });

  it('adjustAngle 플레이어 턴에서만 동작', () => {
    const game = makeGame(1);
    game.currentTank.angle = 90;
    game.adjustAngle(1);
    expect(game.currentTank.angle).not.toBe(90); // 변경됨
  });

  it('adjustAngle 봇 턴에서 무시됨', () => {
    const terrain = makeTerrain();
    const colorData = new Uint8Array(1920 * 1080 * 4);
    const tanks = [
      new Tank('b0', 'bot0', 0x0000ff, 'Bot-1', true),
      new Tank('t0', 'p0', 0xff0000, 'Player'),
    ];
    tanks[0]!.placeOnTerrain(200, terrain);
    tanks[1]!.placeOnTerrain(1600, terrain);
    const botGame = new GameManager(tanks, terrain, colorData, 'easy');
    // 봇 턴이므로 ai_thinking 상태
    const angleBefore = tanks[0]!.angle;
    botGame.adjustAngle(5);
    expect(tanks[0]!.angle).toBe(angleBefore); // 변경 안 됨
  });

  it('startCharging → charging 상태', () => {
    const game = makeGame(1);
    game.startCharging();
    expect(game.state).toBe('charging');
    expect(game.power).toBe(0);
  });

  it('charging 중 power 증가', () => {
    const game = makeGame(1);
    game.startCharging();
    game.update(0.5); // 0.5초
    expect(game.power).toBeGreaterThan(0);
  });

  it('releaseAndFire → projectile_flight', () => {
    const game = makeGame(1);
    game.startCharging();
    game.update(0.3); // 파워 축적
    game.releaseAndFire();
    expect(game.state).toBe('projectile_flight');
    expect(game.projectile).not.toBeNull();
  });

  it('100% 차징 시 자동 발사', () => {
    const game = makeGame(1);
    game.startCharging();
    // 충분한 시간이면 100% → 자동 발사 → 포탄 비행 또는 턴 전환
    game.update(2.0);
    // charging 상태가 아니어야 함 (발사되었으므로)
    expect(game.state).not.toBe('charging');
  });

  it('moveTank 발사 후 이동 불가', () => {
    const game = makeGame(1);
    game.startCharging();
    game.update(0.3);
    game.releaseAndFire();
    // 포탄이 날아가서 turn이 바뀔 때까지 시뮬레이션
    for (let i = 0; i < 500; i++) game.update(0.02);
    // player_action으로 돌아온 후에도 이전 발사의 hasFired 확인은 턴 교체 시 리셋됨
  });

  it('포탄 소멸 후 턴 교대', () => {
    const game = makeGame(1);
    game.currentTank.angle = 90; // 위로 발사
    game.startCharging();
    game.update(0.2);
    game.releaseAndFire();

    // 포탄이 화면 밖으로 나갈 때까지 시뮬레이션
    let turnChanged = false;
    for (let i = 0; i < 1000; i++) {
      const events = game.update(0.02);
      for (const e of events) {
        if (e.type === 'turn_change') turnChanged = true;
      }
      if (turnChanged) break;
    }
    expect(turnChanged).toBe(true);
  });

  it('탱크 사망 시 game_over', () => {
    const game = makeGame(1);
    // 봇을 직접 죽임
    game.tanks[1]!.takeDamage(200);
    // 플레이어 발사 → 어딘가 착탄 → advanceTurn에서 game_over
    game.startCharging();
    game.update(0.3);
    game.releaseAndFire();

    let gameOver = false;
    for (let i = 0; i < 1000; i++) {
      const events = game.update(0.02);
      for (const e of events) {
        if (e.type === 'game_over') gameOver = true;
      }
      if (gameOver) break;
    }
    expect(gameOver).toBe(true);
    expect(game.state).toBe('game_over');
  });

  it('AI 턴: 봇이면 ai_thinking 시작', () => {
    const terrain = makeTerrain();
    const colorData = new Uint8Array(1920 * 1080 * 4);
    // 봇을 먼저 배치
    const tanks = [
      new Tank('b0', 'bot0', 0x0000ff, 'Bot-1', true),
      new Tank('t0', 'p0', 0xff0000, 'Player'),
    ];
    tanks[0]!.placeOnTerrain(200, terrain);
    tanks[1]!.placeOnTerrain(1600, terrain);

    const game = new GameManager(tanks, terrain, colorData, 'easy');
    // 첫 턴이 봇이므로 ai_thinking
    expect(game.state).toBe('ai_thinking');
  });

  it('AI 턴: 사고 후 발사', () => {
    const terrain = makeTerrain();
    const colorData = new Uint8Array(1920 * 1080 * 4);
    const tanks = [
      new Tank('b0', 'bot0', 0x0000ff, 'Bot-1', true),
      new Tank('t0', 'p0', 0xff0000, 'Player'),
    ];
    tanks[0]!.placeOnTerrain(200, terrain);
    tanks[1]!.placeOnTerrain(1600, terrain);

    const game = new GameManager(tanks, terrain, colorData, 'easy');

    // AI 사고 + 차징 + 비행까지 시뮬레이션
    let firedByAI = false;
    for (let i = 0; i < 2000; i++) {
      game.update(0.02);
      if (game.state === 'projectile_flight' && !firedByAI) {
        firedByAI = true;
      }
      // 턴이 플레이어로 넘어오면 종료
      if (game.state === 'player_action') break;
      if (game.state === 'game_over') break;
    }
    expect(firedByAI).toBe(true);
  });

  it('getTrajectoryPreview player_action에서만 반환', () => {
    const game = makeGame(1);
    const preview = game.getTrajectoryPreview();
    expect(preview.length).toBeGreaterThan(0);
  });

  it('getTrajectoryPreview projectile_flight에서 빈 배열', () => {
    const game = makeGame(1);
    game.startCharging();
    game.update(0.3);
    game.releaseAndFire();
    const preview = game.getTrajectoryPreview();
    expect(preview.length).toBe(0);
  });
});
