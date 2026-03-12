import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants';
import { GameState } from '../utils/GameState';
import { Plane } from '../objects/Plane';
import { CrashUI } from '../ui/CrashUI';
import { StatsPanel } from '../ui/StatsPanel';
import { SettingsPanel, GameSettings } from '../ui/SettingsPanel';

export class CrashScene extends Phaser.Scene {
  private plane!: Plane;
  private ui!: CrashUI;
  private statsPanel!: StatsPanel;
  private settingsPanel!: SettingsPanel;

  private graphGraphics!: Phaser.GameObjects.Graphics;

  // Game state
  private isRunning = false;
  private hasCashedOut = false;
  private currentMultiplier = 1;
  private crashPoint = 1;
  private betAmount = 0;
  private startTime = 0;

  // Settings overrides
  private houseEdge: number = GAME_CONFIG.HOUSE_EDGE;
  private instantCrashChance: number = GAME_CONFIG.INSTANT_CRASH_CHANCE;
  private multiplierSpeed: number = GAME_CONFIG.MULTIPLIER_SPEED;

  // Graph area
  private readonly graphX = 40;
  private readonly graphY = 60;
  private readonly graphW = GAME_CONFIG.WIDTH - 80;
  private readonly graphH = 320;

  constructor() {
    super({ key: 'CrashScene' });
  }

