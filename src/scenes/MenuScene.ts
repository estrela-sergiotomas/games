import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const cx = GAME_CONFIG.WIDTH / 2;
    const cy = GAME_CONFIG.HEIGHT / 2;

    // Background gradient effect
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a3e, 0x1a1a3e, 0x0f0f23, 0x0f0f23);
    bg.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_CONFIG.WIDTH);
      const y = Phaser.Math.Between(0, GAME_CONFIG.HEIGHT);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.7));
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.3),
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Animated plane in menu
    const plane = this.add.image(cx, cy - 80, 'plane').setScale(2);
    this.tweens.add({
      targets: plane,
      y: cy - 95,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title
    this.add.text(cx, cy + 10, 'CRASH GAME', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      color: '#e0e0e0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 55, 'Estilo Aviator', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    // Play button
    const btnBg = this.add.graphics();
    const btnX = cx - 100;
    const btnY = cy + 90;
    const btnW = 200;
    const btnH = 50;
    btnBg.fillStyle(COLORS.CYAN);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);

    const btnText = this.add.text(cx, btnY + 25, 'JOGAR', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(cx, btnY + 25, btnW, btnH).setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x44a08d);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });

    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(COLORS.CYAN);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });

    hitArea.on('pointerdown', () => {
      this.scene.start('CrashScene');
    });
  }
}
