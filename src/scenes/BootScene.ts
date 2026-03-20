import Phaser from 'phaser';
import { PlaneSprite } from '../objects/PlaneSprite';
import { RunnerSprites } from '../objects/RunnerSprites';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Generate plane texture programmatically
    PlaneSprite.generateTexture(this);

    // Generate runner game textures
    RunnerSprites.generateTextures(this);

    // Generate explosion particles texture
    const particleGfx = this.make.graphics({ x: 0, y: 0 });
    particleGfx.fillStyle(0xffffff);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('particle', 8, 8);
    particleGfx.destroy();

    this.scene.start('CoinRunnerScene');
  }
}