  create(): void {
    // Stars background
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, GAME_CONFIG.WIDTH);
      const y = Phaser.Math.Between(0, GAME_CONFIG.HEIGHT);
      const star = this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4));
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(1500, 4000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Graph drawing layer
    this.graphGraphics = this.add.graphics();

    // Plane
    this.plane = new Plane(this, this.graphX + 30, this.graphY + this.graphH - 20);
    this.plane.setVisible(true);

    // UI
    this.ui = new CrashUI(this);
    this.ui.create();
    this.ui.onPlay = () => this.startGame();
    this.ui.onCashOut = () => this.cashOut();
    this.ui.onOpenStats = () => this.statsPanel.toggle();
    this.ui.onOpenSettings = () => this.settingsPanel.toggle();

    // Stats panel
    this.statsPanel = new StatsPanel(this);
    this.statsPanel.create();

    // Settings panel
    this.settingsPanel = new SettingsPanel(this);
    this.settingsPanel.create();
    this.settingsPanel.onSettingsChange = (s: GameSettings) => this.applySettings(s);

    // Keyboard: space to cash out
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.isRunning && !this.hasCashedOut) this.cashOut();
    });
  }

  private applySettings(s: GameSettings): void {
    this.houseEdge = s.houseEdge;
    this.instantCrashChance = s.instantCrashChance;
    this.multiplierSpeed = s.multiplierSpeed;
    this.ui.setStatus(`Configuracoes aplicadas! RTP: ${((1 - s.houseEdge) * 100).toFixed(1)}%`);
  }

  private generateCrashPoint(): number {
    const r = Math.random();
    if (r < this.instantCrashChance) return 1.00;
    return Math.max(1, Math.floor(((1 - this.houseEdge) / (1 - r)) * 100) / 100);
  }

  private startGame(): void {
    this.betAmount = this.ui.getBetAmount();
    if (!GameState.deductBet(this.betAmount)) {
      this.ui.setStatus('Saldo insuficiente!');
      return;
    }

    this.ui.updateBalance();
    this.crashPoint = this.generateCrashPoint();
    this.currentMultiplier = 1;
    this.isRunning = true;
    this.hasCashedOut = false;
    this.startTime = this.time.now;

    this.ui.setPlayEnabled(false);
    this.ui.setCashoutEnabled(true);
    this.ui.setStatus('Subindo...');
    this.ui.setMultiplier(1, '#4ecdc4');

    this.plane.reset(this.graphX + 30, this.graphY + this.graphH - 20);
    this.plane.startFlying();

    this.graphGraphics.clear();
  }

  private cashOut(): void {
    if (!this.isRunning || this.hasCashedOut) return;
    this.hasCashedOut = true;

    const winnings = this.betAmount * this.currentMultiplier;
    GameState.addWinnings(winnings);

    this.ui.updateBalance();
    this.ui.setCashedOut(winnings);
    this.ui.setCashoutEnabled(false);
  }

  private endGame(): void {
    this.isRunning = false;
    this.ui.setPlayEnabled(true);
    this.ui.setCashoutEnabled(false);

    if (!this.hasCashedOut) {
      this.ui.setMultiplier(this.crashPoint, '#ff4757');
      this.ui.setCrashed();
      this.ui.setStatus(`Crashou em ${this.crashPoint.toFixed(2)}x! Perdeu ${this.betAmount.toFixed(2)} moedas`);
      this.plane.explode();

      GameState.recordRound({
        bet: this.betAmount, crashAt: this.crashPoint, cashedAt: null, profit: -this.betAmount,
      });
    } else {
      const profit = this.betAmount * this.currentMultiplier - this.betAmount;
      this.plane.stopFlying();
      GameState.recordRound({
        bet: this.betAmount, crashAt: this.crashPoint, cashedAt: this.currentMultiplier, profit,
      });
    }

    this.ui.updateHistory();
    this.ui.updateBalance();
  }

  update(): void {
    if (!this.isRunning) return;

    const elapsed = (this.time.now - this.startTime) / 1000;
    this.currentMultiplier = Math.pow(Math.E, this.multiplierSpeed * elapsed);
    this.currentMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

    if (this.currentMultiplier >= this.crashPoint) {
      this.currentMultiplier = this.crashPoint;
      this.drawGraph(elapsed, true);
      this.endGame();
      return;
    }

    // Color based on multiplier
    let color = '#4ecdc4';
    if (this.currentMultiplier >= 5) color = '#ff6b6b';
    else if (this.currentMultiplier >= 2) color = '#ffd700';

    this.ui.setMultiplier(this.currentMultiplier, color);
    this.drawGraph(elapsed, false);
  }

  private drawGraph(elapsed: number, crashed: boolean): void {
    this.graphGraphics.clear();

    const gx = this.graphX;
    const gy = this.graphY;
    const gw = this.graphW;
    const gh = this.graphH;

    // Grid lines
    this.graphGraphics.lineStyle(0.5, COLORS.BORDER, 0.3);
    for (let i = 0; i < 8; i++) {
      const y = gy + (gh / 8) * i;
      this.graphGraphics.lineBetween(gx, y, gx + gw, y);
    }

    const maxTime = Math.max(elapsed + 1, 5);
    const maxMult = Math.max(this.currentMultiplier + 0.5, 3);

    // Draw curve
    const lineColor = crashed ? COLORS.RED : COLORS.CYAN;
    this.graphGraphics.lineStyle(3, lineColor);

    const steps = Math.min(Math.floor(elapsed * 60), 2000);
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / 60;
      const mult = Math.pow(Math.E, this.multiplierSpeed * t);
      const x = gx + (t / maxTime) * gw;
      const y = gy + gh - ((mult - 1) / (maxMult - 1)) * (gh - 30) - 10;
      points.push({ x, y });
    }

    if (points.length > 1) {
      this.graphGraphics.beginPath();
      this.graphGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.graphGraphics.lineTo(points[i].x, points[i].y);
      }
      this.graphGraphics.strokePath();

      // Fill under curve
      this.graphGraphics.fillStyle(lineColor, 0.1);
      this.graphGraphics.beginPath();
      this.graphGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.graphGraphics.lineTo(points[i].x, points[i].y);
      }
      this.graphGraphics.lineTo(points[points.length - 1].x, gy + gh);
      this.graphGraphics.lineTo(points[0].x, gy + gh);
      this.graphGraphics.closePath();
      this.graphGraphics.fillPath();
    }

    // Update plane position
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      this.plane.setPosition(lastPoint.x + 20, lastPoint.y);
    }
  }
}
