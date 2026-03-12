import Phaser from 'phaser';

export class PlaneSprite {
  /**
   * Generates the red biplane texture matching the splash screen SVG.
   */
  static generateTexture(scene: Phaser.Scene): void {
    const gfx = scene.make.graphics({ x: 0, y: 0 });
    const w = 80;
    const h = 40;

    // --- Exhaust flame glow (behind plane) ---
    gfx.fillStyle(0xff6600, 0.7);
    gfx.fillEllipse(5, 20, 14, 8);
    gfx.fillStyle(0xffcc00, 0.9);
    gfx.fillEllipse(7, 20, 8, 6);

    // --- Fuselage (red body) ---
    gfx.fillStyle(0xcc2233);
    gfx.fillRoundedRect(13, 12, 40, 15, 5);
    // Nose taper
    gfx.fillTriangle(52, 12, 60, 16, 52, 27);
    // Tail taper
    gfx.fillTriangle(13, 14, 20, 19, 13, 26);

    // --- Cockpit ---
    gfx.fillStyle(0xdd3344);
    gfx.fillEllipse(50, 15, 12, 7);
    // Window
    gfx.fillStyle(0x1a1a3e);
    gfx.fillEllipse(51, 14, 8, 5);
    // Shine
    gfx.fillStyle(0x4ecdc4, 0.4);
    gfx.fillEllipse(50, 13, 4, 3);

    // --- Wings (biplane) ---
    gfx.fillStyle(0xbb1122);
    // Top wing
    gfx.fillRoundedRect(27, 7, 24, 4, 2);
    // Bottom wing
    gfx.fillRoundedRect(27, 29, 24, 4, 2);

    // --- Tail fin ---
    gfx.fillStyle(0xcc2233);
    gfx.fillTriangle(17, 12, 23, 5, 27, 12);

    // --- Tail stabilizers ---
    gfx.fillStyle(0xbb1122);
    gfx.fillRoundedRect(15, 10, 10, 3, 1);
    gfx.fillRoundedRect(15, 26, 10, 3, 1);

    // --- Engine nose ---
    gfx.fillStyle(0x666666);
    gfx.fillRoundedRect(61, 14, 6, 10, 2);

    // --- Propeller disc ---
    gfx.fillStyle(0xcccccc, 0.4);
    gfx.fillEllipse(68, 19, 4, 18);

    gfx.generateTexture('plane', w, h);
    gfx.destroy();

    // --- Propeller spinning texture ---
    const propGfx = scene.make.graphics({ x: 0, y: 0 });
    propGfx.fillStyle(0xdddddd);
    propGfx.fillRoundedRect(1, 0, 4, 16, 2);
    propGfx.fillRoundedRect(1, 22, 4, 16, 2);
    propGfx.fillStyle(0x444444);
    propGfx.fillCircle(3, 19, 3);
    propGfx.generateTexture('propeller', 6, 38);
    propGfx.destroy();

    // --- Flame/exhaust texture ---
    const flameGfx = scene.make.graphics({ x: 0, y: 0 });
    flameGfx.fillStyle(0xff6600, 0.7);
    flameGfx.fillEllipse(12, 8, 24, 10);
    flameGfx.fillStyle(0xffcc00, 0.8);
    flameGfx.fillEllipse(10, 8, 16, 6);
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
