/**
 * Singleton settings for Coin Runner game.
 * All configurable parameters in one place.
 */
export const RunnerSettings = {
  // Physics
  gravity: 0.6,
  jumpForce: -10.5,

  // Speed
  baseSpeed: 2.5,
  maxSpeed: 4.5,
  speedThreshold: 10, // multiplier value where speed starts increasing
  speedScaling: 0.15, // how fast speed increases after threshold

  // Multiplier (coin-based only)
  multiplierPerCoin: 0.01, // each normal coin adds +0.01x
  premiumCoinValue: 0.10, // premium coin adds +0.10x
  premiumCoinChance: 0.08, // 8% chance a coin spawns as premium

  // Magic blocks
  magicBlockChance: 0.05, // 5% chance a qblock is magic (challenge block)

  // Poison mushroom
  poisonMushroomChance: 0.08, // 8% chance per segment

  // Difficulty
  enemyDensity: 0.8, // 0-1 scale, higher = more enemies
  gapSizeMin: 40,
  gapSizeMax: 60,

  // Bullet Bills
  bulletInterval: 5000, // ms between bullet spawns

  // Tutorial
  tutorialDistance: 600,

  // Reset to defaults
  reset(): void {
    RunnerSettings.gravity = 0.6;
    RunnerSettings.jumpForce = -10.5;
    RunnerSettings.baseSpeed = 2.5;
    RunnerSettings.maxSpeed = 4.5;
    RunnerSettings.speedThreshold = 10;
    RunnerSettings.speedScaling = 0.15;
    RunnerSettings.multiplierPerCoin = 0.01;
    RunnerSettings.premiumCoinValue = 0.10;
    RunnerSettings.premiumCoinChance = 0.08;
    RunnerSettings.magicBlockChance = 0.05;
    RunnerSettings.poisonMushroomChance = 0.08;
    RunnerSettings.enemyDensity = 0.8;
    RunnerSettings.gapSizeMin = 40;
    RunnerSettings.gapSizeMax = 60;
    RunnerSettings.bulletInterval = 5000;
    RunnerSettings.tutorialDistance = 600;
  },
};
