import Phaser from 'phaser';
import { GAME_CONFIG } from '../utils/constants';
import { GameState } from '../utils/GameState';
import { SoundFX } from '../assets/sfx';

type RunnerPhase = 'betting' | 'tutorial' | 'running' | 'cashout_anim' | 'result';

// Enemy types with different behaviors
const ENEMY_TYPES = [
  'enemy_goomba',   // 1. walks on platform - can stomp
  'enemy_koopa',    // 2. walks faster - can stomp
  'enemy_spiny',    // 3. walks - CANNOT stomp (spikes!)
  'enemy_bobomb',   // 4. walks then explodes
  'enemy_bullet',   // 5. flies horizontally from right
  'enemy_piranha',  // 6. pops up/down from pipes
] as const;

interface EnemyData {
  sprite: Phaser.GameObjects.Image;
  type: string;
  baseY: number;
  dead: boolean;
}

interface Segment {
  // Ground tiles for this segment
  grounds: Phaser.GameObjects.Image[];
  // Floating platforms
  platforms: { sprite: Phaser.GameObjects.Image; x: number; y: number; w: number }[];
  // Coins
  coins: Phaser.GameObjects.Image[];
  // Enemies
  enemies: EnemyData[];
  // Pipes (with optional piranha)
  pipes: { sprite: Phaser.GameObjects.Image; piranha?: Phaser.GameObjects.Image; piranhaBaseY?: number }[];
  // Question blocks
  qblocks: { sprite: Phaser.GameObjects.Image; hit: boolean }[];
  // Mushrooms
  mushrooms: Phaser.GameObjects.Image[];
  // World x start/end
  startX: number;
  endX: number;
}

export class CoinRunnerScene extends Phaser.Scene {
  private phase: RunnerPhase = 'betting';
  private betAmount = 10;
  private currentMultiplier = 1;
  private distanceTraveled = 0;
  private coinsCollected = 0;

  // Runner
  private runner!: Phaser.GameObjects.Image;
  private velocityY = 0;
  private isOnGround = true;
  private runnerBaseX = 80;
  private groundY = 0;
  private runnerH = 24; // sprite height for collisions

