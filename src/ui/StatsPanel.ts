import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';
import { GameState } from '../utils/GameState';

export class StatsPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);
    this.container.setVisible(false);
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.render();
      this.container.setVisible(true);
    } else {
      this.container.setVisible(false);
    }
  }

  private render(): void {
    this.container.removeAll(true);

    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // Overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);
    const overlayHit = this.scene.add.rectangle(w / 2, h / 2, w, h).setInteractive();
    overlayHit.on('pointerdown', () => this.toggle());
    this.container.add([overlay, overlayHit]);

    // Panel - full width for mobile
    const pw = w - 20, ph = h - 40;
    const px = 10, py = 20;

    const panel = this.scene.add.graphics();
    panel.fillStyle(COLORS.BG_PANEL);
    panel.fillRoundedRect(px, py, pw, ph, 16);
    panel.lineStyle(1, COLORS.BORDER);
    panel.strokeRoundedRect(px, py, pw, ph, 16);
    this.container.add(panel);

    const panelHit = this.scene.add.rectangle(w / 2, h / 2, pw, ph).setInteractive();
    panelHit.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); });
    this.container.add(panelHit);

    // Title
    this.addText(w / 2, py + 20, 'ESTATISTICAS', '18px', '#e0e0e0', true);

    // Close
    const closeBtn = this.scene.add.text(px + pw - 20, py + 10, 'X', {
      fontSize: '18px', fontFamily: 'Arial', color: '#888888', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggle());
    this.container.add(closeBtn);

    const stats = GameState.getStats();
    let y = py + 50;
    const col1 = px + pw * 0.25;
    const col2 = px + pw * 0.75;

    const cards: [string, string, string][] = [
      ['Rodadas', stats.total.toString(), '#a855f7'],
      ['Win Rate', stats.total ? (stats.wins / stats.total * 100).toFixed(1) + '%' : '0%', '#ffd700'],
      ['Lucro', (stats.totalProfit >= 0 ? '+' : '') + stats.totalProfit.toFixed(0), stats.totalProfit >= 0 ? '#4ecdc4' : '#ff4757'],
      ['Maior Ganho', '+' + stats.bigWin.toFixed(0), '#4ecdc4'],
      ['Maior Perda', stats.bigLoss.toFixed(0), '#ff4757'],
      ['Melhor Multi', stats.bestMult.toFixed(2) + 'x', '#ffd700'],
      ['Seq. Wins', stats.maxWinStreak.toString(), '#4ecdc4'],
      ['Seq. Losses', stats.maxLossStreak.toString(), '#ff4757'],
    ];

    cards.forEach((card, i) => {
      const cx = i % 2 === 0 ? col1 : col2;
      const cy = y + Math.floor(i / 2) * 50;

      const bg = this.scene.add.graphics();
      bg.fillStyle(COLORS.BG_DARK);
      bg.fillRoundedRect(cx - 70, cy - 8, 140, 40, 8);
      this.container.add(bg);

      this.addText(cx, cy, card[0], '9px', '#888888');
      this.addText(cx, cy + 16, card[1], '16px', card[2], true);
    });

    // Distribution
    y += 210;
    this.addText(w / 2, y, 'DISTRIBUICAO', '10px', '#666666');
    y += 18;

    const ranges = [
      { label: '1.0x', min: 1, max: 1.5, color: '#ff4757' },
      { label: '1.5-2x', min: 1.5, max: 2, color: '#ff6b81' },
      { label: '2-3x', min: 2, max: 3, color: '#ffd700' },
      { label: '3-5x', min: 3, max: 5, color: '#f0932b' },
      { label: '5-10x', min: 5, max: 10, color: '#4ecdc4' },
      { label: '10x+', min: 10, max: Infinity, color: '#a855f7' },
    ];

    const allCrashes = GameState.rounds.map(r => r.crashAt);
    ranges.forEach((range, i) => {
      const ry = y + i * 20;
      const count = allCrashes.filter(c => c >= range.min && c < range.max).length;
      const pct = stats.total ? (count / stats.total) : 0;

      this.addText(px + 45, ry, range.label, '11px', '#aaaaaa');

      const barBg = this.scene.add.graphics();
      barBg.fillStyle(COLORS.BG_DARK);
      barBg.fillRoundedRect(px + 80, ry - 3, pw - 130, 12, 4);
      this.container.add(barBg);

      const bar = this.scene.add.graphics();
      bar.fillStyle(Phaser.Display.Color.HexStringToColor(range.color).color);
      bar.fillRoundedRect(px + 80, ry - 3, Math.max(2, (pw - 130) * pct), 12, 4);
      this.container.add(bar);

      this.addText(px + pw - 25, ry, `${count}`, '10px', '#cccccc');
    });

    // Round log
    y += 135;
    this.addText(w / 2, y, 'HISTORICO', '10px', '#666666');
    y += 16;

    const logRounds = [...GameState.rounds].reverse().slice(0, 8);
    logRounds.forEach((r, i) => {
      const ry = y + i * 18;
      const num = GameState.rounds.length - i;
      const isWin = r.profit > 0;
      const color = isWin ? '#4ecdc4' : '#ff4757';
      const cashStr = r.cashedAt ? `${r.cashedAt.toFixed(2)}x` : 'X';
      const profitStr = (r.profit >= 0 ? '+' : '') + r.profit.toFixed(0);

      this.addText(px + 30, ry, `#${num}`, '10px', '#666666');
      this.addText(px + 80, ry, `${r.bet}`, '10px', '#aaaaaa');
      this.addText(px + 140, ry, `${r.crashAt.toFixed(2)}x`, '10px', '#888888');
      this.addText(px + 210, ry, cashStr, '10px', color);
      this.addText(px + 280, ry, profitStr, '10px', color, true);
    });
  }

  private addText(x: number, y: number, text: string, size: string, color: string, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size, fontFamily: 'Arial', color, fontStyle: bold ? 'bold' : 'normal',
    }).setOrigin(0.5, 0);
    this.container.add(t);
    return t;
  }
}
