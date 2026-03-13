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

  // Multiplier
  multiplierPerDistance: 0.001, // was 0.004 - much slower now
  multiplierPerCoin: 0.05, // was 0.08

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
    RunnerSettings.multiplierPerDistance = 0.001;
    RunnerSettings.multiplierPerCoin = 0.05;
    RunnerSettings.enemyDensity = 0.8;
    RunnerSettings.gapSizeMin = 40;
    RunnerSettings.gapSizeMax = 60;
    RunnerSettings.bulletInterval = 5000;
    RunnerSettings.tutorialDistance = 600;
  },
};
