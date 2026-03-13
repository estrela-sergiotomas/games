import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';
import { synthMusic } from '../assets/music';

export class MenuScene extends Phaser.Scene {
  private musicOn = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Stop music when returning to menu (prevents overlap)
    synthMusic.stop();
    this.musicOn = false;

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

    // === TITLE: SERGIO PROTOTYPES ===
    this.add.text(cx + 2, h * 0.05 + 2, 'SERGIO', {
      fontSize: '44px', fontFamily: 'Arial', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.3);
    this.add.text(cx, h * 0.05, 'SERGIO', {
      fontSize: '44px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.add.text(cx, h * 0.05 + 50, 'PROTOTYPES', {
      fontSize: '24px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Decorative line
    const decLine = this.add.graphics();
    decLine.lineStyle(1, COLORS.CYAN, 0.5);
    decLine.lineBetween(cx - 100, h * 0.05 + 82, cx + 100, h * 0.05 + 82);

    this.add.text(cx, h * 0.05 + 92, 'Selecione um jogo', {
      fontSize: '13px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5, 0);

    // === GAME CARDS ===
    const cardStartY = h * 0.22;
    const cardW = w - 40;
    const cardH = 120;
    const cardGap = 15;

    // --- CARD 1: AVIATORE ---
    this.createGameCard(
      cx, cardStartY, cardW, cardH,
      'AVIATORE',
      'Crash Game',
      'Aposte, voe e faca cash out\nantes do aviao crashar!',
      COLORS.CYAN,
      0x1a3a5e,
      () => {
        if (!this.musicOn) { synthMusic.start(); this.musicOn = true; }
        this.scene.start('CrashScene');
      },
      'plane',
    );

    // --- CARD 2: COIN RUNNER ---
    this.createGameCard(
      cx, cardStartY + cardH + cardGap, cardW, cardH,
      'COIN RUNNER',
      'Platformer Bet',
      'Corra, pule e colete moedas!\nCash out antes de morrer!',
      0xffd700,
      0x3e2a08,
      () => {
        if (!this.musicOn) { synthMusic.start(); this.musicOn = true; }
        this.scene.start('CoinRunnerScene');
      },
      'runner',
    );

    // === COMING SOON placeholder ===
    const comingSoonY = cardStartY + (cardH + cardGap) * 2;
    const csGfx = this.add.graphics();
    csGfx.fillStyle(0x1a1a3e, 0.3);
    csGfx.fillRoundedRect(cx - cardW / 2, comingSoonY, cardW, 50, 12);
    csGfx.lineStyle(1, COLORS.BORDER, 0.3);
    csGfx.strokeRoundedRect(cx - cardW / 2, comingSoonY, cardW, 50, 12);

    this.add.text(cx, comingSoonY + 25, 'EM BREVE...  Mais jogos!', {
      fontSize: '14px', fontFamily: 'Arial', color: '#555555',
    }).setOrigin(0.5);

    // Music toggle
    const musicText = this.add.text(cx, h * 0.85, this.musicOn ? 'MUSICA: ON' : 'MUSICA: OFF', {
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
      fontSize: '11px', fontFamily: 'Arial', color: '#777777',
    }).setOrigin(0.5);

    // Footer
    this.add.text(cx, h - 20, 'v3.0 - Offline Demo', {
      fontSize: '10px', fontFamily: 'Arial', color: '#333333',
    }).setOrigin(0.5);
  }

  private createGameCard(
    cx: number, y: number, w: number, h: number,
    title: string, subtitle: string, desc: string,
    accentColor: number, bgColor: number,
    onClick: () => void,
    iconKey: string,
  ): void {
    // Card background
    const cardBg = this.add.graphics();
    cardBg.fillStyle(bgColor, 0.7);
    cardBg.fillRoundedRect(cx - w / 2, y, w, h, 12);
    cardBg.lineStyle(2, accentColor, 0.6);
    cardBg.strokeRoundedRect(cx - w / 2, y, w, h, 12);

    // Icon
    const icon = this.add.image(cx - w / 2 + 40, y + h / 2, iconKey).setScale(2.5);
    this.tweens.add({
      targets: icon,
      y: y + h / 2 - 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title
    this.add.text(cx + 10, y + 15, title, {
      fontSize: '22px', fontFamily: 'Arial',
      color: '#' + accentColor.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Subtitle
    this.add.text(cx + 10, y + 42, subtitle, {
      fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5, 0);

    // Description
    this.add.text(cx + 10, y + 60, desc, {
      fontSize: '11px', fontFamily: 'Arial', color: '#888888',
      align: 'center',
    }).setOrigin(0.5, 0);

    // Play button
    const btnW = 90;
    const btnH = 28;
    const btnX = cx + w / 2 - 65;
    const btnY = y + h - 38;

    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(accentColor);
    btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 6);

    this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'JOGAR', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hit area for entire card
    const hitArea = this.add.rectangle(cx, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      cardBg.clear();
      cardBg.fillStyle(bgColor, 0.9);
      cardBg.fillRoundedRect(cx - w / 2, y, w, h, 12);
      cardBg.lineStyle(2, accentColor, 1);
      cardBg.strokeRoundedRect(cx - w / 2, y, w, h, 12);
    });
    hitArea.on('pointerout', () => {
      cardBg.clear();
      cardBg.fillStyle(bgColor, 0.7);
      cardBg.fillRoundedRect(cx - w / 2, y, w, h, 12);
      cardBg.lineStyle(2, accentColor, 0.6);
      cardBg.strokeRoundedRect(cx - w / 2, y, w, h, 12);
    });
    hitArea.on('pointerdown', onClick);
  }
}
