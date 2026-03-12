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

    // Panel
    const pw = 420, ph = 480;
    const px = (w - pw) / 2, py = (h - ph) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(COLORS.BG_PANEL);
    panel.fillRoundedRect(px, py, pw, ph, 16);
    panel.lineStyle(1, COLORS.BORDER);
    panel.strokeRoundedRect(px, py, pw, ph, 16);
    this.container.add(panel);

    // Stop click-through on panel
    const panelHit = this.scene.add.rectangle(w / 2, h / 2, pw, ph).setInteractive();
    panelHit.on('pointerdown', (p: Phaser.Input.Pointer, lx: number, ly: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
    });
    this.container.add(panelHit);

    // Title
    this.addText(w / 2, py + 25, 'ESTATISTICAS', '20px', '#e0e0e0', true);

    // Close button
    const closeBtn = this.scene.add.text(px + pw - 20, py + 10, 'X', {
      fontSize: '18px', fontFamily: 'Arial', color: '#888888', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggle());
    this.container.add(closeBtn);

    const stats = GameState.getStats();
    let y = py + 60;
    const col1 = px + 110;
    const col2 = px + 310;

    // Stats grid
    const cards: [string, string, string][] = [
      ['Rodadas', stats.total.toString(), '#a855f7'],
      ['Win Rate', stats.total ? (stats.wins / stats.total * 100).toFixed(1) + '%' : '0%', '#ffd700'],
      ['Lucro Total', (stats.totalProfit >= 0 ? '+' : '') + stats.totalProfit.toFixed(2), stats.totalProfit >= 0 ? '#4ecdc4' : '#ff4757'],
      ['Maior Ganho', '+' + stats.bigWin.toFixed(2), '#4ecdc4'],
      ['Maior Perda', stats.bigLoss.toFixed(2), '#ff4757'],
      ['Melhor Multi', stats.bestMult.toFixed(2) + 'x', '#ffd700'],
      ['Seq. Wins', stats.maxWinStreak.toString(), '#4ecdc4'],
      ['Seq. Losses', stats.maxLossStreak.toString(), '#ff4757'],
    ];

    cards.forEach((card, i) => {
      const cx = i % 2 === 0 ? col1 : col2;
      const cy = y + Math.floor(i / 2) * 55;

      const bg = this.scene.add.graphics();
      bg.fillStyle(COLORS.BG_DARK);
      bg.fillRoundedRect(cx - 80, cy - 10, 160, 45, 8);
      this.container.add(bg);

      this.addText(cx, cy, card[0], '10px', '#888888');
      this.addText(cx, cy + 20, card[1], '18px', card[2], true);
    });

    // Crash distribution
    y += 230;
    this.addText(w / 2, y, 'DISTRIBUICAO DE CRASHES', '11px', '#666666');
    y += 20;

    const ranges = [
      { label: '1.00x', min: 1, max: 1.5, color: '#ff4757' },
      { label: '1.5-2x', min: 1.5, max: 2, color: '#ff6b81' },
      { label: '2-3x', min: 2, max: 3, color: '#ffd700' },
      { label: '3-5x', min: 3, max: 5, color: '#f0932b' },
      { label: '5-10x', min: 5, max: 10, color: '#4ecdc4' },
      { label: '10x+', min: 10, max: Infinity, color: '#a855f7' },
    ];

    const allCrashes = GameState.rounds.map(r => r.crashAt);
    ranges.forEach((range, i) => {
      const ry = y + i * 22;
      const count = allCrashes.filter(c => c >= range.min && c < range.max).length;
      const pct = stats.total ? (count / stats.total) : 0;

      this.addText(px + 60, ry, range.label, '12px', '#aaaaaa');

      const barBg = this.scene.add.graphics();
      barBg.fillStyle(COLORS.BG_DARK);
      barBg.fillRoundedRect(px + 100, ry - 4, 220, 14, 4);
      this.container.add(barBg);

      const bar = this.scene.add.graphics();
      bar.fillStyle(Phaser.Display.Color.HexStringToColor(range.color).color);
      bar.fillRoundedRect(px + 100, ry - 4, Math.max(2, 220 * pct), 14, 4);
      this.container.add(bar);

      this.addText(px + 330, ry, `${count}`, '11px', '#cccccc');
    });
  }

  private addText(x: number, y: number, text: string, size: string, color: string, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size,
      fontFamily: 'Arial',
      color,
      fontStyle: bold ? 'bold' : 'normal',
    }).setOrigin(0.5, 0);
    this.container.add(t);
    return t;
  }
}
