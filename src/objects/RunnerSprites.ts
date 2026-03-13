import Phaser from 'phaser';

/**
 * Generates Mario-style pixel art textures programmatically.
 */
export class RunnerSprites {
  static generateTextures(scene: Phaser.Scene): void {
    this.generateRunner(scene);
    this.generatePlatform(scene);
    this.generateCoin(scene);
    this.generateEnemy(scene);
    this.generateCloud(scene);
    this.generateFlag(scene);
    this.generateBlock(scene);
    this.generatePipe(scene);
    this.generateMushroom(scene);
  }

  /** Mario-like character - red hat, blue overalls */
  private static generateRunner(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2; // pixel scale

    // Hat (red)
    g.fillStyle(0xe52521);
    g.fillRect(3*s, 0, 5*s, s);
    g.fillRect(2*s, 1*s, 8*s, s);

    // Hair (brown)
    g.fillStyle(0x6b3e08);
    g.fillRect(2*s, 2*s, 3*s, s);
    g.fillRect(1*s, 3*s, 2*s, s);
    g.fillRect(1*s, 4*s, s, s);

    // Face (skin)
    g.fillStyle(0xfab882);
    g.fillRect(5*s, 2*s, 4*s, s);
    g.fillRect(3*s, 3*s, 6*s, s);
    g.fillRect(2*s, 4*s, 7*s, s);
    g.fillRect(3*s, 5*s, 5*s, s);

    // Eyes
    g.fillStyle(0x000000);
    g.fillRect(5*s, 3*s, s, s);
    g.fillRect(7*s, 3*s, s, s);

    // Nose
    g.fillStyle(0xd4764e);
    g.fillRect(6*s, 4*s, s, s);

    // Shirt (red)
    g.fillStyle(0xe52521);
    g.fillRect(2*s, 6*s, 7*s, s);
    g.fillRect(1*s, 7*s, 9*s, s);
    g.fillRect(2*s, 8*s, 7*s, s);

    // Overalls (blue)
    g.fillStyle(0x2038ec);
    g.fillRect(2*s, 9*s, 3*s, s);
    g.fillRect(6*s, 9*s, 3*s, s);
    g.fillRect(2*s, 10*s, 3*s, s);
    g.fillRect(6*s, 10*s, 3*s, s);

    // Overall straps
    g.fillStyle(0xffd700);
    g.fillRect(3*s, 7*s, s, s);
    g.fillRect(7*s, 7*s, s, s);

    // Shoes (brown)
    g.fillStyle(0x6b3e08);
    g.fillRect(1*s, 11*s, 3*s, s);
    g.fillRect(7*s, 11*s, 3*s, s);

    g.generateTexture('runner', 11*s, 12*s);
    g.destroy();

    // Jump frame
    const gj = scene.make.graphics({ x: 0, y: 0 });

    // Hat
    gj.fillStyle(0xe52521);
    gj.fillRect(3*s, 0, 5*s, s);
    gj.fillRect(2*s, 1*s, 8*s, s);

    // Hair
    gj.fillStyle(0x6b3e08);
    gj.fillRect(2*s, 2*s, 3*s, s);
    gj.fillRect(1*s, 3*s, 2*s, s);

    // Face
    gj.fillStyle(0xfab882);
    gj.fillRect(5*s, 2*s, 4*s, s);
    gj.fillRect(3*s, 3*s, 6*s, s);
    gj.fillRect(2*s, 4*s, 7*s, s);
    gj.fillRect(3*s, 5*s, 5*s, s);

    // Eyes
    gj.fillStyle(0x000000);
    gj.fillRect(5*s, 3*s, s, s);
    gj.fillRect(7*s, 3*s, s, s);

    // Arms up
    gj.fillStyle(0xe52521);
    gj.fillRect(0, 5*s, 2*s, s);
    gj.fillRect(9*s, 5*s, 2*s, s);
    gj.fillRect(2*s, 6*s, 7*s, s);
    gj.fillRect(1*s, 7*s, 9*s, s);
    gj.fillRect(2*s, 8*s, 7*s, s);

    // Overalls
    gj.fillStyle(0x2038ec);
    gj.fillRect(3*s, 9*s, 5*s, s);
    gj.fillRect(2*s, 10*s, 3*s, s);
    gj.fillRect(6*s, 10*s, 3*s, s);

    // Overall straps
    gj.fillStyle(0xffd700);
    gj.fillRect(3*s, 7*s, s, s);
    gj.fillRect(7*s, 7*s, s, s);

    // Shoes spread
    gj.fillStyle(0x6b3e08);
    gj.fillRect(1*s, 11*s, 3*s, s);
    gj.fillRect(7*s, 11*s, 3*s, s);

    gj.generateTexture('runner_jump', 11*s, 12*s);
    gj.destroy();
  }

  /** Green brick platform */
  private static generatePlatform(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const w = 64, h = 16;

    // Main brick color
    g.fillStyle(0xc84c09);
    g.fillRect(0, 0, w, h);

    // Brick pattern
    g.fillStyle(0xa0380a);
    // Horizontal lines
    g.fillRect(0, 7, w, 2);
    // Vertical lines (offset pattern)
    for (let x = 0; x < w; x += 16) {
      g.fillRect(x, 0, 2, 7);
    }
    for (let x = 8; x < w; x += 16) {
      g.fillRect(x, 9, 2, 7);
    }

    // Top highlight
    g.fillStyle(0xe8700a);
    g.fillRect(0, 0, w, 1);

    g.generateTexture('platform', w, h);
    g.destroy();
  }

