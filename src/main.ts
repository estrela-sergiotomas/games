import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CrashScene } from './scenes/CrashScene';
import { CoinRunnerScene } from './scenes/CoinRunnerScene';
import { GAME_CONFIG } from './utils/constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0f0f23',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    touch: true,
  },
  scene: [BootScene, MenuScene, CrashScene, CoinRunnerScene],
};

const game = new Phaser.Game(config);

// Fire game-ready for splash screen
game.events.on('ready', () => {
  window.dispatchEvent(new Event('game-ready'));
});
setTimeout(() => {
  window.dispatchEvent(new Event('game-ready'));
}, 2500);
