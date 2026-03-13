/**
 * Singleton settings for Coin Runner game.
 * All configurable parameters in one place.
 */
export const RunnerSettings = {
  // Physics
  gravity: 0.3,
  jumpForce: -14.0,

  // Speed
  baseSpeed: 3.0,
  maxSpeed: 8.0,
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

  // Roulette mechanic - chance first obstacle is impossible
  instantDeathChance: 0.03, // 3% chance

  // Tutorial
  tutorialDistance: 600,

  // Reset to defaults
  reset(): void {
    RunnerSettings.gravity = 0.3;
    RunnerSettings.jumpForce = -14.0;
    RunnerSettings.baseSpeed = 3.0;
    RunnerSettings.maxSpeed = 8.0;
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
    RunnerSettings.instantDeathChance = 0.03;
    RunnerSettings.tutorialDistance = 600;
  },
};
