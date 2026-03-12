import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants';
import { GameState } from '../utils/GameState';
import { Plane } from '../objects/Plane';
import { Mascot } from '../objects/Mascot';
import { CrashUI } from '../ui/CrashUI';
import { StatsPanel } from '../ui/StatsPanel';
import { SettingsPanel, GameSettings } from '../ui/SettingsPanel';
import { SoundFX } from '../assets/sfx';

type RoundPhase = 'betting' | 'flying' | 'result';

export class CrashScene extends Phaser.Scene {
  private plane!: Plane;
  private mascot!: Mascot;
  private ui!: CrashUI;
  private statsPanel!: StatsPanel;
  private settingsPanel!: SettingsPanel;

  private graphGraphics!: Phaser.GameObjects.Graphics;

  private phase: RoundPhase = 'betting';
  private hasCashedOut = false;
  private currentMultiplier = 1;
  private crashPoint = 1;
  private betAmount = 0;
  private startTime = 0;
  private playerJoined = false;
  private lastLost = false;

  private houseEdge: number = GAME_CONFIG.HOUSE_EDGE;
  private instantCrashChance: number = GAME_CONFIG.INSTANT_CRASH_CHANCE;
  private multiplierSpeed: number = GAME_CONFIG.MULTIPLIER_SPEED;

  // Round system
  private roundNumber = 0;
  private countdownTimer = 0;
  private countdownEvent?: Phaser.Time.TimerEvent;

  // SFX timer
  private jetSfxTimer?: Phaser.Time.TimerEvent;

  // Graph area - portrait layout
  private readonly graphX = 15;
  private readonly graphY = 160;
  private readonly graphW = GAME_CONFIG.WIDTH - 30;
  private readonly graphH = 275;

  constructor() {
    super({ key: 'CrashScene' });
  }

