import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';
import { GameState } from '../utils/GameState';

export class CrashUI {
  private scene: Phaser.Scene;
  private balanceText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private historyTexts: Phaser.GameObjects.Text[] = [];

  // Buttons
  private playBtn!: Phaser.GameObjects.Container;
  private cashoutBtn!: Phaser.GameObjects.Container;
  private betUpBtn!: Phaser.GameObjects.Container;
  private betDownBtn!: Phaser.GameObjects.Container;
  private statsBtn!: Phaser.GameObjects.Container;
  private settingsBtn!: Phaser.GameObjects.Container;

  private betAmount: number = GAME_CONFIG.DEFAULT_BET;

  // Callbacks
  onPlay?: () => void;
  onCashOut?: () => void;
  onOpenStats?: () => void;
  onOpenSettings?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const w = GAME_CONFIG.WIDTH;

    // Top bar
    this.add.text(20, 15, 'CRASH GAME', {
      fontSize: '20px', fontFamily: 'Arial', color: '#e0e0e0', fontStyle: 'bold',
    });

    this.balanceText = this.add.text(w - 20, 15, `Saldo: ${GameState.balance.toFixed(2)}`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#4ecdc4',
    }).setOrigin(1, 0);

    // Graph area background
    const graphBg = this.scene.add.graphics();
    graphBg.fillStyle(COLORS.BG_PANEL, 0.6);
    graphBg.fillRoundedRect(30, 50, w - 60, 340, 12);
    graphBg.lineStyle(1, COLORS.BORDER);
    graphBg.strokeRoundedRect(30, 50, w - 60, 340, 12);

    // Multiplier display (center of graph)
    this.multiplierText = this.add.text(w / 2, 200, '1.00x', {
      fontSize: '64px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.9);

    // Status text
    this.statusText = this.add.text(w / 2, 70, 'Faça sua aposta e clique em JOGAR', {
      fontSize: '14px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5);

    // Controls bar
    this.createControls();
  }

  private createControls(): void {
    const y = 430;
    const w = GAME_CONFIG.WIDTH;

    // Bet display
    this.add.text(40, y, 'APOSTA', { fontSize: '11px', fontFamily: 'Arial', color: '#888888' });

    this.betDownBtn = this.createButton(40, y + 18, 30, 30, '-', COLORS.BORDER, () => this.changeBet(-5));
    this.betText = this.add.text(90, y + 18, this.betAmount.toString(), {
      fontSize: '18px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    });
    this.betUpBtn = this.createButton(140, y + 18, 30, 30, '+', COLORS.BORDER, () => this.changeBet(5));

    // Play button
    this.playBtn = this.createButton(200, y + 10, 120, 40, 'JOGAR', COLORS.CYAN, () => this.onPlay?.());

    // Cashout button
    this.cashoutBtn = this.createButton(340, y + 10, 140, 40, 'CASH OUT', COLORS.GOLD, () => this.onCashOut?.());
    this.setCashoutEnabled(false);

    // Stats button
    this.statsBtn = this.createButton(510, y + 10, 80, 40, 'STATS', COLORS.PURPLE, () => this.onOpenStats?.());

    // Settings button
    this.settingsBtn = this.createButton(610, y + 10, 50, 40, '⚙', COLORS.BORDER, () => this.onOpenSettings?.());

    // Back to menu
    this.createButton(680, y + 10, 80, 40, 'MENU', 0x555555, () => this.scene.scene.start('MenuScene'));
  }

  private createButton(x: number, y: number, w: number, h: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.scene.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(0, 0, w, h, 6);

    const text = this.scene.add.text(w / 2, h / 2, label, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitArea = this.scene.add.rectangle(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(0, 0, w, h, 6); });
    hitArea.on('pointerout', () => { bg.clear(); bg.fillStyle(color); bg.fillRoundedRect(0, 0, w, h, 6); });

    const container = this.scene.add.container(x, y, [bg, text, hitArea]);
    return container;
  }

  private changeBet(delta: number): void {
    this.betAmount = Math.max(GAME_CONFIG.MIN_BET, this.betAmount + delta);
    this.betText.setText(this.betAmount.toString());
  }

  getBetAmount(): number { return this.betAmount; }

  setMultiplier(value: number, color: string = '#4ecdc4'): void {
    this.multiplierText.setText(`${value.toFixed(2)}x`);
    this.multiplierText.setColor(color);
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }

  setCrashed(): void {
    this.multiplierText.setColor('#ff4757');
    this.scene.tweens.add({
      targets: this.multiplierText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
    });
  }

  setCashedOut(winnings: number): void {
    this.multiplierText.setColor('#ffd700');
    this.setStatus(`Cash out! +${winnings.toFixed(2)} moedas`);
  }

  updateBalance(): void {
    this.balanceText.setText(`Saldo: ${GameState.balance.toFixed(2)}`);
  }

  setPlayEnabled(enabled: boolean): void {
    this.playBtn.setAlpha(enabled ? 1 : 0.4);
    const hitArea = this.playBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (enabled) hitArea.setInteractive({ useHandCursor: true });
    else hitArea.disableInteractive();
  }

  setCashoutEnabled(enabled: boolean): void {
    this.cashoutBtn.setAlpha(enabled ? 1 : 0.4);
    const hitArea = this.cashoutBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (enabled) hitArea.setInteractive({ useHandCursor: true });
    else hitArea.disableInteractive();
  }

  updateHistory(): void {
    this.historyTexts.forEach(t => t.destroy());
    this.historyTexts = [];

    const history = GameState.crashHistory;
    const startX = 40;
    const y = 490;
    let xOffset = 0;

    history.forEach(h => {
      let color = '#ff4757';
      if (h >= 2 && h < 5) color = '#ffd700';
      else if (h >= 5) color = '#4ecdc4';

      const t = this.add.text(startX + xOffset, y, `${h.toFixed(2)}x`, {
        fontSize: '13px', fontFamily: 'Arial', color, fontStyle: 'bold',
        backgroundColor: color + '33',
        padding: { x: 6, y: 3 },
      });
      this.historyTexts.push(t);
      xOffset += t.width + 8;
    });
  }

  private add = {
    text: (x: number, y: number, text: string, style: object) => {
      return this.scene.add.text(x, y, text, style);
    }
  };
}
