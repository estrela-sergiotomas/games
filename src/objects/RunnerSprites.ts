import Phaser from 'phaser';

/**
 * Generates Mario-style pixel art textures programmatically.
 * Includes 6 unique enemy types.
 */
export class RunnerSprites {
  static generateTextures(scene: Phaser.Scene): void {
    this.generateRunner(scene);
    this.generatePlatform(scene);
    this.generateCoin(scene);
    this.generatePremiumCoin(scene);
    this.generateCloud(scene);
    this.generateFlag(scene);
    this.generateBlock(scene);
    this.generateMagicBlock(scene);
    this.generatePipe(scene);
    this.generatePipeLarge(scene);
    this.generateMushroom(scene);
    this.generatePoisonMushroom(scene);
    this.generateGround(scene);
    this.generateGoomba(scene);
    this.generateKoopa(scene);
    this.generateSpiny(scene);
    this.generateBobomb(scene);
    this.generateBulletBill(scene);
    this.generatePiranha(scene);
  }

  private static generateRunner(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0xe52521);
    g.fillRect(3*s, 0, 5*s, s); g.fillRect(2*s, s, 8*s, s);
    g.fillStyle(0x6b3e08);
    g.fillRect(2*s, 2*s, 3*s, s); g.fillRect(s, 3*s, 2*s, s); g.fillRect(s, 4*s, s, s);
    g.fillStyle(0xfab882);
    g.fillRect(5*s, 2*s, 4*s, s); g.fillRect(3*s, 3*s, 6*s, s);
    g.fillRect(2*s, 4*s, 7*s, s); g.fillRect(3*s, 5*s, 5*s, s);
    g.fillStyle(0x000000);
    g.fillRect(5*s, 3*s, s, s); g.fillRect(7*s, 3*s, s, s);
    g.fillStyle(0xd4764e); g.fillRect(6*s, 4*s, s, s);
    g.fillStyle(0xe52521);
    g.fillRect(2*s, 6*s, 7*s, s); g.fillRect(s, 7*s, 9*s, s); g.fillRect(2*s, 8*s, 7*s, s);
    g.fillStyle(0x2038ec);
    g.fillRect(2*s, 9*s, 3*s, s); g.fillRect(6*s, 9*s, 3*s, s);
    g.fillRect(2*s, 10*s, 3*s, s); g.fillRect(6*s, 10*s, 3*s, s);
    g.fillStyle(0xffd700); g.fillRect(3*s, 7*s, s, s); g.fillRect(7*s, 7*s, s, s);
    g.fillStyle(0x6b3e08); g.fillRect(s, 11*s, 3*s, s); g.fillRect(7*s, 11*s, 3*s, s);
    g.generateTexture('runner', 11*s, 12*s); g.destroy();

    const gj = scene.make.graphics({ x: 0, y: 0 });
    gj.fillStyle(0xe52521);
    gj.fillRect(3*s, 0, 5*s, s); gj.fillRect(2*s, s, 8*s, s);
    gj.fillStyle(0x6b3e08); gj.fillRect(2*s, 2*s, 3*s, s); gj.fillRect(s, 3*s, 2*s, s);
    gj.fillStyle(0xfab882);
    gj.fillRect(5*s, 2*s, 4*s, s); gj.fillRect(3*s, 3*s, 6*s, s);
    gj.fillRect(2*s, 4*s, 7*s, s); gj.fillRect(3*s, 5*s, 5*s, s);
    gj.fillStyle(0x000000); gj.fillRect(5*s, 3*s, s, s); gj.fillRect(7*s, 3*s, s, s);
    gj.fillStyle(0xe52521);
    gj.fillRect(0, 5*s, 2*s, s); gj.fillRect(9*s, 5*s, 2*s, s);
    gj.fillRect(2*s, 6*s, 7*s, s); gj.fillRect(s, 7*s, 9*s, s); gj.fillRect(2*s, 8*s, 7*s, s);
    gj.fillStyle(0x2038ec);
    gj.fillRect(3*s, 9*s, 5*s, s); gj.fillRect(2*s, 10*s, 3*s, s); gj.fillRect(6*s, 10*s, 3*s, s);
    gj.fillStyle(0xffd700); gj.fillRect(3*s, 7*s, s, s); gj.fillRect(7*s, 7*s, s, s);
    gj.fillStyle(0x6b3e08); gj.fillRect(s, 11*s, 3*s, s); gj.fillRect(7*s, 11*s, 3*s, s);
    gj.generateTexture('runner_jump', 11*s, 12*s); gj.destroy();