  create(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // Stars background
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      const star = this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.3));
      this.tweens.add({ targets: star, alpha: 0.05, duration: Phaser.Math.Between(1500, 4000), yoyo: true, repeat: -1 });
    }

    // Graph drawing layer
    this.graphGraphics = this.add.graphics();

    // Plane
    this.plane = new Plane(this, this.graphX + 20, this.graphY + this.graphH - 15);
    this.plane.setVisible(true);

    // Mascot - centered above graph
    this.mascot = new Mascot(this, w / 2, 95);
    this.mascot.setDepth(10);

    // UI
    this.ui = new CrashUI(this);
    this.ui.create();
    this.ui.onPlay = () => this.joinRound();
    this.ui.onCashOut = () => this.cashOut();
    this.ui.onOpenStats = () => this.statsPanel.toggle();
    this.ui.onOpenSettings = () => this.settingsPanel.toggle();

    // Panels
    this.statsPanel = new StatsPanel(this);
    this.statsPanel.create();

    this.settingsPanel = new SettingsPanel(this);
    this.settingsPanel.create();
    this.settingsPanel.onSettingsChange = (s: GameSettings) => this.applySettings(s);

    // Keyboard
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'flying' && this.playerJoined && !this.hasCashedOut) this.cashOut();
      else if (this.phase === 'betting') this.joinRound();
    });

    // Start first round
    this.startBettingPhase();
  }

  private applySettings(s: GameSettings): void {
    this.houseEdge = s.houseEdge;
    this.instantCrashChance = s.instantCrashChance;
    this.multiplierSpeed = s.multiplierSpeed;
    this.ui.setStatus(`RTP: ${((1 - s.houseEdge) * 100).toFixed(1)}%`);
  }

  private generateCrashPoint(): number {
    const r = Math.random();
    if (r < this.instantCrashChance) return 1.00;
    return Math.max(1, Math.floor(((1 - this.houseEdge) / (1 - r)) * 100) / 100);
  }

  // === ROUND SYSTEM ===

  private startBettingPhase(): void {
    this.phase = 'betting';
    this.roundNumber++;
    this.playerJoined = false;
    this.hasCashedOut = false;
    this.betAmount = 0;

    this.ui.setPlayEnabled(true);
    this.ui.setCashoutEnabled(false);
    this.ui.setMultiplier(1, '#4ecdc4');
    this.ui.setRoundInfo(this.roundNumber, 'betting');

    this.graphGraphics.clear();
    this.plane.reset(this.graphX + 20, this.graphY + this.graphH - 15);

    // If last round was a loss, mascot encourages
    if (this.lastLost) {
      this.mascot.setMood('excited');
      this.mascot.say('Agora vai!!');
      this.time.delayedCall(2000, () => {
        if (this.phase === 'betting') this.mascot.setMood('idle');
      });
    } else {
      this.mascot.setMood('idle');
    }

    // Countdown timer
    this.countdownTimer = 5;
    this.ui.setStatus(`Rodada #${this.roundNumber} - Aposte! (${this.countdownTimer}s)`);

    this.countdownEvent = this.time.addEvent({
      delay: 1000,
      repeat: 4,
      callback: () => {
        this.countdownTimer--;
        if (this.countdownTimer > 0) {
          this.ui.setStatus(`Rodada #${this.roundNumber} - Aposte! (${this.countdownTimer}s)`);
          SoundFX.playCountdownBeep(false);
        } else {
          SoundFX.playCountdownBeep(true);
          this.startFlying();
        }
      },
    });
  }

  private joinRound(): void {
    if (this.phase !== 'betting') return;

    this.betAmount = this.ui.getBetAmount();
    if (!GameState.deductBet(this.betAmount)) {
      this.ui.setStatus('Saldo insuficiente!');
      return;
    }

    this.playerJoined = true;
    this.ui.updateBalance();
    this.ui.setPlayEnabled(false);
    this.ui.setStatus(`Aposta de ${this.betAmount} confirmada! Aguarde...`);
    SoundFX.playBetTick();
    this.mascot.setMood('excited');
  }

  private startFlying(): void {
    this.phase = 'flying';
    this.crashPoint = this.generateCrashPoint();
    this.currentMultiplier = 1;
    this.startTime = this.time.now;

    if (this.playerJoined) {
      this.ui.setCashoutEnabled(true);
      this.ui.setStatus('Subindo...');
      this.ui.setRoundInfo(this.roundNumber, 'flying');
      this.mascot.setMood('excited');
    } else {
      this.ui.setPlayEnabled(false);
      this.ui.setStatus('Rodada em andamento...');
      this.ui.setRoundInfo(this.roundNumber, 'watching');
    }

    this.ui.setMultiplier(1, '#4ecdc4');
    this.plane.reset(this.graphX + 20, this.graphY + this.graphH - 15);
    this.plane.startFlying();
    this.graphGraphics.clear();

    // Jet engine SFX
    SoundFX.playFlyAway();
    this.jetSfxTimer = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (this.phase === 'flying') SoundFX.playJetEngine(1);
      },
    });
  }

  private cashOut(): void {
    if (this.phase !== 'flying' || !this.playerJoined || this.hasCashedOut) return;
    this.hasCashedOut = true;

    const winnings = this.betAmount * this.currentMultiplier;
    GameState.addWinnings(winnings);

    this.ui.updateBalance();
    this.ui.setCashedOut(winnings);
    this.ui.setCashoutEnabled(false);
    this.mascot.setMood('happy');
    SoundFX.playCashOut();
  }

  private endRound(): void {
    this.phase = 'result';
    this.jetSfxTimer?.destroy();

    if (this.playerJoined) {
      if (!this.hasCashedOut) {
        this.ui.setMultiplier(this.crashPoint, '#ff4757');
        this.ui.setCrashed();
        this.ui.setStatus(`Crashou ${this.crashPoint.toFixed(2)}x!`);
        this.plane.explode();
        this.mascot.setMood('sad');
        SoundFX.playExplosion();
        this.lastLost = true;

        GameState.recordRound({
          bet: this.betAmount, crashAt: this.crashPoint, cashedAt: null, profit: -this.betAmount,
        });
      } else {
        const profit = this.betAmount * this.currentMultiplier - this.betAmount;
        this.plane.stopFlying();
        this.lastLost = false;
        GameState.recordRound({
          bet: this.betAmount, crashAt: this.crashPoint, cashedAt: this.currentMultiplier, profit,
        });
      }
    } else {
      // Player didn't join
      this.ui.setMultiplier(this.crashPoint, '#ff4757');
      this.ui.setStatus(`Crashou ${this.crashPoint.toFixed(2)}x! Voce nao apostou.`);
      this.plane.explode();
      SoundFX.playExplosion();
      this.lastLost = false;
    }

    this.ui.updateHistory();
    this.ui.updateBalance();
    this.ui.setCashoutEnabled(false);
    this.ui.setRoundInfo(this.roundNumber, 'result');

    // Next round after delay
    this.time.delayedCall(3000, () => {
      this.startBettingPhase();
    });
  }

  update(): void {
    if (this.phase !== 'flying') return;

    const elapsed = (this.time.now - this.startTime) / 1000;
    this.currentMultiplier = Math.pow(Math.E, this.multiplierSpeed * elapsed);
    this.currentMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

    if (this.currentMultiplier >= this.crashPoint) {
      this.currentMultiplier = this.crashPoint;
      this.drawGraph(elapsed, true);
      this.endRound();
      return;
    }

    // Color + mascot mood based on multiplier
    let color = '#4ecdc4';
    if (this.currentMultiplier >= 5) {
      color = '#ff6b6b';
      if (this.playerJoined && !this.hasCashedOut) this.mascot.setMood('nervous');
    } else if (this.currentMultiplier >= 2) {
      color = '#ffd700';
    }

    this.ui.setMultiplier(this.currentMultiplier, color);
    this.drawGraph(elapsed, false);
  }

  private drawGraph(elapsed: number, crashed: boolean): void {
    this.graphGraphics.clear();

    const gx = this.graphX;
    const gy = this.graphY;
    const gw = this.graphW;
    const gh = this.graphH;

    // Grid
    this.graphGraphics.lineStyle(0.5, COLORS.BORDER, 0.3);
    for (let i = 0; i < 8; i++) {
      const y = gy + (gh / 8) * i;
      this.graphGraphics.lineBetween(gx, y, gx + gw, y);
    }

    const maxTime = Math.max(elapsed + 1, 5);
    const maxMult = Math.max(this.currentMultiplier + 0.5, 3);

    const lineColor = crashed ? COLORS.RED : COLORS.CYAN;
    this.graphGraphics.lineStyle(3, lineColor);

    const steps = Math.min(Math.floor(elapsed * 60), 2000);
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / 60;
      const mult = Math.pow(Math.E, this.multiplierSpeed * t);
      const x = gx + (t / maxTime) * gw;
      const y = gy + gh - ((mult - 1) / (maxMult - 1)) * (gh - 25) - 8;
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

    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      this.plane.setPosition(lastPoint.x + 15, lastPoint.y);
    }
  }
}
