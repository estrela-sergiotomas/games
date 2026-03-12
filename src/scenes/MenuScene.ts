import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';
import { synthMusic } from '../assets/music';

export class MenuScene extends Phaser.Scene {
  private musicOn = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;
    const cx = w / 2;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a3e, 0x1a1a3e, 0x0f0f23, 0x0f0f23);
    bg.fillRect(0, 0, w, h);

    // 80s perspective grid floor
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.CYAN, 0.15);
    for (let i = 0; i < 15; i++) {
      const y = h * 0.55 + i * 18;
      grid.lineBetween(0, y, w, y);
    }
    for (let i = -6; i <= 6; i++) {
      grid.lineBetween(cx + i * 20, h * 0.55, cx + i * 80, h);
    }

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h * 0.55);
      const size = Phaser.Math.FloatBetween(0.5, 2.5);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      this.tweens.add({
        targets: star, alpha: Phaser.Math.FloatBetween(0.05, 0.2),
        duration: Phaser.Math.Between(800, 2500), yoyo: true, repeat: -1,
      });
    }

    // Shooting stars
    this.time.addEvent({
      delay: 3000, loop: true,
      callback: () => {
        const sx = Phaser.Math.Between(50, w - 50);
        const shootingStar = this.add.circle(sx, 0, 2, 0xffffff, 0.9);
        this.tweens.add({
          targets: shootingStar, x: sx + 80, y: h * 0.35, alpha: 0,
          duration: 800, ease: 'Power2', onComplete: () => shootingStar.destroy(),
        });
      },
    });

    // Horizon glow
    const horizonGlow = this.add.graphics();
    horizonGlow.lineStyle(2, COLORS.CYAN, 0.4);
    horizonGlow.lineBetween(0, h * 0.55, w, h * 0.55);

    // Retro sun
    const sun = this.add.graphics();
    sun.fillStyle(0xff4757, 0.15);
    sun.fillCircle(cx, h * 0.55, 60);
    sun.fillStyle(0xff4757, 0.25);
    sun.fillCircle(cx, h * 0.55, 40);
    sun.fillStyle(0xff6b6b, 0.35);
    sun.fillCircle(cx, h * 0.55, 22);
    for (let i = 0; i < 5; i++) {
      sun.lineStyle(2, 0x0f0f23, 0.6);
      sun.lineBetween(cx - 40, h * 0.55 - 20 + i * 10, cx + 40, h * 0.55 - 20 + i * 10);
    }

    // Animated plane
    const plane = this.add.image(cx + 40, h * 0.32, 'plane').setScale(2.2);
    this.tweens.add({ targets: plane, y: h * 0.29, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: plane, angle: -5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const flame = this.add.image(cx - 10, h * 0.32, 'flame').setScale(2.2).setAlpha(0.8);
    this.tweens.add({ targets: flame, y: h * 0.29, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: flame, scaleX: { from: 1.8, to: 2.8 }, alpha: { from: 0.6, to: 1 }, duration: 100, yoyo: true, repeat: -1 });

    // Title
    this.add.text(cx + 2, h * 0.06 + 2, 'AVIATORE', {
      fontSize: '48px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.3);
    this.add.text(cx, h * 0.06, 'AVIATORE', {
      fontSize: '48px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Subtitle
    this.add.text(cx, h * 0.06 + 60, 'CRASH GAME', {
      fontSize: '22px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Tagline subtitle
    this.add.text(cx, h * 0.06 + 95, 'Estilo Aviator', {
      fontSize: '14px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5, 0);

    // Decorative line
    const decLine = this.add.graphics();
    decLine.lineStyle(1, COLORS.CYAN, 0.5);
    decLine.lineBetween(cx - 80, h * 0.06 + 115, cx + 80, h * 0.06 + 115);

    // Tagline
    this.add.text(cx, h * 0.48, 'Aposte, voe e faca cash out!', {
      fontSize: '14px', fontFamily: 'Arial', color: '#666666',
    }).setOrigin(0.5);

    // === PLAY BUTTON - BIG ===
    const btnY = h * 0.68;
    const btnW = w - 60;
    const btnH2 = 65;

    const btnGlow = this.add.graphics();
    btnGlow.fillStyle(COLORS.CYAN, 0.1);
    btnGlow.fillRoundedRect(cx - btnW / 2 - 4, btnY - 4, btnW + 8, btnH2 + 8, 16);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.CYAN);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH2, 12);

    this.add.text(cx, btnY + btnH2 / 2, 'JOGAR', {
      fontSize: '28px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const playHit = this.add.rectangle(cx, btnY + btnH2 / 2, btnW, btnH2).setInteractive({ useHandCursor: true });
    playHit.on('pointerover', () => {
      btnBg.clear(); btnBg.fillStyle(0x44a08d); btnBg.fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH2, 12);
    });
    playHit.on('pointerout', () => {
      btnBg.clear(); btnBg.fillStyle(COLORS.CYAN); btnBg.fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH2, 12);
    });
    playHit.on('pointerdown', () => {
      if (!this.musicOn) { synthMusic.start(); this.musicOn = true; }
      this.scene.start('CrashScene');
    });

    this.tweens.add({ targets: btnGlow, alpha: { from: 0.3, to: 1 }, duration: 1200, yoyo: true, repeat: -1 });

    // Music toggle
    const musicText = this.add.text(cx, h * 0.83, this.musicOn ? 'MUSICA: ON' : 'MUSICA: OFF', {
      fontSize: '14px', fontFamily: 'Arial', color: '#555555',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    musicText.on('pointerdown', () => {
      if (this.musicOn) {
        synthMusic.stop(); this.musicOn = false; musicText.setText('MUSICA: OFF');
      } else {
        synthMusic.start(); this.musicOn = true; musicText.setText('MUSICA: ON');
      }
    });

    // Credits
    this.add.text(cx, h - 32, 'Idealizado por Sergio, criado por Claude Code', {
      fontSize: '10px', fontFamily: 'Arial', color: '#444444',
    }).setOrigin(0.5);

    // Footer
    this.add.text(cx, h - 20, 'v2.0 - Offline Demo', {
      fontSize: '10px', fontFamily: 'Arial', color: '#333333',
    }).setOrigin(0.5);
  }
}
