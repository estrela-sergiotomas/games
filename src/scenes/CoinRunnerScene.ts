import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants';
import { GameState } from '../utils/GameState';
import { SoundFX } from '../assets/sfx';

type RunnerPhase = 'betting' | 'running' | 'result';

interface PlatformData {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  width: number;
  coins: Phaser.GameObjects.Image[];
  enemy?: Phaser.GameObjects.Image;
  pipe?: Phaser.GameObjects.Image;
  qblock?: Phaser.GameObjects.Image;
  flag?: Phaser.GameObjects.Image;
  mushroom?: Phaser.GameObjects.Image;
}

export class CoinRunnerScene extends Phaser.Scene {
  private phase: RunnerPhase = 'betting';
  private betAmount = 10;
  private currentMultiplier = 1;
  private distanceTraveled = 0;
  private coinsCollected = 0;

  // Runner character
  private runner!: Phaser.GameObjects.Image;
  private isJumping = false;
  private velocityY = 0;
  private runnerGroundY = 0;
  private isOnGround = true;
  private runnerBaseX = 80;

  // World
  private platforms: PlatformData[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private worldSpeed = 2.5;
  private groundY = 0;
  private scrollX = 0;
  private nextPlatformX = 0;
  private platformCount = 0;

  // Ground tiles
  private groundTiles: Phaser.GameObjects.Image[] = [];

  // UI
  private multiplierText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private cashoutBtn!: Phaser.GameObjects.Container;
  private playBtn!: Phaser.GameObjects.Container;
  private distanceBar!: Phaser.GameObjects.Graphics;

  // Animation
  private runFrame = 0;
  private runTimer = 0;
  private isDead = false;
  private deathTimer = 0;

  // Difficulty
  private readonly BASE_GAP = 40;
  private readonly GAP_INCREASE = 0.3;
  private readonly ENEMY_START_PLATFORM = 3;
  private readonly PIPE_START_PLATFORM = 6;

  // Scenery
  private hills!: Phaser.GameObjects.Graphics;
  private sky!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'CoinRunnerScene' });
  }

  create(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;
    this.groundY = h - 220;

    this.resetState();
    this.createBackground(w, h);
    this.createUI(w, h);
    this.createGround(w);
    this.setupInput();
    this.spawnInitialPlatforms();
  }

  private resetState(): void {
    this.phase = 'betting';
    this.currentMultiplier = 1;
    this.distanceTraveled = 0;
    this.coinsCollected = 0;
    this.worldSpeed = 2.5;
    this.scrollX = 0;
    this.nextPlatformX = 200;
    this.platformCount = 0;
    this.isJumping = false;
    this.velocityY = 0;
    this.isOnGround = true;
    this.isDead = false;
    this.deathTimer = 0;
    this.runFrame = 0;
    this.runTimer = 0;
    this.platforms = [];
    this.clouds = [];
    this.groundTiles = [];
  }

  private createBackground(w: number, h: number): void {
    // Sky gradient
    this.sky = this.add.graphics();
    this.sky.fillGradientStyle(0x5c94fc, 0x5c94fc, 0x87ceeb, 0x87ceeb);
    this.sky.fillRect(0, 0, w, this.groundY);

    // Hills in background
    this.hills = this.add.graphics();
    this.hills.fillStyle(0x228b22, 0.4);
    for (let x = 0; x < w + 100; x += 120) {
      this.hills.fillCircle(x, this.groundY, 60);
    }
    this.hills.fillStyle(0x32cd32, 0.3);
    for (let x = 50; x < w + 100; x += 150) {
      this.hills.fillCircle(x, this.groundY, 45);
    }

    // Clouds
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.image(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(30, 150),
        'cloud'
      ).setAlpha(0.7).setScale(Phaser.Math.FloatBetween(0.6, 1.2));
      this.clouds.push(cloud);
    }

    // Underground area
    const underground = this.add.graphics();
    underground.fillStyle(0xc84c09);
    underground.fillRect(0, this.groundY, w, h - this.groundY);
    underground.fillStyle(0xa0380a);
    underground.fillRect(0, this.groundY, w, 4);
  }

  private createGround(w: number): void {
    // Ground using platform tiles
    for (let x = 0; x < w + 64; x += 64) {
      const tile = this.add.image(x, this.groundY - 8, 'platform').setOrigin(0, 0);
      this.groundTiles.push(tile);
    }

    // Runner character
    this.runnerGroundY = this.groundY - 32;
    this.runner = this.add.image(this.runnerBaseX, this.runnerGroundY, 'runner')
      .setScale(1.8)
      .setOrigin(0.5, 1);
  }

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

    // Multiplier display
    this.multiplierText = this.add.text(w / 2, 65, '1.00x', {
      fontSize: '36px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Coins collected
    this.coinsText = this.add.text(w - 15, 55, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(100).setAlpha(0);

    // Status
    this.statusText = this.add.text(w / 2, this.groundY + 20, 'Faca sua aposta e corra!', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(100);

    // Distance progress bar
    this.distanceBar = this.add.graphics().setDepth(100);

    // Bet controls area (below ground)
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

    this.createSmallButton(w / 2 - 75, rowY, btnSize, btnSize, '-', 0x8b4513, () => this.changeBet(-5));

    const betBg = this.add.graphics();
    betBg.fillStyle(0x6b3e08);
    betBg.fillRoundedRect(w / 2 - 28, rowY, 56, btnSize, 8);
    betBg.setDepth(100);
    this.betText = this.add.text(w / 2, rowY + btnSize / 2, this.betAmount.toString(), {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.createSmallButton(w / 2 + 35, rowY, btnSize, btnSize, '+', 0x8b4513, () => this.changeBet(5));

    // Quick bets
    const quickY = rowY + btnSize + 6;
    const quickBets = [5, 10, 25, 50, 100];
    const qw = (w - 30) / quickBets.length;
    quickBets.forEach((amt, i) => {
      this.createSmallButton(10 + i * qw + 2, quickY, qw - 4, 26, amt.toString(), 0x6b3e08, () => {
        this.betAmount = amt;
        this.betText.setText(amt.toString());
      }, '12px');
    });
  }

  private createActionButtons(w: number, y: number): void {
    const gap = 10;
    const btnH = 52;
    const halfW = (w - 30) / 2;

    this.playBtn = this.createSmallButton(10, y, halfW, btnH, 'CORRER!', 0x00aa00, () => this.startRun(), '18px');
    this.cashoutBtn = this.createSmallButton(10 + halfW + gap, y, halfW, btnH, 'CASH OUT', 0xffd700, () => this.cashOut(), '18px');
    this.setCashoutEnabled(false);
  }

  private createBottomBar(w: number, h: number): void {
    const y = h - 40;
    const btnW = (w - 30) / 2;
    const btnH = 32;

    this.createSmallButton(10, y, btnW, btnH, 'MENU', 0x444444, () => this.scene.start('MenuScene'), '13px');
    this.createSmallButton(15 + btnW, y, btnW, btnH, 'AVIATORE', 0x4ecdc4, () => this.scene.start('CrashScene'), '13px');
  }

  private createSmallButton(x: number, y: number, bw: number, bh: number, label: string, color: number, onClick: () => void, fontSize = '16px'): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(0, 0, bw, bh, 8);
    bg.setDepth(100);

    const text = this.add.text(bw / 2, bh / 2, label, {
      fontSize, fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    const hitArea = this.add.rectangle(bw / 2, bh / 2, bw, bh).setInteractive({ useHandCursor: true }).setDepth(100);
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(0, 0, bw, bh, 8); });
    hitArea.on('pointerout', () => { bg.clear(); bg.fillStyle(color); bg.fillRoundedRect(0, 0, bw, bh, 8); });

    return this.add.container(x, y, [bg, text, hitArea]).setDepth(100);
  }

  private setupInput(): void {
    // Touch / click anywhere above controls to jump
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < this.groundY + 10 && this.phase === 'running') {
        this.jump();
      }
    });

    // Space to jump
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'running') this.jump();
      else if (this.phase === 'betting') this.startRun();
    });

    // Up arrow to jump
    this.input.keyboard?.on('keydown-UP', () => {
      if (this.phase === 'running') this.jump();
    });
  }

  private jump(): void {
    if (!this.isOnGround || this.isDead) return;
    this.isOnGround = false;
    this.isJumping = true;
    this.velocityY = -11;
    this.runner.setTexture('runner_jump');
    SoundFX.playBetTick(); // jump sound
  }

  private startRun(): void {
    if (this.phase !== 'betting') return;

    if (!GameState.deductBet(this.betAmount)) {
      this.statusText.setText('Saldo insuficiente!');
      return;
    }

    this.phase = 'running';
    this.balanceText.setText(`${GameState.balance.toFixed(0)} coins`);
    this.multiplierText.setAlpha(0.85);
    this.coinsText.setAlpha(1);
    this.statusText.setText('Toque para pular! Cash out a qualquer hora!');
    this.setPlayEnabled(false);
    this.setCashoutEnabled(true);

    SoundFX.playFlyAway();
  }

  private cashOut(): void {
    if (this.phase !== 'running' || this.isDead) return;

    const winnings = this.betAmount * this.currentMultiplier;
    GameState.addWinnings(winnings);

    GameState.recordRound({
      bet: this.betAmount,
      crashAt: this.currentMultiplier,
      cashedAt: this.currentMultiplier,
      profit: winnings - this.betAmount,
    });

    this.balanceText.setText(`${GameState.balance.toFixed(0)} coins`);
    this.multiplierText.setColor('#00ff00');
    this.statusText.setText(`Cash out! +${winnings.toFixed(2)} coins!`);
    SoundFX.playCashOut();

    this.phase = 'result';
    this.setCashoutEnabled(false);

    // Show flag at runner position
    const flag = this.add.image(this.runner.x + 10, this.runner.y - 30, 'flag').setScale(1.5);
    this.tweens.add({ targets: flag, y: flag.y - 15, duration: 500, yoyo: true, repeat: 2 });

    this.time.delayedCall(3000, () => this.restartRound());
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;

    SoundFX.playExplosion();
    this.multiplierText.setColor('#ff4757');
    this.statusText.setText('Voce morreu! Aposta perdida!');
    this.setCashoutEnabled(false);

    // Death animation - runner flips and falls
    this.tweens.add({
      targets: this.runner,
      y: this.runner.y - 60,
      angle: 360,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: this.runner,
          y: GAME_CONFIG.HEIGHT + 50,
          duration: 600,
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
    this.time.delayedCall(3000, () => this.restartRound());
  }

  private restartRound(): void {
    this.scene.restart();
  }

  private spawnInitialPlatforms(): void {
    // Initial ground is the safe zone - spawn platforms ahead
    for (let i = 0; i < 6; i++) {
      this.spawnPlatform();
    }
  }

  private spawnPlatform(): void {
    this.platformCount++;
    const w = GAME_CONFIG.WIDTH;

    // Platform width decreases over time (min 48)
    const platWidth = Math.max(48, 96 - this.platformCount * 2);

    // Gap increases over time
    const gap = this.BASE_GAP + this.platformCount * this.GAP_INCREASE * 10;
    const actualGap = Phaser.Math.Between(gap * 0.7, gap * 1.3);

    // Platform Y variation
    const minY = this.groundY - 60;
    const maxY = this.groundY - 8;
    const platY = Phaser.Math.Between(minY, maxY);

    const platX = this.nextPlatformX + actualGap;
    this.nextPlatformX = platX + platWidth;

    // Create platform (may need multiple tiles)
    const numTiles = Math.ceil(platWidth / 64);
    const sprite = this.add.image(platX, platY, 'platform')
      .setOrigin(0, 0)
      .setDisplaySize(platWidth, 16);

    const plat: PlatformData = {
      sprite,
      x: platX,
      y: platY,
      width: platWidth,
      coins: [],
    };

    // Add coins above platform
    const numCoins = Phaser.Math.Between(1, 3);
    for (let c = 0; c < numCoins; c++) {
      const coinX = platX + 10 + c * 18;
      const coinY = platY - 22;
      const coin = this.add.image(coinX, coinY, 'coin').setScale(1.2);
      this.tweens.add({
        targets: coin,
        y: coinY - 5,
        duration: 500 + c * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      plat.coins.push(coin);
    }

    // Question blocks (random)
    if (Math.random() < 0.25 && this.platformCount > 2) {
      const qx = platX + platWidth / 2;
      const qy = platY - 50;
      plat.qblock = this.add.image(qx, qy, 'qblock').setScale(1.3);
    }

    // Enemies after a few platforms
    if (this.platformCount >= this.ENEMY_START_PLATFORM && Math.random() < 0.35) {
      const ex = platX + platWidth / 2;
      const ey = platY - 14;
      plat.enemy = this.add.image(ex, ey, 'enemy').setScale(1.2).setOrigin(0.5, 1);
      // Enemy patrol
      this.tweens.add({
        targets: plat.enemy,
        x: platX + 5,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Linear',
      });
    }

    // Pipes as obstacles
    if (this.platformCount >= this.PIPE_START_PLATFORM && Math.random() < 0.2) {
      const px = platX + platWidth - 10;
      const py = platY - 36;
      plat.pipe = this.add.image(px, py, 'pipe').setScale(1).setOrigin(0.5, 0);
    }

    // Mushroom power-ups (rare)
    if (Math.random() < 0.1 && this.platformCount > 4) {
      const mx = platX + Phaser.Math.Between(5, platWidth - 15);
      const my = platY - 20;
      plat.mushroom = this.add.image(mx, my, 'mushroom').setScale(1.2);
      this.tweens.add({
        targets: plat.mushroom,
        y: my - 8,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.platforms.push(plat);
  }

  private changeBet(delta: number): void {
    this.betAmount = Math.max(GAME_CONFIG.MIN_BET, this.betAmount + delta);
    this.betText.setText(this.betAmount.toString());
  }

  private setPlayEnabled(enabled: boolean): void {
    this.playBtn.setAlpha(enabled ? 1 : 0.4);
    const hitArea = this.playBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (enabled) hitArea.setInteractive({ useHandCursor: true });
    else hitArea.disableInteractive();
  }

  private setCashoutEnabled(enabled: boolean): void {
    this.cashoutBtn.setAlpha(enabled ? 1 : 0.4);
    const hitArea = this.cashoutBtn.getAt(2) as Phaser.GameObjects.Rectangle;
    if (enabled) hitArea.setInteractive({ useHandCursor: true });
    else hitArea.disableInteractive();
  }

  update(_time: number, delta: number): void {
    if (this.phase !== 'running' || this.isDead) return;

    const dt = delta / 16.67; // normalize to 60fps

    // Increase world speed over time
    this.worldSpeed = 2.5 + this.distanceTraveled * 0.002;
    const speed = this.worldSpeed * dt;

    this.scrollX += speed;
    this.distanceTraveled += speed;

    // Update multiplier based on distance
    this.currentMultiplier = 1 + this.distanceTraveled * 0.005 + this.coinsCollected * 0.05;
    this.currentMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

    let color = '#ffd700';
    if (this.currentMultiplier >= 5) color = '#ff4757';
    else if (this.currentMultiplier >= 3) color = '#ff6b6b';
    else if (this.currentMultiplier >= 2) color = '#4ecdc4';

    this.multiplierText.setText(`${this.currentMultiplier.toFixed(2)}x`);
    this.multiplierText.setColor(color);
    this.coinsText.setText(`Moedas: ${this.coinsCollected}`);

    // Draw distance bar
    this.drawDistanceBar();

    // Apply gravity
    if (!this.isOnGround) {
      this.velocityY += 0.55 * dt; // gravity
      this.runner.y += this.velocityY * dt;

      // Check if landed on ground
      if (this.runner.y >= this.runnerGroundY) {
        this.runner.y = this.runnerGroundY;
        this.isOnGround = true;
        this.isJumping = false;
        this.velocityY = 0;
        this.runner.setTexture('runner');
      }
    }

    // Check platform collisions (landing on top)
    let onPlatform = false;
    for (const plat of this.platforms) {
      const px = plat.sprite.x;
      const py = plat.sprite.y;
      const pw = plat.width;

      // Runner is above platform and falling
      if (this.velocityY >= 0 &&
          this.runner.x >= px - 5 && this.runner.x <= px + pw + 5 &&
          this.runner.y >= py - 2 && this.runner.y <= py + 12) {
        this.runner.y = py;
        this.isOnGround = true;
        this.isJumping = false;
        this.velocityY = 0;
        this.runner.setTexture('runner');
        onPlatform = true;
      }

      // Coin collection
      for (let i = plat.coins.length - 1; i >= 0; i--) {
        const coin = plat.coins[i];
        if (coin.active && this.checkOverlap(this.runner, coin, 20)) {
          this.coinsCollected++;
          // Coin collect animation
          this.tweens.add({
            targets: coin,
            y: coin.y - 30,
            alpha: 0,
            scaleX: 0,
            duration: 300,
            onComplete: () => coin.destroy(),
          });
          plat.coins.splice(i, 1);
          SoundFX.playCashOut();
        }
      }

      // Enemy collision
      if (plat.enemy && plat.enemy.active && this.checkOverlap(this.runner, plat.enemy, 15)) {
        // If landing on top of enemy, destroy it
        if (this.velocityY > 0 && this.runner.y < plat.enemy.y - 10) {
          this.tweens.add({
            targets: plat.enemy,
            scaleY: 0.2,
            alpha: 0,
            duration: 200,
            onComplete: () => plat.enemy?.destroy(),
          });
          plat.enemy = undefined;
          this.velocityY = -7; // bounce
          this.isOnGround = false;
          this.coinsCollected += 2; // bonus for stomping
          SoundFX.playBetTick();
        } else {
          this.die();
          return;
        }
      }

      // Pipe collision (side hit = die)
      if (plat.pipe && plat.pipe.active && this.checkOverlap(this.runner, plat.pipe, 12)) {
        if (this.runner.y < plat.pipe.y + 5 && this.velocityY >= 0) {
          // Land on top of pipe
          this.runner.y = plat.pipe.y;
          this.isOnGround = true;
          this.isJumping = false;
          this.velocityY = 0;
        } else {
          this.die();
          return;
        }
      }

      // Question block hit (from below)
      if (plat.qblock && plat.qblock.active && this.checkOverlap(this.runner, plat.qblock, 16)) {
        if (this.velocityY < 0) {
          // Bump animation
          this.tweens.add({
            targets: plat.qblock,
            y: plat.qblock.y - 8,
            duration: 100,
            yoyo: true,
          });
          plat.qblock.setTint(0x888888);
          this.coinsCollected += 3;
          SoundFX.playCashOut();
          // Spawn coin burst
          const burstCoin = this.add.image(plat.qblock.x, plat.qblock.y - 15, 'coin').setScale(1.5);
          this.tweens.add({
            targets: burstCoin,
            y: burstCoin.y - 40,
            alpha: 0,
            duration: 500,
            onComplete: () => burstCoin.destroy(),
          });
          plat.qblock = undefined; // Can only hit once
          this.velocityY = 2; // bounce down
        }
      }

      // Mushroom power-up
      if (plat.mushroom && plat.mushroom.active && this.checkOverlap(this.runner, plat.mushroom, 18)) {
        this.coinsCollected += 5;
        this.tweens.add({
          targets: plat.mushroom,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 300,
          onComplete: () => plat.mushroom?.destroy(),
        });
        plat.mushroom = undefined;
        // Brief invincibility flash
        this.tweens.add({
          targets: this.runner,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          repeat: 5,
        });
        SoundFX.playCashOut();
      }
    }

    // Fall death - if below screen
    if (this.runner.y > GAME_CONFIG.HEIGHT) {
      this.die();
      return;
    }

    // Check if runner is in a gap (not on ground, not on platform, and past the initial safe zone)
    if (this.isOnGround && !onPlatform && this.distanceTraveled > 100) {
      // Check if there's ground beneath
      const onGroundTile = this.runner.y >= this.runnerGroundY - 2;
      if (!onGroundTile) {
        this.isOnGround = false;
      }
    }

    // Scroll everything left
    this.scrollWorld(speed);

    // Run animation
    if (this.isOnGround && !this.isDead) {
      this.runTimer += delta;
      if (this.runTimer > 150) {
        this.runTimer = 0;
        this.runFrame = (this.runFrame + 1) % 2;
        // Simple bobbing for run animation
        this.runner.setFlipX(this.runFrame === 1);
      }
    }

    // Spawn new platforms as needed
    const rightEdge = this.scrollX + GAME_CONFIG.WIDTH + 200;
    while (this.nextPlatformX < rightEdge) {
      this.spawnPlatform();
    }
  }

  private scrollWorld(speed: number): void {
    // Move platforms
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const plat = this.platforms[i];
      plat.sprite.x -= speed;
      plat.x -= speed;
      plat.coins.forEach(c => { if (c.active) c.x -= speed; });
      if (plat.enemy?.active) plat.enemy.x -= speed;
      if (plat.pipe?.active) plat.pipe.x -= speed;
      if (plat.qblock?.active) plat.qblock.x -= speed;
      if (plat.flag?.active) plat.flag.x -= speed;
      if (plat.mushroom?.active) plat.mushroom.x -= speed;

      // Remove off-screen platforms
      if (plat.sprite.x + plat.width < -50) {
        plat.sprite.destroy();
        plat.coins.forEach(c => c.destroy());
        plat.enemy?.destroy();
        plat.pipe?.destroy();
        plat.qblock?.destroy();
        plat.flag?.destroy();
        plat.mushroom?.destroy();
        this.platforms.splice(i, 1);
      }
    }

    // Move ground tiles - create gap illusion after initial zone
    for (const tile of this.groundTiles) {
      tile.x -= speed;
    }

    // Remove ground tiles that pass and add new ones
    // After distance > 100, start creating gaps in ground
    if (this.distanceTraveled > 100) {
      for (let i = this.groundTiles.length - 1; i >= 0; i--) {
        if (this.groundTiles[i].x < -64) {
          this.groundTiles[i].destroy();
          this.groundTiles.splice(i, 1);
        }
      }
      // Don't add new ground tiles = gap appears!
    } else {
      // Keep ground continuous initially
      for (let i = this.groundTiles.length - 1; i >= 0; i--) {
        if (this.groundTiles[i].x < -64) {
          this.groundTiles[i].x += (this.groundTiles.length) * 64;
        }
      }
    }

    // Move clouds (parallax - slower)
    for (const cloud of this.clouds) {
      cloud.x -= speed * 0.3;
      if (cloud.x < -70) {
        cloud.x = GAME_CONFIG.WIDTH + 70;
        cloud.y = Phaser.Math.Between(30, 150);
      }
    }
  }

  private checkOverlap(a: Phaser.GameObjects.Image, b: Phaser.GameObjects.Image, threshold: number): boolean {
    return Math.abs(a.x - b.x) < threshold && Math.abs(a.y - b.y) < threshold;
  }

  private drawDistanceBar(): void {
    this.distanceBar.clear();
    const w = GAME_CONFIG.WIDTH - 30;
    const x = 15;
    const y = 48;
    const h = 6;

    // Background
    this.distanceBar.fillStyle(0x333333, 0.5);
    this.distanceBar.fillRoundedRect(x, y, w, h, 3);

    // Progress (wraps every 500 distance for milestone feeling)
    const progress = Math.min((this.distanceTraveled % 500) / 500, 1);
    const barColor = this.currentMultiplier >= 3 ? 0xff4757 : this.currentMultiplier >= 2 ? 0xffd700 : 0x4ecdc4;
    this.distanceBar.fillStyle(barColor);
    this.distanceBar.fillRoundedRect(x, y, w * progress, h, 3);
  }
}
