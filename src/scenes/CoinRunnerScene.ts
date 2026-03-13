import Phaser from 'phaser';
import { GAME_CONFIG } from '../utils/constants';
import { GameState } from '../utils/GameState';
import { SoundFX } from '../assets/sfx';
import { RunnerSettings } from '../utils/RunnerSettings';

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

interface CoinData {
  sprite: Phaser.GameObjects.Image;
  premium: boolean;
}

interface Segment {
  grounds: Phaser.GameObjects.Image[];
  platforms: { sprite: Phaser.GameObjects.Image; x: number; y: number; w: number }[];
  coins: CoinData[];
  enemies: EnemyData[];
  pipes: { sprite: Phaser.GameObjects.Image; piranha?: Phaser.GameObjects.Image; piranhaBaseY?: number }[];
  qblocks: { sprite: Phaser.GameObjects.Image; hit: boolean; magic: boolean }[];
  mushrooms: Phaser.GameObjects.Image[];
  poisonMushrooms: Phaser.GameObjects.Image[];
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

  // Settings-driven params (read from RunnerSettings singleton)
  private get TUTORIAL_SAFE_DISTANCE() { return RunnerSettings.tutorialDistance; }
  private get GRAVITY() { return RunnerSettings.gravity; }
  private get JUMP_FORCE() { return RunnerSettings.jumpForce; }
  private get BASE_SPEED() { return RunnerSettings.baseSpeed; }
  private get MAX_SPEED() { return RunnerSettings.maxSpeed; }

  // UI elements
  private multiplierText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private cashoutBtn!: Phaser.GameObjects.Container;
  private playBtn!: Phaser.GameObjects.Container;
  private betPanel!: Phaser.GameObjects.Container;

  // Run animation
  private runFrame = 0;
  private runTimer = 0;
  private isDead = false;

  // Cash out animation
  private cashoutPipe?: Phaser.GameObjects.Image;

  // Bullet Bill spawn timer
  private bulletTimer = 0;
  private bullets: EnemyData[] = [];

  // Challenge state (magic block)
  private challengeActive = false;
  private challengeTarget = 0;
  private challengeUI?: Phaser.GameObjects.Container;
  private challengeGoalText?: Phaser.GameObjects.Text;
  private frozen = false; // world frozen during challenge popup

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
    this.challengeActive = false;
    this.challengeTarget = 0;
    this.challengeUI = undefined;
    this.challengeGoalText = undefined;
    this.frozen = false;

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
      poisonMushrooms: [],
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
      seg.coins.push({ sprite: coin, premium: false });
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

