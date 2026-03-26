export const GAME = {
  WORLD_WIDTH: 1920,
  WORLD_HEIGHT: 1080,
  TERRAIN_HEIGHT: 600,
  GRAVITY: 980,
  MAX_POWER: 1000,
  TURN_TIME_LIMIT: 30,
  MAX_PLAYERS: 8,
  STARTING_GOLD: 500,
} as const;

export const WIND = {
  MIN: -200,
  MAX: 200,
  CHANGE_PER_TURN: 50,
} as const;

export const TANK = {
  HP: 100,
  WIDTH: 32,
  HEIGHT: 24,
  FUEL_PER_TURN: 100,
  MAX_CLIMB_ANGLE: 45,
} as const;
