import Phaser from 'phaser';
import { PlaneSprite } from '../objects/PlaneSprite';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const base = 'sprites/';

    // Player
    this.load.image('runner', base + 'player_stand.png');
    this.load.image('runner_jump', base + 'player_jump.png');
    this.load.image('runner_hurt', base + 'player_hurt.png');

    // Walk: load spritesheet (256x512, 11 frames ~67x93 each, 4 cols)
    this.load.spritesheet('player_walk_sheet', base + 'player_walk.png', {
      frameWidth: 73,
      frameHeight: 97,
    });

    // Tiles
    this.load.image('ground', base + 'ground_mid.png');
    this.load.image('ground_left', base + 'ground_left.png');
    this.load.image('ground_right', base + 'ground_right.png');
    this.load.image('ground_center', base + 'ground_center.png');
    this.load.image('platform', base + 'platform_mid.png');
    this.load.image('platform_left', base + 'platform_left.png');
    this.load.image('platform_right', base + 'platform_right.png');
    this.load.image('hill_large', base + 'hill_large.png');
    this.load.image('hill_small', base + 'hill_small.png');

    // Items
    this.load.image('coin', base + 'coin_gold.png');
    this.load.image('coin_tutorial', base + 'coin_silver.png');
    this.load.image('coin_premium', base + 'gem_blue.png');
    this.load.image('qblock', base + 'qblock.png');
    this.load.image('magic_block', base + 'magic_block.png');
    this.load.image('mushroom', base + 'mushroom_red.png');
    this.load.image('mushroom_poison', base + 'mushroom_brown.png');
    this.load.image('star', base + 'star.png');
    this.load.image('spikes', base + 'spikes.png');

    // Enemies
    this.load.image('enemy_goomba', base + 'enemy_slime1.png');
    this.load.image('enemy_koopa', base + 'enemy_snail1.png');
    this.load.image('enemy_spiny', base + 'enemy_fly1.png');
    this.load.image('enemy_bobomb', base + 'enemy_blocker.png');
    this.load.image('enemy_bullet', base + 'fireball.png');
    this.load.image('enemy_piranha', base + 'plant_purple.png');

    // Environment
    this.load.image('cloud', base + 'cloud1.png');
    this.load.image('cloud2', base + 'cloud2.png');
    this.load.image('cloud3', base + 'cloud3.png');
    this.load.image('bg', base + 'bg.png');

    // HUD
    this.load.image('hud_heart', base + 'hud_heart.png');
    this.load.image('hud_coins', base + 'hud_coins.png');
  }

  create(): void {
    // Generate plane texture programmatically (for CrashScene)
    PlaneSprite.generateTexture(this);

    // Generate walk animation frames from spritesheet
    const walkSheet = this.textures.get('player_walk_sheet');
    if (walkSheet.key !== '__MISSING') {
      // Extract frames 0 and 5 as walk1 and walk2
      const canvas1 = this.textures.createCanvas('runner_walk1', 73, 97);
      const ctx1 = canvas1!.getContext();
      const frame0 = walkSheet.getSourceImage() as HTMLImageElement;
      ctx1.drawImage(frame0, 0, 0, 67, 92, 3, 5, 67, 92);
      canvas1!.refresh();

      const canvas2 = this.textures.createCanvas('runner_walk2', 73, 97);
      const ctx2 = canvas2!.getContext();
      ctx2.drawImage(frame0, 133, 93, 71, 92, 1, 0, 71, 92);
      canvas2!.refresh();
    }

    // Generate pipe textures programmatically (no good sprite match)
    this.generatePipe();
    this.generatePipeLarge();

    // Generate explosion particles texture
    const particleGfx = this.make.graphics({ x: 0, y: 0 });
    particleGfx.fillStyle(0xffffff);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('particle', 8, 8);
    particleGfx.destroy();

    this.scene.start('MenuScene');
  }

  private generatePipe(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x00aa00); g.fillRect(4, 12, 24, 28);
    g.fillStyle(0x00cc00); g.fillRect(0, 0, 32, 14);
    g.fillStyle(0x00ee00); g.fillRect(6, 0, 4, 40);
    g.fillStyle(0x008800); g.fillRect(22, 0, 4, 40);
    g.fillStyle(0x44ff44); g.fillRect(2, 0, 28, 2);
    g.generateTexture('pipe', 32, 40); g.destroy();
  }

  private generatePipeLarge(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x00aa00); g.fillRect(6, 18, 36, 46);
    g.fillStyle(0x00cc00); g.fillRect(0, 0, 48, 20);
    g.fillStyle(0x00ee00); g.fillRect(8, 0, 6, 64);
    g.fillStyle(0x008800); g.fillRect(34, 0, 6, 64);
    g.fillStyle(0x44ff44); g.fillRect(2, 0, 44, 3);
    g.fillStyle(0x003300); g.fillRect(10, 3, 28, 10);
    g.generateTexture('pipe_large', 48, 64); g.destroy();
  }
}
