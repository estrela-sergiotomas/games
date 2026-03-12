import Phaser from 'phaser';

export class PlaneSprite {
  /**
   * Generates the red biplane texture (Aviator style) programmatically.
   * Small red propeller plane with spinning prop.
   */
  static generateTexture(scene: Phaser.Scene): void {
    const gfx = scene.make.graphics({ x: 0, y: 0 });
    const w = 80;
    const h = 40;

    // --- Fuselage (main body) ---
    gfx.fillStyle(0xcc2233);
    gfx.fillRoundedRect(10, 14, 50, 14, 4);

    // Cockpit bump
    gfx.fillStyle(0xdd3344);
    gfx.fillEllipse(40, 14, 16, 10);

    // Cockpit window
    gfx.fillStyle(0x1a1a3e);
    gfx.fillEllipse(42, 13, 8, 6);
    gfx.fillStyle(0x4ecdc4, 0.4);
    gfx.fillEllipse(41, 12, 4, 3);

    // --- Wings ---
    // Top wing
    gfx.fillStyle(0xbb1122);
    gfx.fillRoundedRect(18, 6, 30, 5, 2);
    // Bottom wing
    gfx.fillRoundedRect(18, 30, 30, 5, 2);

    // Wing struts
    gfx.lineStyle(1.5, 0x999999);
    gfx.lineBetween(24, 11, 24, 30);
    gfx.lineBetween(40, 11, 40, 30);

    // --- Tail ---
    // Horizontal stabilizer
    gfx.fillStyle(0xbb1122);
    gfx.fillRoundedRect(2, 10, 14, 4, 2);
    gfx.fillRoundedRect(2, 27, 14, 4, 2);

    // Vertical stabilizer
    gfx.fillStyle(0xcc2233);
    gfx.fillTriangle(2, 14, 8, 4, 12, 14);

    // --- Engine nose ---
    gfx.fillStyle(0x666666);
    gfx.fillRoundedRect(58, 15, 8, 12, 3);

    // --- Propeller (will be a separate rotating texture) ---
    // Exhaust/engine glow
    gfx.fillStyle(0xff6600, 0.6);
    gfx.fillEllipse(68, 21, 6, 4);

    // Propeller disc (blur effect)
    gfx.fillStyle(0xcccccc, 0.3);
    gfx.fillEllipse(68, 21, 4, 18);

    // Wheels
    gfx.fillStyle(0x333333);
    gfx.fillCircle(25, 37, 3);
    gfx.fillCircle(45, 37, 3);
    gfx.lineStyle(1, 0x555555);
    gfx.strokeCircle(25, 37, 3);
    gfx.strokeCircle(45, 37, 3);

    // Wheel struts
    gfx.lineStyle(1.5, 0x777777);
    gfx.lineBetween(25, 28, 25, 34);
    gfx.lineBetween(45, 28, 45, 34);

    gfx.generateTexture('plane', w, h);
    gfx.destroy();

    // --- Propeller spinning texture ---
    const propGfx = scene.make.graphics({ x: 0, y: 0 });
    // Prop blade 1
    propGfx.fillStyle(0xdddddd);
    propGfx.fillRoundedRect(1, 0, 4, 16, 2);
    // Prop blade 2
    propGfx.fillRoundedRect(1, 22, 4, 16, 2);
    // Hub
    propGfx.fillStyle(0x444444);
    propGfx.fillCircle(3, 19, 3);
    propGfx.generateTexture('propeller', 6, 38);
    propGfx.destroy();

    // --- Flame/exhaust texture ---
    const flameGfx = scene.make.graphics({ x: 0, y: 0 });
    // Outer flame
    flameGfx.fillStyle(0xff6600, 0.7);
    flameGfx.fillEllipse(12, 8, 24, 10);
    // Inner flame
    flameGfx.fillStyle(0xffcc00, 0.8);
    flameGfx.fillEllipse(10, 8, 16, 6);
    // Core
    flameGfx.fillStyle(0xfff4cc, 0.9);
    flameGfx.fillEllipse(8, 8, 8, 4);
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