    // Walk frame 1: left leg forward, right leg back
    const gw1 = scene.make.graphics({ x: 0, y: 0 });
    gw1.fillStyle(0xe52521);
    gw1.fillRect(3*s, 0, 5*s, s); gw1.fillRect(2*s, s, 8*s, s);
    gw1.fillStyle(0x6b3e08);
    gw1.fillRect(2*s, 2*s, 3*s, s); gw1.fillRect(s, 3*s, 2*s, s); gw1.fillRect(s, 4*s, s, s);
    gw1.fillStyle(0xfab882);
    gw1.fillRect(5*s, 2*s, 4*s, s); gw1.fillRect(3*s, 3*s, 6*s, s);
    gw1.fillRect(2*s, 4*s, 7*s, s); gw1.fillRect(3*s, 5*s, 5*s, s);
    gw1.fillStyle(0x000000);
    gw1.fillRect(5*s, 3*s, s, s); gw1.fillRect(7*s, 3*s, s, s);
    gw1.fillStyle(0xd4764e); gw1.fillRect(6*s, 4*s, s, s);
    gw1.fillStyle(0xe52521);
    gw1.fillRect(2*s, 6*s, 7*s, s); gw1.fillRect(s, 7*s, 9*s, s); gw1.fillRect(2*s, 8*s, 7*s, s);
    gw1.fillStyle(0xffd700); gw1.fillRect(3*s, 7*s, s, s); gw1.fillRect(7*s, 7*s, s, s);
    // Left leg forward, right leg back
    gw1.fillStyle(0x2038ec);
    gw1.fillRect(2*s, 9*s, 3*s, s); gw1.fillRect(s, 10*s, 3*s, s);
    gw1.fillRect(6*s, 9*s, 3*s, s); gw1.fillRect(7*s, 10*s, 3*s, s);
    gw1.fillStyle(0x6b3e08);
    gw1.fillRect(0, 11*s, 3*s, s); gw1.fillRect(8*s, 11*s, 3*s, s);
    gw1.generateTexture('runner_walk1', 11*s, 12*s); gw1.destroy();

