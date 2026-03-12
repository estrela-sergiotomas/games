import Phaser from 'phaser';

export class PlaneSprite {
  /**
   * Generates executive jet texture programmatically.
   * Sleek private jet with swept wings and T-tail.
   */
  static generateTexture(scene: Phaser.Scene): void {
    const gfx = scene.make.graphics({ x: 0, y: 0 });
    const w = 90;
    const h = 40;

    // --- Fuselage (sleek tube) ---
    gfx.fillStyle(0xe8e8e8);
    gfx.fillRoundedRect(8, 13, 62, 14, 7);

    // Fuselage stripe (gold accent)
    gfx.fillStyle(0xffd700, 0.6);
    gfx.fillRect(12, 19, 55, 2);

    // Nose cone (pointed)
    gfx.fillStyle(0xcccccc);
    gfx.fillTriangle(70, 14, 82, 20, 70, 26);

    // Cockpit windows
    gfx.fillStyle(0x1a1a3e);
    gfx.fillRoundedRect(64, 14, 10, 5, 2);
    // Window shine
    gfx.fillStyle(0x4ecdc4, 0.5);
    gfx.fillRoundedRect(65, 15, 4, 3, 1);

    // Passenger windows
    gfx.fillStyle(0x66ccff, 0.4);
    for (let i = 0; i < 5; i++) {
      gfx.fillRoundedRect(30 + i * 7, 15, 4, 3, 1);
    }

    // --- Swept wings ---
    // Top wing
    gfx.fillStyle(0xd0d0d0);
    gfx.beginPath();
    gfx.moveTo(35, 13);
    gfx.lineTo(50, 3);
    gfx.lineTo(42, 3);
    gfx.lineTo(25, 13);
    gfx.closePath();
    gfx.fillPath();
    // Bottom wing
    gfx.beginPath();
    gfx.moveTo(35, 27);
    gfx.lineTo(50, 37);
    gfx.lineTo(42, 37);
    gfx.lineTo(25, 27);
    gfx.closePath();
    gfx.fillPath();

    // Wing tips
    gfx.fillStyle(0xff4757, 0.7);
    gfx.fillRect(48, 2, 3, 3);
    gfx.fillRect(48, 36, 3, 3);

    // --- T-tail ---
    // Vertical stabilizer
    gfx.fillStyle(0xd8d8d8);
    gfx.beginPath();
    gfx.moveTo(8, 13);
    gfx.lineTo(4, 4);
    gfx.lineTo(16, 4);
    gfx.lineTo(16, 13);
    gfx.closePath();
    gfx.fillPath();
    // Horizontal stabilizer (on top of vertical)
    gfx.fillStyle(0xc8c8c8);
    gfx.beginPath();
    gfx.moveTo(4, 4);
    gfx.lineTo(0, 0);
    gfx.lineTo(8, 0);
    gfx.lineTo(16, 4);
    gfx.closePath();
    gfx.fillPath();

    // --- Engines (under wings) ---
    gfx.fillStyle(0x888888);
    gfx.fillRoundedRect(38, 6, 10, 5, 2);
    gfx.fillRoundedRect(38, 29, 10, 5, 2);

    // Engine intake glow
    gfx.fillStyle(0x444444);
    gfx.fillCircle(49, 8, 2);
    gfx.fillCircle(49, 32, 2);

    gfx.generateTexture('plane', w, h);
    gfx.destroy();

    // --- Propeller spinning texture (reused as engine glow) ---
    const propGfx = scene.make.graphics({ x: 0, y: 0 });
    propGfx.fillStyle(0xdddddd);
    propGfx.fillRoundedRect(1, 0, 4, 16, 2);
    propGfx.fillRoundedRect(1, 22, 4, 16, 2);
    propGfx.fillStyle(0x444444);
    propGfx.fillCircle(3, 19, 3);
    propGfx.generateTexture('propeller', 6, 38);
    propGfx.destroy();

    // --- Engine exhaust/trail texture ---
    const flameGfx = scene.make.graphics({ x: 0, y: 0 });
    // Jet exhaust (blue-ish)
    flameGfx.fillStyle(0x4ecdc4, 0.5);
    flameGfx.fillEllipse(12, 8, 28, 8);
    flameGfx.fillStyle(0x88ddff, 0.6);
    flameGfx.fillEllipse(10, 8, 18, 5);
    flameGfx.fillStyle(0xffffff, 0.7);
    flameGfx.fillEllipse(8, 8, 8, 3);
    flameGfx.generateTexture('flame', 24, 16);
    flameGfx.destroy();

    // --- Explosion texture ---
    const expGfx = scene.make.graphics({ x: 0, y: 0 });
    expGfx.fillStyle(0xff4757);
    expGfx.fillCircle(20, 20, 20);
    expGfx.fillStyle(0xff6600, 0.8);
    expGfx.fillCircle(20, 20, 14);
    expGfx.fillStyle(0xffd700, 0.6);
    expGfx.fillCircle(20, 20, 8);
    expGfx.generateTexture('explosion', 40, 40);
    expGfx.destroy();
  }
}