    // Segment length - randomized to prevent prediction
    const segLen = Phaser.Math.Between(150, 400) + Phaser.Math.Between(-30, 30);
    const gapMin = RunnerSettings.gapSizeMin;
    const gapMax = RunnerSettings.gapSizeMax;
    // Cap gap to max jumpable distance (never impossible)
    const maxJumpable = 120;
    const gapBefore = this.segmentCount <= 2 ? 0 : Math.min(maxJumpable, Phaser.Math.Between(
      gapMin + Math.floor(difficulty * 15),
      gapMax + Math.floor(difficulty * 25)
    ));

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
      poisonMushrooms: [],
      startX: segStartX,
      endX: segEndX,
    };

    // Ground tiles
    for (let x = segStartX; x < segEndX; x += 32) {
      const tile = this.add.image(x, this.groundY, 'ground').setOrigin(0, 0);
      seg.grounds.push(tile);
    }

    // ALWAYS add a floating platform above the gap (makes gap jumpable)
    if (gapBefore > 30) {
      const platX = segStartX - gapBefore / 2 - 32;
      const platY = this.groundY - Phaser.Math.Between(35, 60);
      const platW = Math.max(56, 90 - difficulty * 15);
      const plat = this.add.image(platX, platY, 'platform').setOrigin(0, 0).setDisplaySize(platW, 16);
      seg.platforms.push({ sprite: plat, x: platX, y: platY, w: platW });

      // Coins above platform
      for (let c = 0; c < 2; c++) {
        const isPremium = Math.random() < RunnerSettings.premiumCoinChance;
        const tex = isPremium ? 'coin_premium' : 'coin';
        const coin = this.add.image(platX + 15 + c * 20, platY - 20, tex).setScale(isPremium ? 1.4 : 1.2);
        this.tweens.add({ targets: coin, y: platY - 25, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        seg.coins.push({ sprite: coin, premium: isPremium });
      }
    }

    // Add coins on the ground (some may be premium)
    const numCoins = Phaser.Math.Between(2, 4);
    for (let c = 0; c < numCoins; c++) {
      const cx = segStartX + Phaser.Math.Between(20, segLen - 20);
      const isPremium = Math.random() < RunnerSettings.premiumCoinChance;
      const tex = isPremium ? 'coin_premium' : 'coin';
      const coin = this.add.image(cx, this.groundY - 20, tex).setScale(isPremium ? 1.4 : 1.2);
      this.tweens.add({ targets: coin, y: this.groundY - 25, duration: 500 + c * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      seg.coins.push({ sprite: coin, premium: isPremium });
    }

    // ENEMIES - gradually introduce types, density from settings
    if (this.segmentCount >= 3 && Math.random() < RunnerSettings.enemyDensity * (0.5 + difficulty * 0.5)) {
      const maxEnemyType = Math.min(Math.floor(this.segmentCount / 3), 4);
      const typeIdx = Phaser.Math.Between(0, maxEnemyType);
      const enemyType = ENEMY_TYPES[typeIdx];
      // Truly random position within segment (anti-bot)
      const ex = segStartX + Phaser.Math.Between(30, segLen - 30) + Phaser.Math.FloatBetween(-10, 10);
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

    // Question blocks (some may be magic challenge blocks)
    if (Math.random() < 0.3) {
      const qx = segStartX + Phaser.Math.Between(30, segLen - 30);
      const qy = this.groundY - Phaser.Math.Between(55, 75);
      const isMagic = Math.random() < RunnerSettings.magicBlockChance;
      const tex = isMagic ? 'magic_block' : 'qblock';
      const qblock = this.add.image(qx, qy, tex).setScale(1.4);
      if (isMagic) {
        // Pulsing glow for magic blocks
        this.tweens.add({ targets: qblock, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 });
      }
      seg.qblocks.push({ sprite: qblock, hit: false, magic: isMagic });
    }

    // Mushroom power-up (rare)
    if (Math.random() < 0.1 && this.segmentCount > 5) {
      const mx = segStartX + Phaser.Math.Between(20, segLen - 20);
      const my = this.groundY - 20;
      const mush = this.add.image(mx, my, 'mushroom').setScale(1.3);
      this.tweens.add({ targets: mush, y: my - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      seg.mushrooms.push(mush);
    }

    // Poison mushroom (loses half of gained multiplier!)
    if (Math.random() < RunnerSettings.poisonMushroomChance && this.segmentCount > 4) {
      const px2 = segStartX + Phaser.Math.Between(20, segLen - 20);
      const py2 = this.groundY - 20;
      const poison = this.add.image(px2, py2, 'mushroom_poison').setScale(1.3);
      this.tweens.add({ targets: poison, y: py2 - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      seg.poisonMushrooms.push(poison);
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
        const isPremium = Math.random() < RunnerSettings.premiumCoinChance;
        const tex = isPremium ? 'coin_premium' : 'coin';
        const coin = this.add.image(platX + 10 + c * 22, platY - 18, tex).setScale(isPremium ? 1.4 : 1.2);
        this.tweens.add({ targets: coin, y: platY - 23, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        seg.coins.push({ sprite: coin, premium: isPremium });
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
    this.statusText = this.add.text(w / 2, this.groundY + 40, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(100);

    // Bet panel (overlay popup for betting phase)
    this.createBetPanel(w, h);

    // Cashout button (shown only during running)
    this.createCashoutButton(w, h);

    this.createBottomBar(w, h);
  }

  private createBetPanel(w: number, h: number): void {
    this.betPanel = this.add.container(0, 0).setDepth(200);

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 42, w, h - 82);
    this.betPanel.add(overlay);

    // Panel background
    const panelW = w - 40;
    const panelH = 260;
    const panelX = 20;
    const panelY = h / 2 - panelH / 2 - 20;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a3e, 0.95);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    panelBg.lineStyle(2, 0xffd700, 0.6);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
    this.betPanel.add(panelBg);

    // Title
    const title = this.add.text(w / 2, panelY + 20, 'FACA SUA APOSTA', {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.betPanel.add(title);

    // Balance display
    const balLabel = this.add.text(w / 2, panelY + 50, `Saldo: ${GameState.balance.toFixed(0)} coins`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#4ecdc4',
    }).setOrigin(0.5, 0);
    this.betPanel.add(balLabel);

    // Bet label
    const betLabel = this.add.text(w / 2, panelY + 80, 'APOSTA', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffcc99',
    }).setOrigin(0.5, 0);
    this.betPanel.add(betLabel);

    // Bet controls row
    const rowY = panelY + 100;
    const btnSize = 40;

    const minusBtn = this.makeBtn(w / 2 - 75, rowY, btnSize, btnSize, '-', 0x8b4513, () => this.changeBet(-5));
    this.betPanel.add(minusBtn);

    const betBg = this.add.graphics();
    betBg.fillStyle(0x6b3e08);
    betBg.fillRoundedRect(w / 2 - 28, rowY, 56, btnSize, 8);
    this.betPanel.add(betBg);

    this.betText = this.add.text(w / 2, rowY + btnSize / 2, this.betAmount.toString(), {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.betPanel.add(this.betText);

    const plusBtn = this.makeBtn(w / 2 + 35, rowY, btnSize, btnSize, '+', 0x8b4513, () => this.changeBet(5));
    this.betPanel.add(plusBtn);

    // Quick bet buttons
    const quickY = rowY + btnSize + 8;
    [5, 10, 25, 50, 100].forEach((amt, i) => {
      const qw = (panelW - 20) / 5;
      const qBtn = this.makeBtn(panelX + 10 + i * qw + 2, quickY, qw - 4, 26, amt.toString(), 0x6b3e08, () => {
        this.betAmount = amt;
        this.betText.setText(amt.toString());
      }, '12px');
      this.betPanel.add(qBtn);
    });

    // START button
    const startY = quickY + 40;
    this.playBtn = this.makeBtn(panelX + 20, startY, panelW - 40, 52, 'START', 0x00aa00, () => this.startRun(), '22px');
    this.betPanel.add(this.playBtn);
  }

  private createCashoutButton(w: number, h: number): void {
    const btnY = h - 95;
    this.cashoutBtn = this.makeBtn(20, btnY, w - 40, 52, 'CASH OUT', 0xffd700, () => this.cashOut(), '22px');
    this.setCashoutEnabled(false);
    this.cashoutBtn.setVisible(false);
  }

  private showBetPanel(): void {
    this.betPanel.setVisible(true);
    this.cashoutBtn.setVisible(false);
    this.setCashoutEnabled(false);
  }

  private hideBetPanel(): void {
    this.betPanel.setVisible(false);
  }

  private createBottomBar(w: number, h: number): void {
    const y = h - 40;
    const btnW = (w - 40) / 3;
    this.makeBtn(10, y, btnW, 32, 'MENU', 0x444444, () => this.scene.start('MenuScene'), '12px');
    this.makeBtn(15 + btnW, y, btnW, 32, 'AVIATORE', 0x4ecdc4, () => this.scene.start('CrashScene'), '12px');
    this.makeBtn(20 + btnW * 2, y, btnW, 32, 'CONFIG', 0x8b4513, () => this.openSettings(), '12px');
  }

  private settingsPanel?: import('../ui/RunnerSettingsPanel').RunnerSettingsPanel;

  private openSettings(): void {
    if (this.settingsPanel) return;
    import('../ui/RunnerSettingsPanel').then(({ RunnerSettingsPanel }) => {
      this.settingsPanel = new RunnerSettingsPanel(this, () => {
        this.settingsPanel = undefined;
        // Restart scene when settings change
        this.scene.restart();
      });
    });
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
    this.hideBetPanel();
    this.cashoutBtn.setVisible(true);
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
    if ((this.phase !== 'running' && this.phase !== 'tutorial') || this.isDead || this.challengeActive) return;

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
    const h = GAME_CONFIG.HEIGHT;
    const winnings = this.betAmount * this.currentMultiplier;
    GameState.addWinnings(winnings);

    GameState.recordRound({
      bet: this.betAmount,
      crashAt: this.currentMultiplier,
      cashedAt: this.currentMultiplier,
      profit: winnings - this.betAmount,
    });

    this.balanceText.setText(`${GameState.balance.toFixed(0)} coins`);
    this.cashoutBtn.setVisible(false);

    // Prize display
    const resultContainer = this.add.container(0, 0).setDepth(300);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, w, h);
    resultContainer.add(overlay);

    const prizeY = this.groundY / 2;

    const winText = this.add.text(w / 2, prizeY - 40, 'VOCE GANHOU!', {
      fontSize: '28px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    resultContainer.add(winText);

    const amtText = this.add.text(w / 2, prizeY + 10, `+${winnings.toFixed(2)} coins`, {
      fontSize: '36px', fontFamily: 'Arial', color: '#00ff00', fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);
    resultContainer.add(amtText);

    const multText = this.add.text(w / 2, prizeY + 60, `${this.currentMultiplier.toFixed(2)}x  |  ${this.coinsCollected} moedas`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5);
    resultContainer.add(multText);

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
        .setScale(1.5);
      resultContainer.add(coin);
      this.tweens.add({
        targets: coin,
        x: w / 2 + Phaser.Math.Between(-120, 120),
        y: prizeY + Phaser.Math.Between(-80, 80),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(600, 1200),
        delay: i * 50,
      });
    }

    SoundFX.playCashOut();
    this.multiplierText.setColor('#00ff00');
    this.phase = 'result';

    // "APOSTAR NOVAMENTE" button after a short delay
    this.time.delayedCall(2000, () => {
      const replayBtn = this.makeBtn(w / 2 - 100, prizeY + 100, 200, 50, 'JOGAR NOVAMENTE', 0x00aa00, () => {
        resultContainer.destroy();
        this.scene.restart();
      }, '16px');
      resultContainer.add(replayBtn);
    });
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.worldSpeed = 0;

    SoundFX.playExplosion();
    this.multiplierText.setColor('#ff4757');
    this.statusText.setText('Voce morreu! Aposta perdida!');
    this.cashoutBtn.setVisible(false);
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
          onComplete: () => this.showDeathResult(),
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
  }

  private showDeathResult(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    const resultContainer = this.add.container(0, 0).setDepth(300);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, w, h);
    resultContainer.add(overlay);

    const prizeY = this.groundY / 2;

    const loseText = this.add.text(w / 2, prizeY - 30, 'VOCE PERDEU!', {
      fontSize: '28px', fontFamily: 'Arial', color: '#ff4757', fontStyle: 'bold',
    }).setOrigin(0.5);
    resultContainer.add(loseText);

    const amtText = this.add.text(w / 2, prizeY + 20, `-${this.betAmount} coins`, {
      fontSize: '30px', fontFamily: 'Arial', color: '#ff6b6b', fontStyle: 'bold',
    }).setOrigin(0.5);
    resultContainer.add(amtText);

    const infoText = this.add.text(w / 2, prizeY + 65, `Multiplicador: ${this.currentMultiplier.toFixed(2)}x  |  ${this.coinsCollected} moedas`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5);
    resultContainer.add(infoText);

    // Replay button
    this.time.delayedCall(1500, () => {
      const replayBtn = this.makeBtn(w / 2 - 100, prizeY + 100, 200, 50, 'JOGAR NOVAMENTE', 0x00aa00, () => {
        resultContainer.destroy();
        this.scene.restart();
      }, '16px');
      resultContainer.add(replayBtn);
    });
  }

  // === UPDATE LOOP ===
  update(_time: number, delta: number): void {
    if (this.phase === 'betting' || this.phase === 'result' || this.phase === 'cashout_anim') return;
    if (this.isDead || this.frozen) return;

    const dt = delta / 16.67;

    // Tutorial → Running transition
    if (this.phase === 'tutorial') {
      this.tutorialTimer += delta;
      if (this.distanceTraveled >= this.TUTORIAL_SAFE_DISTANCE || this.tutorialTimer > 6000) {
        this.endTutorial();
      }
    }

    // Speed: stays at BASE_SPEED until multiplier > threshold, then gentle increase
    if (this.phase === 'running') {
      if (this.currentMultiplier >= RunnerSettings.speedThreshold) {
        const excess = this.currentMultiplier - RunnerSettings.speedThreshold;
        this.worldSpeed = Math.min(this.MAX_SPEED, this.BASE_SPEED + excess * RunnerSettings.speedScaling);
      } else {
        this.worldSpeed = this.BASE_SPEED;
      }
    }

    const speed = this.worldSpeed * dt;
    this.scrollOffset += speed;
    this.distanceTraveled += speed;

    // Multiplier: coin-based only - grows when collecting coins
    this.currentMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

    let mColor = '#ffd700';
    if (this.currentMultiplier >= 5) mColor = '#ff4757';
    else if (this.currentMultiplier >= 3) mColor = '#ff6b6b';
    else if (this.currentMultiplier >= 2) mColor = '#4ecdc4';
    this.multiplierText.setText(`${this.currentMultiplier.toFixed(2)}x`);
    this.multiplierText.setColor(mColor);
    this.coinsText.setText(`Moedas: ${this.coinsCollected}`);

    // Check challenge target reached
    if (this.challengeActive && this.currentMultiplier >= this.challengeTarget) {
      this.challengeActive = false;
      this.setCashoutEnabled(true);
      if (this.challengeGoalText) {
        this.challengeGoalText.setText('META ATINGIDA!').setColor('#00ff00');
        this.tweens.add({ targets: this.challengeGoalText, alpha: 0, duration: 3000, onComplete: () => this.challengeGoalText?.destroy() });
      }
      // Flash celebration
      const w = GAME_CONFIG.WIDTH;
      const celebrate = this.add.text(w / 2, this.groundY - 100, 'META ATINGIDA!', {
        fontSize: '24px', fontFamily: 'Arial', color: '#00ff00', fontStyle: 'bold',
        backgroundColor: '#000000cc', padding: { x: 15, y: 8 },
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({ targets: celebrate, alpha: 0, y: celebrate.y - 50, duration: 2000, onComplete: () => celebrate.destroy() });
      SoundFX.playCashOut();
    }

    // Update challenge goal display
    if (this.challengeActive && this.challengeGoalText) {
      const progress = Math.min(100, (this.currentMultiplier / this.challengeTarget) * 100);
      this.challengeGoalText.setText(`META: ${this.challengeTarget}x (${progress.toFixed(0)}%)`);
    }

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
        const cd = seg.coins[i];
        if (!cd.sprite.active) continue;
        if (this.overlap(this.runner, cd.sprite, 22, 28)) {
          this.coinsCollected++;
          if (cd.premium) {
            // Premium coin
            this.currentMultiplier += RunnerSettings.premiumCoinValue;
            const label = this.add.text(cd.sprite.x, cd.sprite.y - 20, `+${RunnerSettings.premiumCoinValue.toFixed(2)}x`, {
              fontSize: '18px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(200);
            this.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 800, onComplete: () => label.destroy() });
          } else {
            // Normal coin
            this.currentMultiplier += RunnerSettings.multiplierPerCoin;
            const label = this.add.text(cd.sprite.x, cd.sprite.y - 15, `+${RunnerSettings.multiplierPerCoin.toFixed(2)}x`, {
              fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
            }).setOrigin(0.5).setDepth(200);
            this.tweens.add({ targets: label, y: label.y - 35, alpha: 0, duration: 600, onComplete: () => label.destroy() });
          }
          this.tweens.add({ targets: cd.sprite, y: cd.sprite.y - 30, alpha: 0, scaleX: 0, duration: 300, onComplete: () => cd.sprite.destroy() });
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
            this.currentMultiplier += RunnerSettings.multiplierPerCoin * 2;
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
          this.velocityY = 2;

          if (q.magic) {
            // MAGIC BLOCK: freeze and show challenge
            SoundFX.playBetTick();
            this.showMagicChallenge();
          } else {
            // Normal block: coins + multiplier
            this.coinsCollected += 3;
            this.currentMultiplier += RunnerSettings.multiplierPerCoin * 3;
            SoundFX.playCashOut();
            const burst = this.add.image(q.sprite.x, q.sprite.y - 15, 'coin').setScale(1.5);
            this.tweens.add({ targets: burst, y: burst.y - 40, alpha: 0, duration: 500, onComplete: () => burst.destroy() });
          }
        }
      }

      // Mushrooms
      for (let i = seg.mushrooms.length - 1; i >= 0; i--) {
        const m = seg.mushrooms[i];
        if (!m.active) continue;
        if (this.overlap(this.runner, m, 20, 22)) {
          this.coinsCollected += 5;
          this.currentMultiplier += RunnerSettings.multiplierPerCoin * 5;
          this.tweens.add({ targets: m, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => m.destroy() });
          seg.mushrooms.splice(i, 1);
          this.tweens.add({ targets: this.runner, alpha: 0.5, duration: 100, yoyo: true, repeat: 5 });
          SoundFX.playCashOut();
        }
      }

      // Poison mushrooms - lose half of gained multiplier!
      for (let i = seg.poisonMushrooms.length - 1; i >= 0; i--) {
        const pm = seg.poisonMushrooms[i];
        if (!pm.active) continue;
        if (this.overlap(this.runner, pm, 20, 22)) {
          const gained = this.currentMultiplier - 1;
          const loss = gained / 2;
          this.currentMultiplier = Math.max(1, this.currentMultiplier - loss);
          // Visual feedback
          const lossLabel = this.add.text(pm.x, pm.y - 20, `-${loss.toFixed(2)}x`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#ff0000', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(200);
          this.tweens.add({ targets: lossLabel, y: lossLabel.y - 50, alpha: 0, duration: 1000, onComplete: () => lossLabel.destroy() });
          // Poison effect on runner
          this.tweens.add({ targets: this.runner, tint: 0x6600aa, duration: 100, yoyo: true, repeat: 5 });
          this.tweens.add({ targets: pm, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => pm.destroy() });
          seg.poisonMushrooms.splice(i, 1);
          SoundFX.playExplosion();
          this.statusText.setText('Cogumelo podre! Perdeu metade do mult.!');
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
      if (this.bulletTimer > RunnerSettings.bulletInterval - Math.min(this.segmentCount * 100, 3000)) {
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

    // Run animation - cycle walk frames (never flipX, always face right)
    if (this.isOnGround) {
      this.runTimer += delta;
      if (this.runTimer > 120) {
        this.runTimer = 0;
        this.runFrame = (this.runFrame + 1) % 4;
        const walkTextures = ['runner_walk1', 'runner', 'runner_walk2', 'runner'];
        this.runner.setTexture(walkTextures[this.runFrame]);
      }
    }

    // Generate new segments
    while (this.nextSegmentX - this.scrollOffset < GAME_CONFIG.WIDTH + 300) {
      this.generateSegment();
    }
  }

  // === MAGIC BLOCK CHALLENGE ===
  private showMagicChallenge(): void {
    this.frozen = true;
    const w = GAME_CONFIG.WIDTH;

    // Calculate challenge target: next round number above current multiplier
    let target: number;
    if (this.currentMultiplier < 2) target = 5;
    else if (this.currentMultiplier < 5) target = 10;
    else if (this.currentMultiplier < 10) target = 20;
    else if (this.currentMultiplier < 20) target = 30;
    else target = Math.ceil(this.currentMultiplier / 10) * 10 + 10;

    const container = this.add.container(0, 0).setDepth(400);
    this.challengeUI = container;

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(0, 0, w, GAME_CONFIG.HEIGHT);
    container.add(overlay);

    // Panel
    const panelW = w - 40;
    const panelH = 260;
    const px = 20;
    const py = (GAME_CONFIG.HEIGHT - panelH) / 2 - 50;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a0a3e);
    panel.fillRoundedRect(px, py, panelW, panelH, 16);
    panel.lineStyle(3, 0x9933ff);
    panel.strokeRoundedRect(px, py, panelW, panelH, 16);
    container.add(panel);

    // Star burst effect
    const star = this.add.text(w / 2, py + 30, '★ DESAFIO ★', {
      fontSize: '22px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(star);
    this.tweens.add({ targets: star, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });

    // Challenge description
    const desc = this.add.text(w / 2, py + 70, 'Ate onde voce consegue chegar?', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ccccff',
    }).setOrigin(0.5);
    container.add(desc);

    // Target display
    const targetText = this.add.text(w / 2, py + 110, `${target}x`, {
      fontSize: '48px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(targetText);
    this.tweens.add({ targets: targetText, scaleX: 1.05, scaleY: 1.05, duration: 800, yoyo: true, repeat: -1 });

    // Current vs target
    const currentInfo = this.add.text(w / 2, py + 150, `Atual: ${this.currentMultiplier.toFixed(2)}x → Meta: ${target}x`, {
      fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(currentInfo);

    // Buttons
    const btnW = (panelW - 30) / 2;
    const btnY = py + panelH - 60;

    // DECLINE button
    const declineBg = this.add.graphics();
    declineBg.fillStyle(0x666666);
    declineBg.fillRoundedRect(0, 0, btnW, 44, 8);
    const declineText = this.add.text(btnW / 2, 22, 'NAO', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const declineHit = this.add.rectangle(btnW / 2, 22, btnW, 44).setInteractive({ useHandCursor: true });
    declineHit.on('pointerdown', () => this.dismissChallenge());
    const declineBtn = this.add.container(px + 5, btnY, [declineBg, declineText, declineHit]);
    container.add(declineBtn);

    // ACCEPT button
    const acceptBg = this.add.graphics();
    acceptBg.fillStyle(0x9933ff);
    acceptBg.fillRoundedRect(0, 0, btnW, 44, 8);
    const acceptText = this.add.text(btnW / 2, 22, 'ACEITAR!', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const acceptHit = this.add.rectangle(btnW / 2, 22, btnW, 44).setInteractive({ useHandCursor: true });
    acceptHit.on('pointerdown', () => this.acceptChallenge(target));
    const acceptBtn = this.add.container(px + btnW + 15, btnY, [acceptBg, acceptText, acceptHit]);
    container.add(acceptBtn);
  }

  private dismissChallenge(): void {
    this.frozen = false;
    this.challengeUI?.destroy();
    this.challengeUI = undefined;
  }

  private acceptChallenge(target: number): void {
    this.frozen = false;
    this.challengeUI?.destroy();
    this.challengeUI = undefined;

    this.challengeActive = true;
    this.challengeTarget = target;
    this.setCashoutEnabled(false); // Lock cashout!

    // Show persistent goal tracker
    const w = GAME_CONFIG.WIDTH;
    this.challengeGoalText = this.add.text(w / 2, 95, `META: ${target}x (0%)`, {
      fontSize: '13px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
      backgroundColor: '#1a0a3ecc', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(100);

    this.statusText.setText(`Desafio aceito! Chegue em ${target}x!`);
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
      seg.coins.forEach(c => { if (c.sprite.active) c.sprite.x -= speed; });
      seg.enemies.forEach(e => { if (e.sprite.active) e.sprite.x -= speed; });
      seg.pipes.forEach(p => {
        if (p.sprite.active) p.sprite.x -= speed;
        if (p.piranha?.active) p.piranha.x -= speed;
      });
      seg.qblocks.forEach(q => { if (q.sprite.active) q.sprite.x -= speed; });
      seg.mushrooms.forEach(m => { if (m.active) m.x -= speed; });
      seg.poisonMushrooms.forEach(m => { if (m.active) m.x -= speed; });

      // Remove off-screen segments
      const rightmost = Math.max(
        ...seg.grounds.filter(g => g.active).map(g => g.x + 32),
        ...seg.platforms.filter(p => p.sprite.active).map(p => p.sprite.x + p.w),
        0
      );

      if (rightmost < -100) {
        seg.grounds.forEach(g => g.destroy());
        seg.platforms.forEach(p => p.sprite.destroy());
        seg.coins.forEach(c => c.sprite.destroy());
        seg.enemies.forEach(e => e.sprite.destroy());
        seg.pipes.forEach(p => { p.sprite.destroy(); p.piranha?.destroy(); });
        seg.qblocks.forEach(q => q.sprite.destroy());
        seg.mushrooms.forEach(m => m.destroy());
        seg.poisonMushrooms.forEach(m => m.destroy());
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

  private setCashoutEnabled(e: boolean): void {
    this.cashoutBtn.setAlpha(e ? 1 : 0.4);
    const h = this.cashoutBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (e) h.setInteractive({ useHandCursor: true }); else h.disableInteractive();
  }
}