    // Walk frame 2: legs together / passing
    const gw2 = scene.make.graphics({ x: 0, y: 0 });
    gw2.fillStyle(0xe52521);
    gw2.fillRect(3*s, 0, 5*s, s); gw2.fillRect(2*s, s, 8*s, s);
    gw2.fillStyle(0x6b3e08);
    gw2.fillRect(2*s, 2*s, 3*s, s); gw2.fillRect(s, 3*s, 2*s, s); gw2.fillRect(s, 4*s, s, s);
    gw2.fillStyle(0xfab882);
    gw2.fillRect(5*s, 2*s, 4*s, s); gw2.fillRect(3*s, 3*s, 6*s, s);
    gw2.fillRect(2*s, 4*s, 7*s, s); gw2.fillRect(3*s, 5*s, 5*s, s);
    gw2.fillStyle(0x000000);
    gw2.fillRect(5*s, 3*s, s, s); gw2.fillRect(7*s, 3*s, s, s);
    gw2.fillStyle(0xd4764e); gw2.fillRect(6*s, 4*s, s, s);
    gw2.fillStyle(0xe52521);
    gw2.fillRect(2*s, 6*s, 7*s, s); gw2.fillRect(s, 7*s, 9*s, s); gw2.fillRect(2*s, 8*s, 7*s, s);
    gw2.fillStyle(0xffd700); gw2.fillRect(3*s, 7*s, s, s); gw2.fillRect(7*s, 7*s, s, s);
    // Legs together (right leg forward, left leg back)
    gw2.fillStyle(0x2038ec);
    gw2.fillRect(6*s, 9*s, 3*s, s); gw2.fillRect(5*s, 10*s, 3*s, s);
    gw2.fillRect(2*s, 9*s, 3*s, s); gw2.fillRect(3*s, 10*s, 3*s, s);
    gw2.fillStyle(0x6b3e08);
    gw2.fillRect(4*s, 11*s, 3*s, s); gw2.fillRect(2*s, 11*s, 3*s, s);
    gw2.generateTexture('runner_walk2', 11*s, 12*s); gw2.destroy();
  }

  private static generatePlatform(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xc84c09); g.fillRect(0, 0, 64, 16);
    g.fillStyle(0xa0380a); g.fillRect(0, 7, 64, 2);
    for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 2, 7);
    for (let x = 8; x < 64; x += 16) g.fillRect(x, 9, 2, 7);
    g.fillStyle(0xe8700a); g.fillRect(0, 0, 64, 1);
    g.generateTexture('platform', 64, 16); g.destroy();
  }

  private static generateGround(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xc84c09); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xa0380a); g.fillRect(0, 15, 32, 2);
    for (let x = 0; x < 32; x += 16) g.fillRect(x, 0, 2, 15);
    for (let x = 8; x < 32; x += 16) g.fillRect(x, 17, 2, 15);
    g.fillStyle(0x00aa00); g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x00cc00); g.fillRect(0, 0, 32, 2);
    g.generateTexture('ground', 32, 32); g.destroy();
  }

  private static generateCoin(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffd700); g.fillCircle(8, 8, 7);
    g.fillStyle(0xffed4a); g.fillCircle(6, 6, 3);
    g.fillStyle(0xb8860b);
    g.fillRect(7, 4, 2, 8); g.fillRect(5, 5, 6, 2); g.fillRect(5, 9, 6, 2);
    g.generateTexture('coin', 16, 16); g.destroy();
  }

  private static generatePremiumCoin(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Larger, diamond-shaped premium coin with sparkle
    g.fillStyle(0xff00ff); g.fillCircle(10, 10, 9);
    g.fillStyle(0xff66ff); g.fillCircle(7, 7, 4);
    g.fillStyle(0xffffff); g.fillCircle(6, 5, 2);
    g.fillStyle(0xcc00cc);
    g.fillRect(8, 3, 4, 14); g.fillRect(3, 8, 14, 4);
    g.fillStyle(0xff88ff); g.fillRect(9, 5, 2, 2);
    g.generateTexture('coin_premium', 20, 20); g.destroy();
  }

  private static generateMagicBlock(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Rainbow/magic block - glowing purple with star
    g.fillStyle(0x9933ff); g.fillRect(0, 0, 22, 22);
    g.lineStyle(2, 0x6600cc); g.strokeRect(0, 0, 22, 22);
    g.fillStyle(0xcc66ff); g.fillRect(2, 2, 18, 2); g.fillRect(2, 2, 2, 18);
    // Star symbol
    g.fillStyle(0xffd700);
    g.fillRect(9, 4, 4, 4); g.fillRect(7, 6, 8, 4); g.fillRect(5, 8, 12, 2);
    g.fillRect(7, 10, 3, 4); g.fillRect(12, 10, 3, 4);
    g.fillStyle(0xffff00); g.fillRect(10, 5, 2, 2);
    g.generateTexture('magic_block', 22, 22); g.destroy();
  }

  private static generateCloud(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(20, 18, 12); g.fillCircle(36, 14, 16);
    g.fillCircle(52, 18, 12); g.fillCircle(36, 22, 14);
    g.generateTexture('cloud', 68, 38); g.destroy();
  }

  private static generateFlag(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x888888); g.fillRect(2, 0, 3, 32);
    g.fillStyle(0x00aa00); g.fillRect(5, 2, 16, 10);
    g.fillStyle(0xffd700); g.fillRect(10, 5, 4, 4);
    g.generateTexture('flag', 22, 32); g.destroy();
  }

  private static generateBlock(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf5a623); g.fillRect(0, 0, 20, 20);
    g.lineStyle(2, 0xc8841d); g.strokeRect(0, 0, 20, 20);
    g.fillStyle(0xffd54f); g.fillRect(2, 2, 16, 2); g.fillRect(2, 2, 2, 16);
    g.fillStyle(0x000000);
    g.fillRect(7, 4, 6, 2); g.fillRect(11, 6, 2, 2);
    g.fillRect(9, 8, 2, 2); g.fillRect(9, 10, 2, 2); g.fillRect(9, 14, 2, 2);
    g.generateTexture('qblock', 20, 20); g.destroy();
  }

  private static generatePipe(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x00aa00); g.fillRect(4, 12, 24, 28);
    g.fillStyle(0x00cc00); g.fillRect(0, 0, 32, 14);
    g.fillStyle(0x00ee00); g.fillRect(6, 0, 4, 40);
    g.fillStyle(0x008800); g.fillRect(22, 0, 4, 40);
    g.fillStyle(0x44ff44); g.fillRect(2, 0, 28, 2);
    g.generateTexture('pipe', 32, 40); g.destroy();
  }

  private static generatePipeLarge(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x00aa00); g.fillRect(6, 18, 36, 46);
    g.fillStyle(0x00cc00); g.fillRect(0, 0, 48, 20);
    g.fillStyle(0x00ee00); g.fillRect(8, 0, 6, 64);
    g.fillStyle(0x008800); g.fillRect(34, 0, 6, 64);
    g.fillStyle(0x44ff44); g.fillRect(2, 0, 44, 3);
    g.fillStyle(0x003300); g.fillRect(10, 3, 28, 10);
    g.generateTexture('pipe_large', 48, 64); g.destroy();
  }

  private static generateMushroom(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xe52521); g.fillCircle(10, 6, 8);
    g.fillStyle(0xffffff); g.fillCircle(6, 4, 3); g.fillCircle(14, 4, 3);
    g.fillStyle(0xfab882); g.fillRect(5, 10, 10, 6);
    g.fillStyle(0x000000); g.fillRect(6, 11, 2, 2); g.fillRect(12, 11, 2, 2);
    g.generateTexture('mushroom', 20, 16); g.destroy();
  }

  private static generatePoisonMushroom(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Purple/dark mushroom with skull-like face
    g.fillStyle(0x6600aa); g.fillCircle(10, 6, 8);
    g.fillStyle(0x9933cc); g.fillCircle(6, 4, 3); g.fillCircle(14, 4, 3);
    g.fillStyle(0x442266); g.fillRect(5, 10, 10, 6);
    // X eyes
    g.fillStyle(0xff0000); g.fillRect(6, 11, 2, 2); g.fillRect(12, 11, 2, 2);
    // Skull mouth
    g.fillStyle(0x000000); g.fillRect(8, 14, 4, 2);
    g.generateTexture('mushroom_poison', 20, 16); g.destroy();
  }

  // === 6 ENEMY TYPES ===

  private static generateGoomba(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0x8b4513);
    g.fillRect(2*s, 0, 6*s, s); g.fillRect(s, s, 8*s, s);
    g.fillRect(0, 2*s, 10*s, s); g.fillRect(0, 3*s, 10*s, s); g.fillRect(0, 4*s, 10*s, s);
    g.fillStyle(0xffffff);
    g.fillRect(2*s, 2*s, 2*s, 2*s); g.fillRect(6*s, 2*s, 2*s, 2*s);
    g.fillStyle(0x000000);
    g.fillRect(3*s, 3*s, s, s); g.fillRect(7*s, 3*s, s, s);
    g.fillRect(2*s, s, 2*s, s); g.fillRect(6*s, s, 2*s, s);
    g.fillRect(3*s, 4*s, 4*s, s);
    g.fillStyle(0xdeb887);
    g.fillRect(s, 5*s, 8*s, s); g.fillRect(2*s, 6*s, 6*s, s);
    g.fillStyle(0x000000);
    g.fillRect(0, 7*s, 4*s, s); g.fillRect(6*s, 7*s, 4*s, s);
    g.generateTexture('enemy_goomba', 10*s, 8*s); g.destroy();
  }

  private static generateKoopa(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0x90ee90);
    g.fillRect(6*s, 0, 3*s, 2*s); g.fillRect(5*s, 2*s, 4*s, 2*s);
    g.fillStyle(0xffffff); g.fillRect(7*s, s, 2*s, s);
    g.fillStyle(0x000000); g.fillRect(8*s, s, s, s);
    g.fillStyle(0x00aa00); g.fillRect(s, 2*s, 6*s, 5*s);
    g.fillStyle(0x008800); g.fillRect(2*s, 3*s, 4*s, 3*s);
    g.fillStyle(0xffd700); g.fillRect(3*s, 4*s, 2*s, s);
    g.fillStyle(0xffcc00); g.fillRect(s, 2*s, 6*s, s); g.fillRect(s, 6*s, 6*s, s);
    g.fillStyle(0xff8800); g.fillRect(2*s, 7*s, 2*s, s); g.fillRect(5*s, 7*s, 2*s, s);
    g.generateTexture('enemy_koopa', 10*s, 8*s); g.destroy();
  }

  private static generateSpiny(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0x2244cc);
    g.fillRect(s, 3*s, 8*s, 4*s); g.fillRect(2*s, 2*s, 6*s, s);
    g.fillStyle(0xff0000);
    g.fillRect(s, s, 2*s, 2*s); g.fillRect(4*s, 0, 2*s, 3*s); g.fillRect(7*s, s, 2*s, 2*s);
    g.fillStyle(0xffffff);
    g.fillRect(2*s, 4*s, 2*s, 2*s); g.fillRect(6*s, 4*s, 2*s, 2*s);
    g.fillStyle(0xff0000); g.fillRect(3*s, 5*s, s, s); g.fillRect(7*s, 5*s, s, s);
    g.fillStyle(0xddcc00); g.fillRect(s, 7*s, 3*s, s); g.fillRect(6*s, 7*s, 3*s, s);
    g.generateTexture('enemy_spiny', 10*s, 8*s); g.destroy();
  }

  private static generateBobomb(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0xffd700); g.fillRect(4*s, 0, 2*s, s);
    g.fillStyle(0xff4400); g.fillRect(3*s, 0, s, s); g.fillRect(6*s, 0, s, s);
    g.fillStyle(0x111144);
    g.fillRect(2*s, s, 6*s, 2*s); g.fillRect(s, 3*s, 8*s, 3*s); g.fillRect(2*s, 6*s, 6*s, s);
    g.fillStyle(0xffffff);
    g.fillRect(2*s, 3*s, 3*s, 2*s); g.fillRect(6*s, 3*s, 2*s, 2*s);
    g.fillStyle(0x000000); g.fillRect(4*s, 4*s, s, s); g.fillRect(7*s, 4*s, s, s);
    g.fillStyle(0xffd700); g.fillRect(0, 4*s, 2*s, s); g.fillRect(0, 3*s, s, 3*s);
    g.fillStyle(0xff8800); g.fillRect(2*s, 7*s, 2*s, s); g.fillRect(6*s, 7*s, 2*s, s);
    g.generateTexture('enemy_bobomb', 10*s, 8*s); g.destroy();
  }

  private static generateBulletBill(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0x111111);
    g.fillRect(0, 2*s, 10*s, 4*s); g.fillRect(s, s, 8*s, s); g.fillRect(s, 6*s, 8*s, s);
    g.fillStyle(0x222222); g.fillRect(8*s, 2*s, 2*s, 4*s);
    g.fillStyle(0xffffff); g.fillRect(6*s, 3*s, 2*s, 2*s);
    g.fillStyle(0x000000); g.fillRect(7*s, 4*s, s, s);
    g.fillStyle(0x8b0000); g.fillRect(3*s, s, s, 6*s);
    g.fillStyle(0x333333); g.fillRect(0, 3*s, 2*s, 2*s);
    g.generateTexture('enemy_bullet', 10*s, 8*s); g.destroy();
  }

  private static generatePiranha(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const s = 2;
    g.fillStyle(0xcc0000);
    g.fillRect(s, 0, 8*s, 2*s); g.fillRect(0, 2*s, 10*s, 2*s); g.fillRect(s, 4*s, 8*s, s);
    g.fillStyle(0xffffff);
    g.fillRect(2*s, s, 2*s, 2*s); g.fillRect(6*s, s, 2*s, 2*s);
    g.fillStyle(0x000000); g.fillRect(s, 4*s, 8*s, s);
    g.fillStyle(0xffffff);
    g.fillRect(2*s, 4*s, s, s); g.fillRect(4*s, 4*s, s, s);
    g.fillRect(6*s, 4*s, s, s); g.fillRect(8*s, 4*s, s, s);
    g.fillStyle(0x00aa00); g.fillRect(3*s, 5*s, 4*s, 4*s);
    g.fillStyle(0x008800); g.fillRect(4*s, 5*s, 2*s, 4*s);
    g.fillStyle(0x00cc00); g.fillRect(s, 6*s, 2*s, s); g.fillRect(7*s, 7*s, 2*s, s);
    g.generateTexture('enemy_piranha', 10*s, 9*s); g.destroy();
  }
}