  // World scrolling
  private segments: Segment[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private worldSpeed = 0;
  private scrollOffset = 0;
  private nextSegmentX = 0;
  private segmentCount = 0;

  // Tutorial
  private tutorialTexts: Phaser.GameObjects.Text[] = [];
  private tutorialArrow?: Phaser.GameObjects.Text;
  private tutorialStep = 0;
  private tutorialTimer = 0;
  private readonly TUTORIAL_SAFE_DISTANCE = 600; // safe ground before obstacles

  // Physics
  private readonly GRAVITY = 0.6;
  private readonly JUMP_FORCE = -10.5;
  private readonly BASE_SPEED = 2.5;
  private readonly MAX_SPEED = 6;

  // UI elements
  private multiplierText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private cashoutBtn!: Phaser.GameObjects.Container;
  private playBtn!: Phaser.GameObjects.Container;

  // Run animation
  private runFrame = 0;
  private runTimer = 0;
  private isDead = false;

  // Cash out animation
  private cashoutPipe?: Phaser.GameObjects.Image;

  // Bullet Bill spawn timer
  private bulletTimer = 0;
  private bullets: EnemyData[] = [];

  constructor() {
    super({ key: 'CoinRunnerScene' });
  }

  create(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;
    this.groundY = h - 230;

    // Reset all state
    this.phase = 'betting';
    this.currentMultiplier = 1;
    this.distanceTraveled = 0;
    this.coinsCollected = 0;
    this.worldSpeed = 0;
    this.scrollOffset = 0;
    this.nextSegmentX = 0;
    this.segmentCount = 0;
    this.velocityY = 0;
    this.isOnGround = true;
    this.isDead = false;
    this.runFrame = 0;
    this.runTimer = 0;
    this.tutorialStep = 0;
    this.tutorialTimer = 0;
    this.tutorialTexts = [];
    this.segments = [];
    this.clouds = [];
    this.bullets = [];
    this.bulletTimer = 0;

    this.createBackground(w, h);
    this.createInitialGround(w);
    this.createRunner();
    this.createUI(w, h);
    this.setupInput();
  }

  // === BACKGROUND ===
  private createBackground(w: number, h: number): void {
    // Sky
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x5c94fc, 0x5c94fc, 0x87ceeb, 0x87ceeb);
    sky.fillRect(0, 0, w, this.groundY);

    // Hills
    const hills = this.add.graphics();
    hills.fillStyle(0x228b22, 0.4);
    for (let x = 0; x < w + 100; x += 120) hills.fillCircle(x, this.groundY, 60);
    hills.fillStyle(0x32cd32, 0.3);
    for (let x = 50; x < w + 100; x += 150) hills.fillCircle(x, this.groundY, 45);

    // Underground fill
    const ug = this.add.graphics();
    ug.fillStyle(0x8b4513);
    ug.fillRect(0, this.groundY + 32, w, h - this.groundY);
    ug.fillStyle(0x654321);
    ug.fillRect(0, this.groundY + 32, w, 4);

    // Clouds
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.image(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(30, 150),
        'cloud'
      ).setAlpha(0.7).setScale(Phaser.Math.FloatBetween(0.6, 1.2));
      this.clouds.push(cloud);
    }
  }

  // === GROUND ===
  private createInitialGround(w: number): void {
    // Create a long safe ground segment at start
    const seg: Segment = {
      grounds: [],
      platforms: [],
      coins: [],
      enemies: [],
      pipes: [],
      qblocks: [],
      mushrooms: [],
      startX: 0,
      endX: w + this.TUTORIAL_SAFE_DISTANCE,
    };

    for (let x = 0; x < seg.endX + 64; x += 32) {
      const tile = this.add.image(x, this.groundY, 'ground').setOrigin(0, 0);
      seg.grounds.push(tile);
    }

    // Place some tutorial coins on the ground (easy to collect)
    for (let i = 0; i < 5; i++) {
      const cx = 250 + i * 40;
      const coin = this.add.image(cx, this.groundY - 20, 'coin').setScale(1.3);
      this.tweens.add({ targets: coin, y: this.groundY - 25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      seg.coins.push(coin);
    }

    this.segments.push(seg);
    this.nextSegmentX = seg.endX;
  }

  // === RUNNER ===
  private createRunner(): void {
    this.runner = this.add.image(this.runnerBaseX, this.groundY - 2, 'runner')
      .setScale(2)
      .setOrigin(0.5, 1)
      .setDepth(50);
  }

  // === SEGMENT GENERATION ===
  private generateSegment(): void {
    this.segmentCount++;
    const w = GAME_CONFIG.WIDTH;
    const difficulty = Math.min(this.segmentCount / 30, 1); // 0..1 over 30 segments

    // Segment length
    const segLen = Phaser.Math.Between(200, 350);
    const gapBefore = this.segmentCount <= 2 ? 0 : Phaser.Math.Between(
      40 + difficulty * 20,
      60 + difficulty * 40
    );

    const segStartX = this.nextSegmentX + gapBefore;
    const segEndX = segStartX + segLen;

    const seg: Segment = {
      grounds: [],
      platforms: [],
      coins: [],
      enemies: [],
      pipes: [],
      qblocks: [],
      mushrooms: [],
      startX: segStartX,
      endX: segEndX,
    };

    // Ground tiles
    for (let x = segStartX; x < segEndX; x += 32) {
      const tile = this.add.image(x, this.groundY, 'ground').setOrigin(0, 0);
      seg.grounds.push(tile);
    }

    // Add a floating platform above the gap (if there's a gap)
    if (gapBefore > 50) {
      const platX = segStartX - gapBefore / 2 - 32;
      const platY = this.groundY - Phaser.Math.Between(40, 70);
      const platW = Math.max(48, 80 - difficulty * 20);
      const plat = this.add.image(platX, platY, 'platform').setOrigin(0, 0).setDisplaySize(platW, 16);
      seg.platforms.push({ sprite: plat, x: platX, y: platY, w: platW });

      // Coins above platform
      for (let c = 0; c < 2; c++) {
        const coin = this.add.image(platX + 15 + c * 20, platY - 20, 'coin').setScale(1.2);
        this.tweens.add({ targets: coin, y: platY - 25, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        seg.coins.push(coin);
      }
    }

    // Add coins on the ground
    const numCoins = Phaser.Math.Between(2, 4);
    for (let c = 0; c < numCoins; c++) {
      const cx = segStartX + Phaser.Math.Between(20, segLen - 20);
      const coin = this.add.image(cx, this.groundY - 20, 'coin').setScale(1.2);
      this.tweens.add({ targets: coin, y: this.groundY - 25, duration: 500 + c * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      seg.coins.push(coin);
    }

    // ENEMIES - gradually introduce types
    if (this.segmentCount >= 3 && Math.random() < 0.4 + difficulty * 0.4) {
      const maxEnemyType = Math.min(Math.floor(this.segmentCount / 3), 4); // unlock types over time
      const typeIdx = Phaser.Math.Between(0, maxEnemyType);
      const enemyType = ENEMY_TYPES[typeIdx];
      const ex = segStartX + Phaser.Math.Between(40, segLen - 40);
      const ey = this.groundY - 2;

      const sprite = this.add.image(ex, ey, enemyType).setScale(1.3).setOrigin(0.5, 1);

      // Patrol behavior for ground enemies
      if (typeIdx <= 3) { // goomba, koopa, spiny, bobomb
        const patrolSpeed = typeIdx === 1 ? 2500 : 1800; // koopa faster
        const patrolRange = 40;
        this.tweens.add({
          targets: sprite,
          x: ex - patrolRange,
          duration: patrolSpeed,
          yoyo: true,
          repeat: -1,
          ease: 'Linear',
        });
      }

      seg.enemies.push({ sprite, type: enemyType, baseY: ey, dead: false });

      // Bob-omb: add spark flicker
      if (typeIdx === 3) {
        this.tweens.add({ targets: sprite, tint: 0xff4400, duration: 300, yoyo: true, repeat: -1 });
      }
    }

    // PIPES with optional piranha
    if (this.segmentCount >= 5 && Math.random() < 0.3 + difficulty * 0.2) {
      const px = segStartX + Phaser.Math.Between(segLen * 0.4, segLen * 0.8);
      const pipe = this.add.image(px, this.groundY - 36, 'pipe').setScale(1.2).setOrigin(0.5, 0);
      const pipeData: Segment['pipes'][0] = { sprite: pipe };

      // Piranha plant pops from pipe
      if (this.segmentCount >= 8 && Math.random() < 0.5) {
        const piranha = this.add.image(px, this.groundY - 60, 'enemy_piranha').setScale(1.3).setOrigin(0.5, 1);
        const baseY = this.groundY - 60;
        this.tweens.add({
          targets: piranha,
          y: baseY - 25,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        pipeData.piranha = piranha;
        pipeData.piranhaBaseY = baseY;
      }
      seg.pipes.push(pipeData);
    }

    // Question blocks
    if (Math.random() < 0.3) {
      const qx = segStartX + Phaser.Math.Between(30, segLen - 30);
      const qy = this.groundY - Phaser.Math.Between(55, 75);
      const qblock = this.add.image(qx, qy, 'qblock').setScale(1.4);
      seg.qblocks.push({ sprite: qblock, hit: false });
    }

    // Mushroom power-up (rare)
    if (Math.random() < 0.1 && this.segmentCount > 5) {
      const mx = segStartX + Phaser.Math.Between(20, segLen - 20);
      const my = this.groundY - 20;
      const mush = this.add.image(mx, my, 'mushroom').setScale(1.3);
      this.tweens.add({ targets: mush, y: my - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      seg.mushrooms.push(mush);
    }

    // Elevated platforms on the segment
    if (Math.random() < 0.3 + difficulty * 0.3) {
      const platX = segStartX + Phaser.Math.Between(20, segLen - 80);
      const platY = this.groundY - Phaser.Math.Between(50, 80);
      const platW = Phaser.Math.Between(48, 80);
      const plat = this.add.image(platX, platY, 'platform').setOrigin(0, 0).setDisplaySize(platW, 16);
      seg.platforms.push({ sprite: plat, x: platX, y: platY, w: platW });

      // Coins on elevated platform
      for (let c = 0; c < 2; c++) {
        const coin = this.add.image(platX + 10 + c * 22, platY - 18, 'coin').setScale(1.2);
        this.tweens.add({ targets: coin, y: platY - 23, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        seg.coins.push(coin);
      }
    }

    this.segments.push(seg);
    this.nextSegmentX = segEndX;
  }

  // === UI ===
  private createUI(w: number, h: number): void {
    // Top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.7);
    topBar.fillRect(0, 0, w, 42);
    topBar.setDepth(100);

    this.add.text(15, 12, 'COIN RUNNER', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setDepth(100);

    this.balanceText = this.add.text(w - 15, 12, `${GameState.balance.toFixed(0)} coins`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(100);

    // Multiplier
    this.multiplierText = this.add.text(w / 2, 65, '1.00x', {
      fontSize: '36px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Coins counter
    this.coinsText = this.add.text(w - 15, 55, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(100).setAlpha(0);

    // Status
    this.statusText = this.add.text(w / 2, this.groundY + 40, 'Faca sua aposta e corra!', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(100);

    // Bet controls
    const controlY = h - 175;
    this.createBetControls(w, controlY);
    this.createActionButtons(w, controlY + 80);
    this.createBottomBar(w, h);
  }

  private createBetControls(w: number, y: number): void {
    this.add.text(w / 2, y, 'APOSTA', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffcc99',
    }).setOrigin(0.5).setDepth(100);

    const rowY = y + 18;
    const btnSize = 40;

    this.makeBtn(w / 2 - 75, rowY, btnSize, btnSize, '-', 0x8b4513, () => this.changeBet(-5));

    const betBg = this.add.graphics();
    betBg.fillStyle(0x6b3e08);
    betBg.fillRoundedRect(w / 2 - 28, rowY, 56, btnSize, 8);
    betBg.setDepth(100);
    this.betText = this.add.text(w / 2, rowY + btnSize / 2, this.betAmount.toString(), {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.makeBtn(w / 2 + 35, rowY, btnSize, btnSize, '+', 0x8b4513, () => this.changeBet(5));

    const quickY = rowY + btnSize + 6;
    [5, 10, 25, 50, 100].forEach((amt, i) => {
      const qw = (w - 30) / 5;
      this.makeBtn(10 + i * qw + 2, quickY, qw - 4, 26, amt.toString(), 0x6b3e08, () => {
        this.betAmount = amt;
        this.betText.setText(amt.toString());
      }, '12px');
    });
  }

  private createActionButtons(w: number, y: number): void {
    const halfW = (w - 30) / 2;
    this.playBtn = this.makeBtn(10, y, halfW, 52, 'CORRER!', 0x00aa00, () => this.startRun(), '18px');
    this.cashoutBtn = this.makeBtn(10 + halfW + 10, y, halfW, 52, 'CASH OUT', 0xffd700, () => this.cashOut(), '18px');
    this.setCashoutEnabled(false);
  }

  private createBottomBar(w: number, h: number): void {
    const y = h - 40;
    const btnW = (w - 30) / 2;
    this.makeBtn(10, y, btnW, 32, 'MENU', 0x444444, () => this.scene.start('MenuScene'), '13px');
    this.makeBtn(15 + btnW, y, btnW, 32, 'AVIATORE', 0x4ecdc4, () => this.scene.start('CrashScene'), '13px');
  }

  private makeBtn(x: number, y: number, bw: number, bh: number, label: string, color: number, onClick: () => void, fontSize = '16px'): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(color); bg.fillRoundedRect(0, 0, bw, bh, 8);
    bg.setDepth(100);
    const text = this.add.text(bw / 2, bh / 2, label, {
      fontSize, fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);
    const hit = this.add.rectangle(bw / 2, bh / 2, bw, bh).setInteractive({ useHandCursor: true }).setDepth(100);
    hit.on('pointerdown', onClick);
    hit.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(0, 0, bw, bh, 8); });
    hit.on('pointerout', () => { bg.clear(); bg.fillStyle(color); bg.fillRoundedRect(0, 0, bw, bh, 8); });
    return this.add.container(x, y, [bg, text, hit]).setDepth(100);
  }

  // === INPUT ===
  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < this.groundY + 30) {
        if (this.phase === 'running' || this.phase === 'tutorial') this.jump();
      }
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'running' || this.phase === 'tutorial') this.jump();
      else if (this.phase === 'betting') this.startRun();
    });
    this.input.keyboard?.on('keydown-UP', () => {
      if (this.phase === 'running' || this.phase === 'tutorial') this.jump();
    });
  }

  private jump(): void {
    if (!this.isOnGround || this.isDead) return;
    this.isOnGround = false;
    this.velocityY = this.JUMP_FORCE;
    this.runner.setTexture('runner_jump');
    SoundFX.playBetTick();
  }

  // === GAME FLOW ===
  private startRun(): void {
    if (this.phase !== 'betting') return;
    if (!GameState.deductBet(this.betAmount)) {
      this.statusText.setText('Saldo insuficiente!');
      return;
    }

    this.balanceText.setText(`${GameState.balance.toFixed(0)} coins`);
    this.multiplierText.setAlpha(0.85);
    this.coinsText.setAlpha(1);
    this.setPlayEnabled(false);
    this.setCashoutEnabled(true);
    SoundFX.playFlyAway();

    // Start with tutorial phase
    this.phase = 'tutorial';
    this.worldSpeed = this.BASE_SPEED;
    this.showTutorial();
  }

  private showTutorial(): void {
    const w = GAME_CONFIG.WIDTH;

    // Tutorial message 1
    const t1 = this.add.text(w / 2, this.groundY - 100, 'TOQUE ou ESPACO\npara PULAR!', {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
      align: 'center', backgroundColor: '#000000aa',
      padding: { x: 15, y: 10 },
    }).setOrigin(0.5).setDepth(200);
    this.tutorialTexts.push(t1);

    // Bouncing arrow
    this.tutorialArrow = this.add.text(this.runnerBaseX, this.groundY - 50, '⬆', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: this.tutorialArrow, y: this.groundY - 65, duration: 400, yoyo: true, repeat: -1 });

    this.statusText.setText('Aprenda a jogar! Pule para coletar moedas!');
  }

  private endTutorial(): void {
    // Clear tutorial UI
    this.tutorialTexts.forEach(t => t.destroy());
    this.tutorialTexts = [];
    this.tutorialArrow?.destroy();
    this.tutorialArrow = undefined;

    this.phase = 'running';
    this.statusText.setText('Cuidado com os obstaculos! Cash out a qualquer hora!');

    // Flash warning
    const warn = this.add.text(GAME_CONFIG.WIDTH / 2, this.groundY - 100, 'PERIGO! Obstaculos!', {
      fontSize: '22px', fontFamily: 'Arial', color: '#ff4757', fontStyle: 'bold',
      backgroundColor: '#000000cc', padding: { x: 15, y: 8 },
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: warn,
      alpha: 0,
      y: warn.y - 40,
      duration: 2000,
      onComplete: () => warn.destroy(),
    });
  }

  private cashOut(): void {
    if ((this.phase !== 'running' && this.phase !== 'tutorial') || this.isDead) return;

    this.phase = 'cashout_anim';
    this.setCashoutEnabled(false);
    this.worldSpeed = 0; // Stop scrolling!

    // Clear tutorial if still showing
    this.tutorialTexts.forEach(t => t.destroy());
    this.tutorialTexts = [];
    this.tutorialArrow?.destroy();

    // Spawn a pipe at runner's position
    const pipeX = this.runner.x + 60;
    this.cashoutPipe = this.add.image(pipeX, this.groundY, 'pipe_large')
      .setScale(1.5)
      .setOrigin(0.5, 1)
      .setDepth(45);

    // Pipe rises from ground
    this.cashoutPipe.y = this.groundY + 80;
    this.tweens.add({
      targets: this.cashoutPipe,
      y: this.groundY,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Runner walks to pipe
        this.tweens.add({
          targets: this.runner,
          x: pipeX,
          duration: 600,
          ease: 'Linear',
          onComplete: () => {
            // Runner sinks into pipe
            SoundFX.playBetTick();
            this.tweens.add({
              targets: this.runner,
              y: this.groundY + 30,
              scaleX: 1.5,
              scaleY: 1.5,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                this.runner.setVisible(false);
                this.showCashoutPrize();
              },
            });
          },
        });
      },
    });

    this.statusText.setText('Entrando no cano...');
  }

  private showCashoutPrize(): void {
    const w = GAME_CONFIG.WIDTH;
    const winnings = this.betAmount * this.currentMultiplier;
    GameState.addWinnings(winnings);

    GameState.recordRound({
      bet: this.betAmount,
      crashAt: this.currentMultiplier,
      cashedAt: this.currentMultiplier,
      profit: winnings - this.betAmount,
    });

    this.balanceText.setText(`${GameState.balance.toFixed(0)} coins`);

    // Prize display
    const overlay = this.add.graphics().setDepth(300);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, w, GAME_CONFIG.HEIGHT);

    const prizeY = this.groundY / 2;

    const winText = this.add.text(w / 2, prizeY - 40, 'VOCE GANHOU!', {
      fontSize: '28px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(300);

    const amtText = this.add.text(w / 2, prizeY + 10, `+${winnings.toFixed(2)} coins`, {
      fontSize: '36px', fontFamily: 'Arial', color: '#00ff00', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(300).setScale(0);

    const multText = this.add.text(w / 2, prizeY + 60, `${this.currentMultiplier.toFixed(2)}x  |  ${this.coinsCollected} moedas`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(300);

    // Animate prize
    this.tweens.add({
      targets: amtText,
      scaleX: 1, scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Coin burst particles
    for (let i = 0; i < 15; i++) {
      const coin = this.add.image(w / 2, prizeY, 'coin')
        .setScale(1.5).setDepth(300);
      this.tweens.add({
        targets: coin,
        x: w / 2 + Phaser.Math.Between(-120, 120),
        y: prizeY + Phaser.Math.Between(-80, 80),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(600, 1200),
        delay: i * 50,
        onComplete: () => coin.destroy(),
      });
    }

    SoundFX.playCashOut();
    this.multiplierText.setColor('#00ff00');
    this.phase = 'result';

    this.time.delayedCall(4000, () => {
      winText.destroy(); amtText.destroy(); multText.destroy(); overlay.destroy();
      this.scene.restart();
    });
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.worldSpeed = 0;

    SoundFX.playExplosion();
    this.multiplierText.setColor('#ff4757');
    this.statusText.setText('Voce morreu! Aposta perdida!');
    this.setCashoutEnabled(false);

    // Clear tutorial
    this.tutorialTexts.forEach(t => t.destroy());
    this.tutorialArrow?.destroy();

    // Death animation
    this.tweens.add({
      targets: this.runner,
      y: this.runner.y - 80,
      angle: 360,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: this.runner,
          y: GAME_CONFIG.HEIGHT + 50,
          duration: 700,
          ease: 'Power1',
        });
      },
    });

    GameState.recordRound({
      bet: this.betAmount,
      crashAt: this.currentMultiplier,
      cashedAt: null,
      profit: -this.betAmount,
    });

    this.phase = 'result';
    this.time.delayedCall(3000, () => this.scene.restart());
  }

  // === UPDATE LOOP ===
  update(_time: number, delta: number): void {
    if (this.phase === 'betting' || this.phase === 'result' || this.phase === 'cashout_anim') return;
    if (this.isDead) return;

    const dt = delta / 16.67;

    // Tutorial → Running transition
    if (this.phase === 'tutorial') {
      this.tutorialTimer += delta;
      // After safe distance or 6 seconds, transition to real game
      if (this.distanceTraveled >= this.TUTORIAL_SAFE_DISTANCE || this.tutorialTimer > 6000) {
        this.endTutorial();
      }
    }

    // Speed increases over time
    if (this.phase === 'running') {
      this.worldSpeed = Math.min(this.MAX_SPEED, this.BASE_SPEED + this.distanceTraveled * 0.001);
    }

    const speed = this.worldSpeed * dt;
    this.scrollOffset += speed;
    this.distanceTraveled += speed;

    // Update multiplier
    this.currentMultiplier = 1 + this.distanceTraveled * 0.004 + this.coinsCollected * 0.08;
    this.currentMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

    let mColor = '#ffd700';
    if (this.currentMultiplier >= 5) mColor = '#ff4757';
    else if (this.currentMultiplier >= 3) mColor = '#ff6b6b';
    else if (this.currentMultiplier >= 2) mColor = '#4ecdc4';
    this.multiplierText.setText(`${this.currentMultiplier.toFixed(2)}x`);
    this.multiplierText.setColor(mColor);
    this.coinsText.setText(`Moedas: ${this.coinsCollected}`);

    // === PHYSICS ===
    // Gravity
    if (!this.isOnGround) {
      this.velocityY += this.GRAVITY * dt;
      this.runner.y += this.velocityY * dt;
    }

    // Ground and platform collision
    let landed = false;
    const runnerFeetY = this.runner.y;
    const runnerX = this.runner.x;

    // Check ground tiles
    for (const seg of this.segments) {
      for (const g of seg.grounds) {
        if (!g.active) continue;
        const gLeft = g.x;
        const gRight = g.x + 32;
        const gTop = g.y;

        if (runnerX >= gLeft - 5 && runnerX <= gRight + 5) {
          if (this.velocityY >= 0 && runnerFeetY >= gTop - 2 && runnerFeetY <= gTop + 10) {
            this.runner.y = gTop;
            this.land();
            landed = true;
          }
        }
      }

      // Check platforms
      for (const p of seg.platforms) {
        if (!p.sprite.active) continue;
        if (runnerX >= p.sprite.x - 5 && runnerX <= p.sprite.x + p.w + 5) {
          if (this.velocityY >= 0 && runnerFeetY >= p.y - 2 && runnerFeetY <= p.y + 12) {
            this.runner.y = p.y;
            this.land();
            landed = true;
          }
        }
      }
    }

    // Fall death
    if (this.runner.y > GAME_CONFIG.HEIGHT + 20) {
      this.die();
      return;
    }

    // If on ground but no ground beneath → start falling
    if (this.isOnGround && !landed) {
      let hasSupport = false;
      for (const seg of this.segments) {
        for (const g of seg.grounds) {
          if (!g.active) continue;
          if (runnerX >= g.x - 5 && runnerX <= g.x + 37 && Math.abs(runnerFeetY - g.y) < 5) {
            hasSupport = true;
            break;
          }
        }
        if (hasSupport) break;
        for (const p of seg.platforms) {
          if (!p.sprite.active) continue;
          if (runnerX >= p.sprite.x - 5 && runnerX <= p.sprite.x + p.w + 5 && Math.abs(runnerFeetY - p.y) < 5) {
            hasSupport = true;
            break;
          }
        }
        if (hasSupport) break;
      }
      if (!hasSupport) {
        this.isOnGround = false;
        this.velocityY = 0;
      }
    }

    // === COLLISIONS ===
    for (const seg of this.segments) {
      // Coins
      for (let i = seg.coins.length - 1; i >= 0; i--) {
        const c = seg.coins[i];
        if (!c.active) continue;
        if (this.overlap(this.runner, c, 22, 28)) {
          this.coinsCollected++;
          this.tweens.add({ targets: c, y: c.y - 30, alpha: 0, scaleX: 0, duration: 300, onComplete: () => c.destroy() });
          seg.coins.splice(i, 1);
          SoundFX.playCashOut();
        }
      }

      // Enemies
      for (const e of seg.enemies) {
        if (e.dead || !e.sprite.active) continue;
        if (this.overlap(this.runner, e.sprite, 18, 22)) {
          const canStomp = e.type !== 'enemy_spiny'; // spiny can't be stomped
          if (canStomp && this.velocityY > 0 && this.runner.y < e.sprite.y - 8) {
            // Stomp!
            e.dead = true;
            this.tweens.add({ targets: e.sprite, scaleY: 0.2, alpha: 0, duration: 200, onComplete: () => e.sprite.destroy() });
            this.velocityY = -7;
            this.isOnGround = false;
            this.coinsCollected += 2;
            SoundFX.playBetTick();
          } else {
            this.die();
            return;
          }
        }
      }

      // Pipes (collision)
      for (const p of seg.pipes) {
        if (!p.sprite.active) continue;
        // Side collision with pipe
        const ps = p.sprite;
        const pw = 32 * 1.2;
        const ph = 40 * 1.2;
        const pLeft = ps.x - pw / 2;
        const pRight = ps.x + pw / 2;
        const pTop = ps.y;

        if (runnerX + 10 > pLeft && runnerX - 10 < pRight) {
          if (runnerFeetY > pTop + 5 && runnerFeetY < pTop + ph) {
            // Side hit = die
            this.die();
            return;
          }
          if (this.velocityY >= 0 && runnerFeetY >= pTop - 2 && runnerFeetY <= pTop + 8) {
            // Land on top
            this.runner.y = pTop;
            this.land();
          }
        }

        // Piranha collision
        if (p.piranha?.active && this.overlap(this.runner, p.piranha, 15, 18)) {
          this.die();
          return;
        }
      }

      // Question blocks (hit from below)
      for (const q of seg.qblocks) {
        if (q.hit || !q.sprite.active) continue;
        if (this.overlap(this.runner, q.sprite, 18, 22) && this.velocityY < 0) {
          q.hit = true;
          this.tweens.add({ targets: q.sprite, y: q.sprite.y - 8, duration: 100, yoyo: true });
          q.sprite.setTint(0x888888);
          this.coinsCollected += 3;
          SoundFX.playCashOut();
          const burst = this.add.image(q.sprite.x, q.sprite.y - 15, 'coin').setScale(1.5);
          this.tweens.add({ targets: burst, y: burst.y - 40, alpha: 0, duration: 500, onComplete: () => burst.destroy() });
          this.velocityY = 2;
        }
      }

      // Mushrooms
      for (let i = seg.mushrooms.length - 1; i >= 0; i--) {
        const m = seg.mushrooms[i];
        if (!m.active) continue;
        if (this.overlap(this.runner, m, 20, 22)) {
          this.coinsCollected += 5;
          this.tweens.add({ targets: m, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => m.destroy() });
          seg.mushrooms.splice(i, 1);
          this.tweens.add({ targets: this.runner, alpha: 0.5, duration: 100, yoyo: true, repeat: 5 });
          SoundFX.playCashOut();
        }
      }
    }

    // Bullet Bills (check collision)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.dead || !b.sprite.active) continue;
      b.sprite.x -= (speed + 3) * dt; // bullets move faster
      if (b.sprite.x < -30) {
        b.sprite.destroy();
        this.bullets.splice(i, 1);
        continue;
      }
      if (this.overlap(this.runner, b.sprite, 18, 16)) {
        this.die();
        return;
      }
    }

    // Spawn Bullet Bills periodically in running phase
    if (this.phase === 'running' && this.segmentCount >= 10) {
      this.bulletTimer += delta;
      if (this.bulletTimer > 5000 - Math.min(this.segmentCount * 100, 3000)) {
        this.bulletTimer = 0;
        const by = this.groundY - Phaser.Math.Between(30, 80);
        const bullet = this.add.image(GAME_CONFIG.WIDTH + 20, by, 'enemy_bullet')
          .setScale(1.5).setOrigin(0.5, 1);
        this.bullets.push({ sprite: bullet, type: 'enemy_bullet', baseY: by, dead: false });
        // Warning flash
        const warn = this.add.text(GAME_CONFIG.WIDTH - 30, by - 10, '!!', {
          fontSize: '16px', fontFamily: 'Arial', color: '#ff0000', fontStyle: 'bold',
        }).setDepth(200);
        this.tweens.add({ targets: warn, alpha: 0, duration: 500, onComplete: () => warn.destroy() });
      }
    }

    // === SCROLL WORLD ===
    this.scrollWorld(speed);

    // Run animation
    if (this.isOnGround) {
      this.runTimer += delta;
      if (this.runTimer > 120) {
        this.runTimer = 0;
        this.runFrame = (this.runFrame + 1) % 2;
        this.runner.setFlipX(this.runFrame === 1);
      }
    }

    // Generate new segments
    while (this.nextSegmentX - this.scrollOffset < GAME_CONFIG.WIDTH + 300) {
      this.generateSegment();
    }
  }

  private land(): void {
    this.isOnGround = true;
    this.velocityY = 0;
    this.runner.setTexture('runner');
  }

  private scrollWorld(speed: number): void {
    // Scroll all segments
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];

      seg.grounds.forEach(g => { if (g.active) g.x -= speed; });
      seg.platforms.forEach(p => { if (p.sprite.active) p.sprite.x -= speed; });
      seg.coins.forEach(c => { if (c.active) c.x -= speed; });
      seg.enemies.forEach(e => { if (e.sprite.active) e.sprite.x -= speed; });
      seg.pipes.forEach(p => {
        if (p.sprite.active) p.sprite.x -= speed;
        if (p.piranha?.active) p.piranha.x -= speed;
      });
      seg.qblocks.forEach(q => { if (q.sprite.active) q.sprite.x -= speed; });
      seg.mushrooms.forEach(m => { if (m.active) m.x -= speed; });

      // Remove off-screen segments
      const rightmost = Math.max(
        ...seg.grounds.filter(g => g.active).map(g => g.x + 32),
        ...seg.platforms.filter(p => p.sprite.active).map(p => p.sprite.x + p.w),
        0
      );

      if (rightmost < -100) {
        seg.grounds.forEach(g => g.destroy());
        seg.platforms.forEach(p => p.sprite.destroy());
        seg.coins.forEach(c => c.destroy());
        seg.enemies.forEach(e => e.sprite.destroy());
        seg.pipes.forEach(p => { p.sprite.destroy(); p.piranha?.destroy(); });
        seg.qblocks.forEach(q => q.sprite.destroy());
        seg.mushrooms.forEach(m => m.destroy());
        this.segments.splice(i, 1);
      }
    }

    // Clouds parallax
    for (const cloud of this.clouds) {
      cloud.x -= speed * 0.3;
      if (cloud.x < -70) {
        cloud.x = GAME_CONFIG.WIDTH + 70;
        cloud.y = Phaser.Math.Between(30, 150);
      }
    }
  }

  private overlap(a: Phaser.GameObjects.Image, b: Phaser.GameObjects.Image, threshX: number, threshY: number): boolean {
    return Math.abs(a.x - b.x) < threshX && Math.abs(a.y - (b.y)) < threshY;
  }

  private changeBet(d: number): void {
    this.betAmount = Math.max(GAME_CONFIG.MIN_BET, this.betAmount + d);
    this.betText.setText(this.betAmount.toString());
  }

  private setPlayEnabled(e: boolean): void {
    this.playBtn.setAlpha(e ? 1 : 0.4);
    const h = this.playBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (e) h.setInteractive({ useHandCursor: true }); else h.disableInteractive();
  }

  private setCashoutEnabled(e: boolean): void {
    this.cashoutBtn.setAlpha(e ? 1 : 0.4);
    const h = this.cashoutBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (e) h.setInteractive({ useHandCursor: true }); else h.disableInteractive();
  }
}
