import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';
import { GameState } from '../utils/GameState';

/**
 * Portrait mobile-first UI layout for CrashScene.
 * Layout (top to bottom):
 *   [Balance bar]        y=0-40
 *   [Mascot area]        y=40-140  (managed by CrashScene)
 *   [Graph area]         y=150-440
 *   [Multiplier overlay] centered in graph
 *   [History row]        y=450-480
 *   [Bet controls]       y=490-560
 *   [Action buttons]     y=570-650
 *   [Bottom bar]         y=660-780
 */
export class CrashUI {
  private scene: Phaser.Scene;
  private balanceText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private historyTexts: Phaser.GameObjects.Text[] = [];

  private playBtn!: Phaser.GameObjects.Container;
  private cashoutBtn!: Phaser.GameObjects.Container;

  private betAmount: number = GAME_CONFIG.DEFAULT_BET;

  onPlay?: () => void;
  onCashOut?: () => void;
  onOpenStats?: () => void;
  onOpenSettings?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const w = GAME_CONFIG.WIDTH;

    // === TOP BAR (balance) ===
    const topBar = this.scene.add.graphics();
    topBar.fillStyle(COLORS.BG_PANEL, 0.8);
    topBar.fillRect(0, 0, w, 42);

    this.add.text(15, 12, 'CRASH', {
      fontSize: '18px', fontFamily: 'Arial', color: '#e0e0e0', fontStyle: 'bold',
    });

    this.balanceText = this.add.text(w - 15, 12, `${GameState.balance.toFixed(0)} coins`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
    }).setOrigin(1, 0);

    // === GRAPH AREA ===
    const graphBg = this.scene.add.graphics();
    graphBg.fillStyle(COLORS.BG_PANEL, 0.5);
    graphBg.fillRoundedRect(10, 150, w - 20, 290, 12);
    graphBg.lineStyle(1, COLORS.BORDER, 0.5);
    graphBg.strokeRoundedRect(10, 150, w - 20, 290, 12);

    // Multiplier (centered in graph)
    this.multiplierText = this.add.text(w / 2, 290, '1.00x', {
      fontSize: '56px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.85);

    // Status text above graph
    this.statusText = this.add.text(w / 2, 155, 'Faca sua aposta', {
      fontSize: '13px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5, 0);

    // === BET CONTROLS ===
    this.createBetControls();

    // === ACTION BUTTONS ===
    this.createActionButtons();

    // === BOTTOM BAR ===
    this.createBottomBar();
  }

  private createBetControls(): void {
    const w = GAME_CONFIG.WIDTH;
    const y = 490;

    this.add.text(w / 2, y, 'APOSTA', {
      fontSize: '12px', fontFamily: 'Arial', color: '#666666',
    }).setOrigin(0.5);

    // Bet row: [-] [amount] [+]
    const rowY = y + 22;
    const btnSize = 44;

    // Minus
    this.createButton(w / 2 - 80, rowY, btnSize, btnSize, '-', COLORS.BORDER, () => this.changeBet(-5), '20px');

    // Bet amount display
    const betBg = this.scene.add.graphics();
    betBg.fillStyle(COLORS.BG_DARK);
    betBg.fillRoundedRect(w / 2 - 30, rowY, 60, btnSize, 8);
    this.betText = this.add.text(w / 2, rowY + btnSize / 2, this.betAmount.toString(), {
      fontSize: '22px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Plus
    this.createButton(w / 2 + 36, rowY, btnSize, btnSize, '+', COLORS.BORDER, () => this.changeBet(5), '20px');

    // Quick bet buttons
    const quickY = rowY + btnSize + 8;
    const quickBets = [5, 10, 25, 50, 100];
    const qw = (w - 30) / quickBets.length;
    quickBets.forEach((amt, i) => {
      this.createButton(10 + i * qw + 2, quickY, qw - 4, 28, amt.toString(), 0x2a2a5e, () => {
        this.betAmount = amt;
        this.betText.setText(amt.toString());
      }, '12px');
    });
  }

  private createActionButtons(): void {
    const w = GAME_CONFIG.WIDTH;
    const y = 610;
    const gap = 10;
    const btnH = 56;
    const halfW = (w - 30) / 2;

    // JOGAR
    this.playBtn = this.createButton(10, y, halfW, btnH, 'JOGAR', COLORS.CYAN, () => this.onPlay?.(), '20px');

    // CASH OUT
    this.cashoutBtn = this.createButton(10 + halfW + gap, y, halfW, btnH, 'CASH OUT', COLORS.GOLD, () => this.onCashOut?.(), '18px');
    this.setCashoutEnabled(false);
  }

  private createBottomBar(): void {
    const w = GAME_CONFIG.WIDTH;
    const y = 680;
    const btnW = (w - 40) / 3;
    const btnH = 36;

    this.createButton(10, y, btnW, btnH, 'STATS', COLORS.PURPLE, () => this.onOpenStats?.(), '13px');
    this.createButton(15 + btnW, y, btnW, btnH, 'CONFIG', COLORS.BORDER, () => this.onOpenSettings?.(), '13px');
    this.createButton(20 + btnW * 2, y, btnW, btnH, 'MENU', 0x444444, () => this.scene.scene.start('MenuScene'), '13px');
  }

  private createButton(x: number, y: number, bw: number, bh: number, label: string, color: number, onClick: () => void, fontSize = '14px'): Phaser.GameObjects.Container {
    const bg = this.scene.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(0, 0, bw, bh, 8);

    const text = this.scene.add.text(bw / 2, bh / 2, label, {
      fontSize, fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitArea = this.scene.add.rectangle(bw / 2, bh / 2, bw, bh).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(0, 0, bw, bh, 8); });
    hitArea.on('pointerout', () => { bg.clear(); bg.fillStyle(color); bg.fillRoundedRect(0, 0, bw, bh, 8); });

    return this.scene.add.container(x, y, [bg, text, hitArea]);
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
    this.scene.tweens.add({ targets: this.multiplierText, scale: 1.2, duration: 200, yoyo: true });
  }

  setCashedOut(winnings: number): void {
    this.multiplierText.setColor('#ffd700');
    this.setStatus(`Cash out! +${winnings.toFixed(2)}`);
  }

  updateBalance(): void {
    this.balanceText.setText(`${GameState.balance.toFixed(0)} coins`);
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
    let xOffset = 10;
    const y = 452;

    history.slice(0, 8).forEach(h => {
      let color = '#ff4757';
      if (h >= 2 && h < 5) color = '#ffd700';
      else if (h >= 5) color = '#4ecdc4';

      const t = this.add.text(xOffset, y, `${h.toFixed(2)}x`, {
        fontSize: '12px', fontFamily: 'Arial', color, fontStyle: 'bold',
        backgroundColor: color + '33',
        padding: { x: 5, y: 2 },
      });
      this.historyTexts.push(t);
      xOffset += t.width + 6;
    });
  }

  private add = {
    text: (x: number, y: number, text: string, style: object) => {
      return this.scene.add.text(x, y, text, style);
    }
  };
}
