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
    for (let i = 0; i < 12; i++) {
      const y = h * 0.6 + i * 15;
      grid.lineBetween(0, y, w, y);
    }
    for (let i = -6; i <= 6; i++) {
      grid.lineBetween(cx + i * 30, h * 0.6, cx + i * 120, h);
    }

    // Stars
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h * 0.6);
      const size = Phaser.Math.FloatBetween(0.5, 2.5);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.05, 0.2),
        duration: Phaser.Math.Between(800, 2500),
        yoyo: true,
        repeat: -1,
      });
    }

    // Shooting stars
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        const sx = Phaser.Math.Between(100, w - 100);
        const shootingStar = this.add.circle(sx, 0, 2, 0xffffff, 0.9);
        this.tweens.add({
          targets: shootingStar,
          x: sx + 150, y: h * 0.4, alpha: 0,
          duration: 800, ease: 'Power2',
          onComplete: () => shootingStar.destroy(),
        });
      },
    });

    // Horizon glow line
    const horizonGlow = this.add.graphics();
    horizonGlow.lineStyle(2, COLORS.CYAN, 0.4);
    horizonGlow.lineBetween(0, h * 0.6, w, h * 0.6);

    // Retro sun at horizon
    const sun = this.add.graphics();
    sun.fillStyle(0xff4757, 0.15);
    sun.fillCircle(cx, h * 0.6, 80);
    sun.fillStyle(0xff4757, 0.25);
    sun.fillCircle(cx, h * 0.6, 50);
    sun.fillStyle(0xff6b6b, 0.35);
    sun.fillCircle(cx, h * 0.6, 30);
    for (let i = 0; i < 6; i++) {
      sun.lineStyle(2, 0x0f0f23, 0.6);
      sun.lineBetween(cx - 50, h * 0.6 - 25 + i * 10, cx + 50, h * 0.6 - 25 + i * 10);
    }

    // Animated plane
    const plane = this.add.image(cx + 60, h * 0.35, 'plane').setScale(2.5);
    this.tweens.add({ targets: plane, y: h * 0.32, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: plane, angle: -5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Flame behind plane
    const flame = this.add.image(cx - 5, h * 0.35, 'flame').setScale(2.5).setAlpha(0.8);
    this.tweens.add({ targets: flame, y: h * 0.32, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: flame, scaleX: { from: 2, to: 3 }, alpha: { from: 0.6, to: 1 }, duration: 100, yoyo: true, repeat: -1 });

    // Title shadow + title
    this.add.text(cx + 2, h * 0.08 + 2, 'CRASH GAME', {
      fontSize: '52px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.3);
    this.add.text(cx, h * 0.08, 'CRASH GAME', {
      fontSize: '52px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Subtitle
    this.add.text(cx, h * 0.08 + 60, 'ESTILO AVIATOR', {
      fontSize: '16px', fontFamily: 'Arial', color: '#4ecdc4',
    }).setOrigin(0.5, 0);

    // Decorative line
    const decLine = this.add.graphics();
    decLine.lineStyle(1, COLORS.CYAN, 0.5);
    decLine.lineBetween(cx - 100, h * 0.08 + 85, cx + 100, h * 0.08 + 85);

    // Tagline
    this.add.text(cx, h * 0.55, 'Aposte, voe e faca cash out antes do crash!', {
      fontSize: '14px', fontFamily: 'Arial', color: '#666666',
    }).setOrigin(0.5);

    // === PLAY BUTTON ===
    const btnY = h * 0.7;
    const btnW = 220;
    const btnH2 = 55;

    const btnGlow = this.add.graphics();
    btnGlow.fillStyle(COLORS.CYAN, 0.1);
    btnGlow.fillRoundedRect(cx - btnW / 2 - 4, btnY - 4, btnW + 8, btnH2 + 8, 14);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.CYAN);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH2, 10);

    this.add.text(cx, btnY + btnH2 / 2, 'JOGAR', {
      fontSize: '24px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const playHit = this.add.rectangle(cx, btnY + btnH2 / 2, btnW, btnH2).setInteractive({ useHandCursor: true });
    playHit.on('pointerover', () => {
      btnBg.clear(); btnBg.fillStyle(0x44a08d); btnBg.fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH2, 10);
    });
    playHit.on('pointerout', () => {
      btnBg.clear(); btnBg.fillStyle(COLORS.CYAN); btnBg.fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH2, 10);
    });
    playHit.on('pointerdown', () => {
      if (!this.musicOn) { synthMusic.start(); this.musicOn = true; }
      this.scene.start('CrashScene');
    });

    this.tweens.add({ targets: btnGlow, alpha: { from: 0.3, to: 1 }, duration: 1200, yoyo: true, repeat: -1 });

    // === MUSIC TOGGLE ===
    const musicText = this.add.text(w - 20, h - 25, this.musicOn ? 'MUSICA: ON' : 'MUSICA: OFF', {
      fontSize: '12px', fontFamily: 'Arial', color: '#555555',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    musicText.on('pointerdown', () => {
      if (this.musicOn) {
        synthMusic.stop(); this.musicOn = false; musicText.setText('MUSICA: OFF');
      } else {
        synthMusic.start(); this.musicOn = true; musicText.setText('MUSICA: ON');
      }
    });

    // Footer
    this.add.text(cx, h - 25, 'v1.0 - Offline Demo', {
      fontSize: '11px', fontFamily: 'Arial', color: '#333333',
    }).setOrigin(0.5);
  }
}
