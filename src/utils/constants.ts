export const GAME_CONFIG = {
  WIDTH: 420,
  HEIGHT: 780,
  INITIAL_BALANCE: 1000,
  DEFAULT_BET: 10,
  MIN_BET: 1,
  HOUSE_EDGE: 0.04,
  INSTANT_CRASH_CHANCE: 0.03,
  MULTIPLIER_SPEED: 0.15,
} as const;

export const COLORS = {
  BG_DARK: 0x0f0f23,
  BG_PANEL: 0x1a1a3e,
  BORDER: 0x2a2a5e,
  CYAN: 0x4ecdc4,
  RED: 0xff4757,
  GOLD: 0xffd700,
  GREEN: 0x2ecc71,
  WHITE: 0xffffff,
  GRAY: 0x888888,
  LIGHT_GRAY: 0xe0e0e0,
  ORANGE: 0xff6600,
  YELLOW: 0xffcc00,
  PURPLE: 0xa855f7,
} as const;