  /** Spinning coin */
  private static generateCoin(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });

    // Gold circle
    g.fillStyle(0xffd700);
    g.fillCircle(8, 8, 7);

    // Inner shine
    g.fillStyle(0xffed4a);
    g.fillCircle(6, 6, 3);

    // Dollar sign
    g.fillStyle(0xb8860b);
    g.fillRect(7, 4, 2, 8);
    g.fillRect(5, 5, 2, 2);
    g.fillRect(9, 9, 2, 2);
    g.fillRect(5, 9, 6, 2);
    g.fillRect(5, 5, 6, 2);

    g.generateTexture('coin', 16, 16);
    g.destroy();
  }

  /** Goomba-like enemy - brown mushroom creature */
  private static generateEnemy(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;

    // Brown body/head
    g.fillStyle(0x8b4513);
    g.fillRect(2*s, 0, 6*s, s);
    g.fillRect(1*s, 1*s, 8*s, s);
    g.fillRect(0, 2*s, 10*s, s);
    g.fillRect(0, 3*s, 10*s, s);
    g.fillRect(0, 4*s, 10*s, s);

    // Angry eyes (white + black pupil)
    g.fillStyle(0xffffff);
    g.fillRect(2*s, 2*s, 2*s, 2*s);
    g.fillRect(6*s, 2*s, 2*s, 2*s);
    g.fillStyle(0x000000);
    g.fillRect(3*s, 3*s, s, s);
    g.fillRect(7*s, 3*s, s, s);

    // Angry eyebrows
    g.fillStyle(0x000000);
    g.fillRect(2*s, 1*s, 2*s, s);
    g.fillRect(6*s, 1*s, 2*s, s);

    // Mouth
    g.fillStyle(0x000000);
    g.fillRect(3*s, 4*s, 4*s, s);

    // Tan body
    g.fillStyle(0xdeb887);
    g.fillRect(1*s, 5*s, 8*s, s);
    g.fillRect(2*s, 6*s, 6*s, s);

    // Feet
    g.fillStyle(0x000000);
    g.fillRect(0, 7*s, 4*s, s);
    g.fillRect(6*s, 7*s, 4*s, s);

    g.generateTexture('enemy', 10*s, 8*s);
    g.destroy();
  }

  /** Cloud */
  private static generateCloud(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });

    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(20, 18, 12);
    g.fillCircle(36, 14, 16);
    g.fillCircle(52, 18, 12);
    g.fillCircle(36, 22, 14);

    g.generateTexture('cloud', 68, 38);
    g.destroy();
  }

  /** Checkpoint flag */
  private static generateFlag(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });

    // Pole
    g.fillStyle(0x888888);
    g.fillRect(2, 0, 3, 32);

    // Flag (green)
    g.fillStyle(0x00aa00);
    g.fillRect(5, 2, 16, 10);

    // Star on flag
    g.fillStyle(0xffd700);
    g.fillRect(10, 5, 4, 4);

    g.generateTexture('flag', 22, 32);
    g.destroy();
  }

  /** Question block */
  private static generateBlock(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const sz = 20;

    // Yellow block
    g.fillStyle(0xf5a623);
    g.fillRect(0, 0, sz, sz);

    // Border
    g.lineStyle(2, 0xc8841d);
    g.strokeRect(0, 0, sz, sz);

    // Inner border highlight
    g.fillStyle(0xffd54f);
    g.fillRect(2, 2, sz - 4, 2);
    g.fillRect(2, 2, 2, sz - 4);

    // Question mark
    g.fillStyle(0x000000);
    g.fillRect(7, 4, 6, 2);
    g.fillRect(11, 6, 2, 2);
    g.fillRect(9, 8, 2, 2);
    g.fillRect(9, 10, 2, 2);
    g.fillRect(9, 14, 2, 2);

    g.generateTexture('qblock', sz, sz);
    g.destroy();
  }

  /** Green pipe */
  private static generatePipe(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });

    // Pipe body
    g.fillStyle(0x00aa00);
    g.fillRect(4, 12, 24, 28);

    // Pipe top (wider)
    g.fillStyle(0x00cc00);
    g.fillRect(0, 0, 32, 14);

    // Highlight
    g.fillStyle(0x00ee00);
    g.fillRect(6, 0, 4, 40);

    // Shadow
    g.fillStyle(0x008800);
    g.fillRect(22, 0, 4, 40);

    // Top highlight
    g.fillStyle(0x44ff44);
    g.fillRect(2, 0, 28, 2);

    g.generateTexture('pipe', 32, 40);
    g.destroy();
  }

  /** Power-up mushroom */
  private static generateMushroom(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });

    // Red cap
    g.fillStyle(0xe52521);
    g.fillCircle(10, 6, 8);

    // White spots
    g.fillStyle(0xffffff);
    g.fillCircle(6, 4, 3);
    g.fillCircle(14, 4, 3);

    // Tan stalk
    g.fillStyle(0xfab882);
    g.fillRect(5, 10, 10, 6);

    // Eyes
    g.fillStyle(0x000000);
    g.fillRect(6, 11, 2, 2);
    g.fillRect(12, 11, 2, 2);

    g.generateTexture('mushroom', 20, 16);
    g.destroy();
  }
}
