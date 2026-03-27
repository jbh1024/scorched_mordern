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

export const TERRAIN = {
  /** R channel: 빈 공간 */
  DENSITY_EMPTY: 0,
  /** R channel: 고체 지형 */
  DENSITY_SOLID: 255,
  /** G channel: 흙 */
  MATERIAL_DIRT: 0,
  /** G channel: 바위 (파괴 저항) */
  MATERIAL_ROCK: 128,
  /** G channel: 파괴 불가 */
  MATERIAL_INDESTRUCTIBLE: 255,
} as const;
