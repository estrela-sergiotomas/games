import Phaser from 'phaser';
import { GAME_CONFIG } from '../utils/constants';
import { GameState } from '../utils/GameState';
import { SoundFX } from '../assets/sfx';
import { RunnerSettings } from '../utils/RunnerSettings';
import {
  contactShapeDef, sensorShapeDef, platformShapeDef,
  pxFrameToMs, toB2Pos, WORLD_SCALE,
  type PhysicsUserData, type EntityKind,
} from '../utils/RunnerPhysics';

import {
  SetWorldScale, CreateWorld, WorldStep, CreateBoxPolygon,
  AddSpriteToWorld, UpdateWorldSprites, RemoveSpriteFromWorld,
  b2Body_SetLinearVelocity, b2Body_GetLinearVelocity,
  b2Body_GetPosition,
  b2Body_GetUserData,
  b2World_GetContactEvents, b2World_GetSensorEvents,
  b2World_SetPreSolveCallback,
  b2Shape_GetBody,
  b2DestroyBody, b2DestroyWorld,
  b2DefaultWorldDef,
  pxm, mpx, b2Vec2, DYNAMIC, KINEMATIC,
} from 'phaser-box2d';

type RunnerPhase = 'betting' | 'tutorial' | 'running' | 'cashout_anim' | 'result';

// Enemy types with different behaviors
const ENEMY_TYPES = [
  'enemy_goomba',   // 1. walks on platform - can stomp (slime 50x28)
  'enemy_koopa',    // 2. walks faster - can stomp (snail 54x31)
  'enemy_spiny',    // 3. walks - CANNOT stomp (fly 72x36)
  'enemy_bobomb',   // 4. walks then explodes (blocker 51x51)
  'enemy_bullet',   // 5. flies horizontally from right (fireball 70x70)
  'enemy_piranha',  // 6. pops up/down from pipes (plant 70x70)
] as const;

// Scale factors for each enemy type to match ~26px display height
const ENEMY_SCALES: Record<string, number> = {
  'enemy_goomba': 0.75,
  'enemy_koopa': 0.65,
  'enemy_spiny': 0.55,
  'enemy_bobomb': 0.50,
  'enemy_bullet': 0.29,
  'enemy_piranha': 0.37,
};

interface EnemyData {
  sprite: Phaser.GameObjects.Image;
  type: string;
  baseY: number;
  dead: boolean;
  bodyId?: any;
}

interface CoinData {
  sprite: Phaser.GameObjects.Image;
  premium: boolean;
  tutorial?: boolean;
  bodyId?: any;
}

interface Segment {
  grounds: Phaser.GameObjects.Image[];
  platforms: { sprite: Phaser.GameObjects.Image; x: number; y: number; w: number; bodyId?: any }[];
  coins: CoinData[];
  enemies: EnemyData[];
  pipes: { sprite: Phaser.GameObjects.Image; piranha?: Phaser.GameObjects.Image; piranhaBaseY?: number; bodyId?: any; topBodyId?: any; piranhaBodyId?: any }[];
  qblocks: { sprite: Phaser.GameObjects.Image; hit: boolean; magic: boolean; bodyId?: any }[];
  mushrooms: (Phaser.GameObjects.Image & { _bodyId?: any })[];
  poisonMushrooms: (Phaser.GameObjects.Image & { _bodyId?: any })[];
  bodyIds: any[];
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
  private isOnGround = true;
  private runnerBaseX = 80;
  private groundY = 0;

  // Box2D
  private worldId: any = null;
  private runnerBodyId: any = null;
  private groundContactCount = 0;

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

  // Variable jump
  private jumpHeld = false;
  private jumpHoldTime = 0;
  private readonly MAX_JUMP_HOLD = 280; // ms max hold for highest jump
  private readonly MIN_JUMP_FORCE_RATIO = 0.45; // min jump = 45% of full

  // Coyote time: grace frames after leaving ground to prevent seam falls
  private coyoteFrames = 0;
  private readonly COYOTE_MAX = 5; // frames of grace after losing ground contact

  // Challenge bonus
  private challengesCompleted = 0;
  private coinMultiplierBonus = 1; // multiplied to coin values after challenge

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

  // Debug telemetry
  private debugText?: Phaser.GameObjects.Text;
  private debugFrameCount = 0;
  private telemetryHistory: any[] = [];

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
    this.jumpHeld = false;
    this.jumpHoldTime = 0;
    this.challengesCompleted = 0;
    this.coinMultiplierBonus = 1;
    this.groundContactCount = 0;
    this.coyoteFrames = 0;

    // Initialize Box2D world
    this.initPhysicsWorld();

    this.createBackground(w, h);
    this.createInitialGround(w);
    this.createRunner();
    this.createUI(w, h);
    this.setupInput();

    // Set up one-way platform pre-solve callback
    this.setupPreSolve();

    // Debug telemetry overlay
    this.debugText = this.add.text(5, 5, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#00ff00',
      backgroundColor: '#000000aa', padding: { x: 4, y: 2 },
    }).setDepth(9999).setScrollFactor(0);
  }

  // === BOX2D WORLD ===
  private initPhysicsWorld(): void {
    SetWorldScale(WORLD_SCALE);
    const worldDef = b2DefaultWorldDef();
    // Original gravity: 0.3 px/frame² at 60fps = 0.3 * 3600 px/s² = 1080 px/s² = 36 m/s²
    const gravityMs2 = pxm(this.GRAVITY * 3600); // convert px/frame² to m/s²
    worldDef.gravity = new b2Vec2(0, -gravityMs2);
    console.log('[INIT] Gravity:', { original: this.GRAVITY, ms2: gravityMs2.toFixed(2) });
    const { worldId } = CreateWorld({ worldDef });
    this.worldId = worldId;
  }

  private setupPreSolve(): void {
    b2World_SetPreSolveCallback(this.worldId, (shapeIdA: any, shapeIdB: any, _manifold: any, _ctx: any) => {
      const bodyA = b2Shape_GetBody(shapeIdA);
      const bodyB = b2Shape_GetBody(shapeIdB);
      const udA = b2Body_GetUserData(bodyA) as PhysicsUserData | null;
      const udB = b2Body_GetUserData(bodyB) as PhysicsUserData | null;

      console.log(`[PRESOLVE] A=${udA?.kind ?? 'null'} B=${udB?.kind ?? 'null'}`);

      const isPlat = udA?.kind === 'platform' || udB?.kind === 'platform';
      if (!isPlat) return true;

      const playerBody = udA?.kind === 'player' ? bodyA : udB?.kind === 'player' ? bodyB : null;
      if (!playerBody) return true;

      const vel = b2Body_GetLinearVelocity(playerBody);
      // Y-up: vel.y > 0 = moving up → pass through platform
      if (vel.y > 0.1) return false;
      return true;
    }, null);
  }

  // === BODY CREATION HELPERS ===
  private createGroundBody(tileX: number, tileY: number, tileW: number, tileH: number): any {
    // Add 4px overlap on each side to prevent falling through segment seams
    const overlap = 4;
    const pos = toB2Pos(tileX + tileW / 2, tileY + tileH / 2);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(tileW / 2 + overlap), pxm(tileH / 2)),
      shapeDef: contactShapeDef(0, 0.5),
      userData: { kind: 'ground' } as PhysicsUserData,
    });
    return bodyId;
  }

  private createPlatformBody(x: number, y: number, w: number, h: number): any {
    const pos = toB2Pos(x + w / 2, y + h / 2);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(w / 2), pxm(h / 2)),
      shapeDef: platformShapeDef(0.5),
      userData: { kind: 'platform' } as PhysicsUserData,
    });
    return bodyId;
  }

  private createSensorBody(x: number, y: number, w: number, h: number, kind: EntityKind, ref?: any): any {
    const pos = toB2Pos(x, y);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(w / 2), pxm(h / 2)),
      shapeDef: sensorShapeDef(),
      userData: { kind, ref } as PhysicsUserData,
    });
    return bodyId;
  }

  private createEnemyBody(x: number, y: number, w: number, h: number, ref: EnemyData): any {
    const pos = toB2Pos(x, y);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(w / 2), pxm(h / 2)),
      shapeDef: contactShapeDef(0, 0),
      userData: { kind: 'enemy', ref } as PhysicsUserData,
    });
    return bodyId;
  }

  private createPipeBody(x: number, y: number, w: number, h: number): { bodyId: any; topBodyId: any } {
    // Main pipe body (side collision = death)
    const pos = toB2Pos(x, y + h / 2);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(w / 2), pxm(h / 2)),
      shapeDef: contactShapeDef(0, 0),
      userData: { kind: 'pipe_body' } as PhysicsUserData,
    });

    // Top of pipe (landable, thin)
    const topPos = toB2Pos(x, y);
    const { bodyId: topBodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(topPos.x, topPos.y),
      size: new b2Vec2(pxm(w / 2 + 2), pxm(2)),
      shapeDef: contactShapeDef(0, 0.5),
      userData: { kind: 'pipe_top' } as PhysicsUserData,
    });

    return { bodyId, topBodyId };
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
      ).setAlpha(0.7).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
      this.clouds.push(cloud);
    }
  }

  // === GROUND ===
  private createInitialGround(w: number): void {
    const seg: Segment = {
      grounds: [],
      platforms: [],
      coins: [],
      enemies: [],
      pipes: [],
      qblocks: [],
      mushrooms: [],
      poisonMushrooms: [],
      bodyIds: [],
      startX: 0,
      endX: w + this.TUTORIAL_SAFE_DISTANCE,
    };

    // Create visual tiles (no physics bodies on individual tiles)
    const tileCount = Math.ceil((seg.endX + 64) / 32);
    for (let i = 0; i < tileCount; i++) {
      const x = i * 32;
      const tile = this.add.image(x, this.groundY, 'ground').setOrigin(0, 0).setDisplaySize(32, 32).setDepth(10);
      seg.grounds.push(tile);
    }

    // Create ONE ground physics body spanning the entire segment (no sprite link)
    const totalWidth = tileCount * 32;
    const groundBodyId = this.createGroundBody(0, this.groundY, totalWidth, 32);
    seg.bodyIds.push(groundBodyId);

    console.log('[TELEMETRY] Initial ground:', {
      tileCount, totalWidth, groundY: this.groundY,
      bodyPos: (() => { const p = b2Body_GetPosition(groundBodyId); return { x: mpx(p.x).toFixed(0), y: (-mpx(p.y)).toFixed(0) }; })(),
    });

    // Tutorial coins (silver, worth 0.001x each)
    for (let i = 0; i < 5; i++) {
      const cx = 250 + i * 40;
      const coin = this.add.image(cx, this.groundY - 20, 'coin_tutorial').setScale(0.30).setDepth(12);
      this.tweens.add({ targets: coin, y: this.groundY - 25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const coinData: CoinData = { sprite: coin, premium: false, tutorial: true };
      const bodyId = this.createSensorBody(cx, this.groundY - 22, 20, 20, 'coin', coinData);
      coinData.bodyId = bodyId;
      AddSpriteToWorld(this.worldId, coin, { bodyId });
      seg.bodyIds.push(bodyId);
      seg.coins.push(coinData);
    }

    this.segments.push(seg);
    this.nextSegmentX = seg.endX;
  }

  // === RUNNER ===
  private createRunner(): void {
    this.runner = this.add.image(this.runnerBaseX, this.groundY, 'runner')
      .setScale(0.52)
      .setOrigin(0.5, 1) // feet at (x, y)
      .setDepth(6);

    // Create dynamic body for runner
    // Body center at groundY - 12 (half-height=12), so body bottom = groundY (touching ground)
    // We offset 2px up to avoid initial overlap bounce
    const pos = toB2Pos(this.runnerBaseX, this.groundY - 14);
    const sd = contactShapeDef(1, 0, 0);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: DYNAMIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(9), pxm(12)), // 18x24 px hitbox
      fixedRotation: true,
      shapeDef: sd,
      userData: { kind: 'player' } as PhysicsUserData,
    });
    this.runnerBodyId = bodyId;
    // Do NOT use AddSpriteToWorld — we sync manually to offset for sprite origin(0.5, 1)

    // Debug: log runner body creation
    const rPos = b2Body_GetPosition(this.runnerBodyId);
    console.log('[TELEMETRY] Runner body created:', {
      phaserXY: { x: this.runnerBaseX, y: this.groundY - 2 },
      b2dPos: { x: rPos.x, y: rPos.y },
      b2dPosPx: { x: mpx(rPos.x), y: -mpx(rPos.y) },
      halfSize: { w: 9, h: 12 },
      groundY: this.groundY,
    });
  }

  // === SEGMENT GENERATION ===
  private generateSegment(): void {
    this.segmentCount++;
    const difficulty = Math.min(this.segmentCount / 30, 1); // 0..1 over 30 segments

    // Segment length - randomized to prevent prediction
    const segLen = Phaser.Math.Between(150, 400) + Phaser.Math.Between(-30, 30);
    const gapMin = RunnerSettings.gapSizeMin;
    const gapMax = RunnerSettings.gapSizeMax;
    const airTime = 2 * Math.abs(this.JUMP_FORCE) / this.GRAVITY;
    const maxJumpable = Math.floor(this.BASE_SPEED * airTime * 0.7);
    const isFirstObstacle = this.segmentCount === 3;
    const instantDeath = isFirstObstacle && Math.random() < RunnerSettings.instantDeathChance;

    let gapBefore: number;
    if (this.segmentCount <= 2) {
      gapBefore = 0;
    } else if (instantDeath) {
      gapBefore = maxJumpable + Phaser.Math.Between(40, 80);
    } else {
      gapBefore = Math.min(maxJumpable, Phaser.Math.Between(
        gapMin,
        gapMax + Math.floor(difficulty * 10)
      ));
    }

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
      bodyIds: [],
      startX: segStartX,
      endX: segEndX,
    };

    // Ground tiles (visual only, no individual physics bodies)
    for (let x = segStartX; x < segEndX; x += 32) {
      const tile = this.add.image(x, this.groundY, 'ground').setOrigin(0, 0).setDisplaySize(32, 32).setDepth(10);
      seg.grounds.push(tile);
    }

    // ONE ground body for the entire segment
    const segWidth = segEndX - segStartX;
    if (segWidth > 0) {
      const groundBodyId = this.createGroundBody(segStartX, this.groundY, segWidth, 32);
      seg.bodyIds.push(groundBodyId);
    }

    // Add a floating platform above the gap (makes gap jumpable) - skip for instant death gaps
    if (gapBefore > 30 && !instantDeath) {
      const platX = segStartX - gapBefore / 2 - 28;
      const platY = this.groundY - Phaser.Math.Between(30, 50);
      const platW = Math.max(64, gapBefore * 0.6);
      const plat = this.add.image(platX, platY, 'platform').setOrigin(0, 0).setDisplaySize(platW, 16).setDepth(9);
      const bodyId = this.createPlatformBody(platX, platY, platW, 16);
      AddSpriteToWorld(this.worldId, plat, { bodyId });
      seg.bodyIds.push(bodyId);
      seg.platforms.push({ sprite: plat, x: platX, y: platY, w: platW, bodyId });

      // Coins above platform
      for (let c = 0; c < 2; c++) {
        const isPremium = Math.random() < RunnerSettings.premiumCoinChance;
        const tex = isPremium ? 'coin_premium' : 'coin';
        const coin = this.add.image(platX + 15 + c * 20, platY - 20, tex).setScale(isPremium ? 0.40 : 0.27).setDepth(12);
        this.tweens.add({ targets: coin, y: platY - 25, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const coinData: CoinData = { sprite: coin, premium: isPremium };
        const cBodyId = this.createSensorBody(platX + 15 + c * 20, platY - 22, 18, 18, 'coin', coinData);
        coinData.bodyId = cBodyId;
        AddSpriteToWorld(this.worldId, coin, { bodyId: cBodyId });
        seg.bodyIds.push(cBodyId);
        seg.coins.push(coinData);
      }
    }

    // Add coins on the ground - only after first obstacle (segment 3+)
    if (this.segmentCount >= 3) {
      const numCoins = Phaser.Math.Between(2, 4);
      for (let c = 0; c < numCoins; c++) {
        const cx = segStartX + Phaser.Math.Between(20, segLen - 20);
        const isPremium = Math.random() < RunnerSettings.premiumCoinChance;
        const tex = isPremium ? 'coin_premium' : 'coin';
        const coin = this.add.image(cx, this.groundY - 20, tex).setScale(isPremium ? 0.40 : 0.27).setDepth(12);
        this.tweens.add({ targets: coin, y: this.groundY - 25, duration: 500 + c * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const coinData: CoinData = { sprite: coin, premium: isPremium };
        const bodyId = this.createSensorBody(cx, this.groundY - 22, 18, 18, 'coin', coinData);
        coinData.bodyId = bodyId;
        AddSpriteToWorld(this.worldId, coin, { bodyId });
        seg.bodyIds.push(bodyId);
        seg.coins.push(coinData);
      }
    }

    // ENEMIES
    if (this.segmentCount >= 3 && Math.random() < RunnerSettings.enemyDensity * (0.5 + difficulty * 0.5)) {
      const maxEnemyType = Math.min(Math.floor(this.segmentCount / 3), 4);
      const typeIdx = Phaser.Math.Between(0, maxEnemyType);
      const enemyType = ENEMY_TYPES[typeIdx];
      const ex = segStartX + Phaser.Math.Between(30, segLen - 30) + Phaser.Math.FloatBetween(-10, 10);
      const ey = this.groundY - 2;

      const sprite = this.add.image(ex, ey, enemyType).setScale(ENEMY_SCALES[enemyType] || 0.5).setOrigin(0.5, 1).setDepth(11);

      const enemyData: EnemyData = { sprite, type: enemyType, baseY: ey, dead: false };

      // Create enemy body
      const bodyId = this.createEnemyBody(ex, ey - 13, 16, 22, enemyData);
      enemyData.bodyId = bodyId;
      AddSpriteToWorld(this.worldId, sprite, { bodyId });
      seg.bodyIds.push(bodyId);

      // Patrol behavior for ground enemies
      if (typeIdx <= 3) {
        const patrolSpeed = typeIdx === 1 ? 2500 : 1800;
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

      seg.enemies.push(enemyData);

      // Bob-omb: add spark flicker
      if (typeIdx === 3) {
        this.tweens.add({ targets: sprite, tint: 0xff4400, duration: 300, yoyo: true, repeat: -1 });
      }
    }

    // PIPES with optional piranha
    if (this.segmentCount >= 5 && Math.random() < 0.3 + difficulty * 0.2) {
      const px = segStartX + Phaser.Math.Between(segLen * 0.4, segLen * 0.8);
      const pipe = this.add.image(px, this.groundY - 36, 'pipe').setScale(1.2).setOrigin(0.5, 0).setDepth(8);
      const pipeData: Segment['pipes'][0] = { sprite: pipe };

      // Create pipe bodies (main body + landable top)
      const pw = 32 * 1.2;
      const ph = 40 * 1.2;
      const { bodyId, topBodyId } = this.createPipeBody(px, this.groundY - 36, pw, ph);
      pipeData.bodyId = bodyId;
      pipeData.topBodyId = topBodyId;
      seg.bodyIds.push(bodyId, topBodyId);
      // Don't AddSpriteToWorld for pipe - position synced via kinematic velocity
      // Actually we should, so UpdateWorldSprites moves it
      AddSpriteToWorld(this.worldId, pipe, { bodyId });

      // Piranha plant pops from pipe
      if (this.segmentCount >= 8 && Math.random() < 0.5) {
        const piranha = this.add.image(px, this.groundY - 60, 'enemy_piranha').setScale(0.37).setOrigin(0.5, 1).setDepth(7);
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

        // Piranha body
        const piranhaBodyId = this.createEnemyBody(px, baseY - 12, 14, 20, { sprite: piranha, type: 'enemy_piranha', baseY, dead: false });
        (b2Body_GetUserData(piranhaBodyId) as PhysicsUserData).kind = 'piranha';
        pipeData.piranhaBodyId = piranhaBodyId;
        AddSpriteToWorld(this.worldId, piranha, { bodyId: piranhaBodyId });
        seg.bodyIds.push(piranhaBodyId);
      }
      seg.pipes.push(pipeData);
    }

    // Question blocks
    if (Math.random() < 0.3) {
      const qx = segStartX + Phaser.Math.Between(30, segLen - 30);
      const qy = this.groundY - Phaser.Math.Between(55, 75);
      const challengeChance = Math.min(0.6,
        RunnerSettings.magicBlockChance + (this.challengesCompleted * 0.05) + Math.pow(1.09, this.segmentCount) * 0.005
      );
      const isMagic = Math.random() < challengeChance;
      const tex = isMagic ? 'magic_block' : 'qblock';
      const qblock = this.add.image(qx, qy, tex).setScale(0.40).setDepth(12);
      if (isMagic) {
        this.tweens.add({ targets: qblock, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 });
      }
      const qData = { sprite: qblock, hit: false, magic: isMagic, bodyId: undefined as any };
      const bodyId = this.createSensorBody(qx, qy, 22, 22, 'qblock', qData);
      qData.bodyId = bodyId;
      AddSpriteToWorld(this.worldId, qblock, { bodyId });
      seg.bodyIds.push(bodyId);
      seg.qblocks.push(qData);
    }

    // Mushroom power-up (rare)
    if (Math.random() < 0.1 && this.segmentCount > 5) {
      const mx = segStartX + Phaser.Math.Between(20, segLen - 20);
      const my = this.groundY - 20;
      const mush = this.add.image(mx, my, 'mushroom').setScale(0.37).setDepth(12) as Phaser.GameObjects.Image & { _bodyId?: any };
      this.tweens.add({ targets: mush, y: my - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const bodyId = this.createSensorBody(mx, my - 4, 18, 18, 'mushroom', mush);
      mush._bodyId = bodyId;
      AddSpriteToWorld(this.worldId, mush, { bodyId });
      seg.bodyIds.push(bodyId);
      seg.mushrooms.push(mush);
    }

    // Poison mushroom
    if (Math.random() < RunnerSettings.poisonMushroomChance && this.segmentCount > 4) {
      const px2 = segStartX + Phaser.Math.Between(20, segLen - 20);
      const py2 = this.groundY - 20;
      const poison = this.add.image(px2, py2, 'mushroom_poison').setScale(0.37).setDepth(12) as Phaser.GameObjects.Image & { _bodyId?: any };
      this.tweens.add({ targets: poison, y: py2 - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const bodyId = this.createSensorBody(px2, py2 - 4, 18, 18, 'poison', poison);
      poison._bodyId = bodyId;
      AddSpriteToWorld(this.worldId, poison, { bodyId });
      seg.bodyIds.push(bodyId);
      seg.poisonMushrooms.push(poison);
    }

    // Elevated platforms on the segment
    if (Math.random() < 0.3 + difficulty * 0.3) {
      const platX = segStartX + Phaser.Math.Between(20, segLen - 80);
      const platY = this.groundY - Phaser.Math.Between(50, 80);
      const platW = Phaser.Math.Between(48, 80);
      const plat = this.add.image(platX, platY, 'platform').setOrigin(0, 0).setDisplaySize(platW, 16).setDepth(9);
      const bodyId = this.createPlatformBody(platX, platY, platW, 16);
      AddSpriteToWorld(this.worldId, plat, { bodyId });
      seg.bodyIds.push(bodyId);
      seg.platforms.push({ sprite: plat, x: platX, y: platY, w: platW, bodyId });

      // Coins on elevated platform
      for (let c = 0; c < 2; c++) {
        const isPremium = Math.random() < RunnerSettings.premiumCoinChance;
        const tex = isPremium ? 'coin_premium' : 'coin';
        const coin = this.add.image(platX + 10 + c * 22, platY - 18, tex).setScale(isPremium ? 0.40 : 0.27).setDepth(12);
        this.tweens.add({ targets: coin, y: platY - 23, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const coinData: CoinData = { sprite: coin, premium: isPremium };
        const cBodyId = this.createSensorBody(platX + 10 + c * 22, platY - 20, 18, 18, 'coin', coinData);
        coinData.bodyId = cBodyId;
        AddSpriteToWorld(this.worldId, coin, { bodyId: cBodyId });
        seg.bodyIds.push(cBodyId);
        seg.coins.push(coinData);
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

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 42, w, h - 82);
    this.betPanel.add(overlay);

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

    const title = this.add.text(w / 2, panelY + 20, 'FACA SUA APOSTA', {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.betPanel.add(title);

    const balLabel = this.add.text(w / 2, panelY + 50, `Saldo: ${GameState.balance.toFixed(0)} coins`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#4ecdc4',
    }).setOrigin(0.5, 0);
    this.betPanel.add(balLabel);

    const betLabel = this.add.text(w / 2, panelY + 80, 'APOSTA', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffcc99',
    }).setOrigin(0.5, 0);
    this.betPanel.add(betLabel);

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

    const quickY = rowY + btnSize + 8;
    [5, 10, 25, 50, 100].forEach((amt, i) => {
      const qw = (panelW - 20) / 5;
      const qBtn = this.makeBtn(panelX + 10 + i * qw + 2, quickY, qw - 4, 26, amt.toString(), 0x6b3e08, () => {
        this.betAmount = amt;
        this.betText.setText(amt.toString());
      }, '12px');
      this.betPanel.add(qBtn);
    });

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
        if (this.phase === 'running' || this.phase === 'tutorial') this.startJump();
      }
    });
    this.input.on('pointerup', () => {
      this.releaseJump();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'running' || this.phase === 'tutorial') this.startJump();
      else if (this.phase === 'betting') this.startRun();
    });
    this.input.keyboard?.on('keyup-SPACE', () => {
      this.releaseJump();
    });

    this.input.keyboard?.on('keydown-UP', () => {
      if (this.phase === 'running' || this.phase === 'tutorial') this.startJump();
    });
    this.input.keyboard?.on('keyup-UP', () => {
      this.releaseJump();
    });
  }

  private startJump(): void {
    if (!this.isOnGround || this.isDead) return;
    this.isOnGround = false;
    this.groundContactCount = 0;
    // Min jump velocity (positive Y = up in Box2D Y-up)
    const jumpVel = pxFrameToMs(Math.abs(this.JUMP_FORCE) * this.MIN_JUMP_FORCE_RATIO);
    b2Body_SetLinearVelocity(this.runnerBodyId, new b2Vec2(0, jumpVel));
    this.jumpHeld = true;
    this.jumpHoldTime = 0;
    this.runner.setTexture('runner_jump');
    SoundFX.playBetTick();
  }

  private releaseJump(): void {
    this.jumpHeld = false;
  }

  private updateJumpHold(delta: number): void {
    if (!this.jumpHeld || this.isOnGround || this.isDead) {
      this.jumpHeld = false;
      return;
    }
    this.jumpHoldTime += delta;
    if (this.jumpHoldTime >= this.MAX_JUMP_HOLD) {
      this.jumpHeld = false;
      return;
    }
    const holdRatio = 1 - (this.jumpHoldTime / this.MAX_JUMP_HOLD);
    const extra = pxFrameToMs(Math.abs(this.JUMP_FORCE) * (1 - this.MIN_JUMP_FORCE_RATIO)
      * holdRatio * (delta / this.MAX_JUMP_HOLD) * 3);
    const vel = b2Body_GetLinearVelocity(this.runnerBodyId);
    const maxVel = pxFrameToMs(Math.abs(this.JUMP_FORCE));
    b2Body_SetLinearVelocity(this.runnerBodyId, new b2Vec2(0, Math.min(vel.y + extra, maxVel)));
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

    this.phase = 'tutorial';
    this.worldSpeed = this.BASE_SPEED;
    this.showTutorial();
  }

  private showTutorial(): void {
    const w = GAME_CONFIG.WIDTH;

    const t1 = this.add.text(w / 2, this.groundY - 110, 'SEGURE para pular\nmais ALTO!', {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
      align: 'center', backgroundColor: '#000000aa',
      padding: { x: 15, y: 10 },
    }).setOrigin(0.5).setDepth(200);
    this.tutorialTexts.push(t1);

    this.tutorialArrow = this.add.text(this.runnerBaseX, this.groundY - 50, '\u2B06', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: this.tutorialArrow, y: this.groundY - 65, duration: 400, yoyo: true, repeat: -1 });

    this.statusText.setText('Aprenda a jogar! Pule para coletar moedas!');
  }

  private endTutorial(): void {
    this.tutorialTexts.forEach(t => t.destroy());
    this.tutorialTexts = [];
    this.tutorialArrow?.destroy();
    this.tutorialArrow = undefined;

    this.phase = 'running';
    this.statusText.setText('Cuidado com os obstaculos! Cash out a qualquer hora!');

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
    this.worldSpeed = 0;

    this.tutorialTexts.forEach(t => t.destroy());
    this.tutorialTexts = [];
    this.tutorialArrow?.destroy();

    const pipeX = this.runner.x + 60;
    this.cashoutPipe = this.add.image(pipeX, this.groundY, 'pipe_large')
      .setScale(1.5)
      .setOrigin(0.5, 1)
      .setDepth(8);

    this.cashoutPipe.y = this.groundY + 80;
    this.tweens.add({
      targets: this.cashoutPipe,
      y: this.groundY,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.runner,
          x: pipeX,
          duration: 600,
          ease: 'Linear',
          onComplete: () => {
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

    this.tweens.add({
      targets: amtText,
      scaleX: 1, scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 15; i++) {
      const coin = this.add.image(w / 2, prizeY, 'coin')
        .setScale(0.35);
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
    const rPos = b2Body_GetPosition(this.runnerBodyId);
    const rVel = b2Body_GetLinearVelocity(this.runnerBodyId);
    console.error('DIE called!', {
      spriteY: this.runner.y, groundY: this.groundY, phase: this.phase,
      groundContacts: this.groundContactCount, frame: this.debugFrameCount,
      b2dPos: { x: mpx(rPos.x).toFixed(1), y: (-mpx(rPos.y)).toFixed(1) },
      b2dVel: { x: rVel.x.toFixed(3), y: rVel.y.toFixed(3) },
    });
    console.log('[DIE] Last 30 telemetry frames:', JSON.stringify(this.telemetryHistory.slice(-30)));
    console.trace('die() stacktrace');
    this.isDead = true;
    this.worldSpeed = 0;

    SoundFX.playExplosion();
    this.multiplierText.setColor('#ff4757');
    this.statusText.setText('Voce morreu! Aposta perdida!');
    this.cashoutBtn.setVisible(false);
    this.setCashoutEnabled(false);

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

    // === BOX2D PHYSICS ===
    this.debugFrameCount++;

    // Collect telemetry every frame into history
    {
      const rPos = b2Body_GetPosition(this.runnerBodyId);
      const rVel = b2Body_GetLinearVelocity(this.runnerBodyId);
      const entry = {
        f: this.debugFrameCount,
        t: (performance.now() / 1000).toFixed(2),
        phase: this.phase,
        rPx: { x: +mpx(rPos.x).toFixed(1), y: +(-mpx(rPos.y)).toFixed(1) },
        rVel: { x: +rVel.x.toFixed(3), y: +rVel.y.toFixed(3) },
        sXY: { x: +this.runner.x.toFixed(1), y: +this.runner.y.toFixed(1) },
        onGnd: this.isOnGround,
        gndCt: this.groundContactCount,
        spd: +this.worldSpeed.toFixed(2),
        scroll: +this.scrollOffset.toFixed(0),
        segs: this.segments.length,
        bodies: this.segments.reduce((s, seg) => s + seg.bodyIds.length, 0),
      };
      this.telemetryHistory.push(entry);
      // Keep last 600 frames (~10s)
      if (this.telemetryHistory.length > 600) this.telemetryHistory.shift();
      // Expose globally for console access
      (window as any).__telemetry = this.telemetryHistory;

      // Log every 30 frames
      if (this.debugFrameCount % 30 === 1) {
        console.log(`[TEL] f=${entry.f} ${entry.phase} pos=(${entry.rPx.x},${entry.rPx.y}) vel=(${entry.rVel.x},${entry.rVel.y}) gnd=${entry.onGnd}/${entry.gndCt} spd=${entry.spd} scroll=${entry.scroll} segs=${entry.segs} bodies=${entry.bodies}`);
      }
    }

    // Update debug overlay
    if (this.debugText) {
      const rPos = b2Body_GetPosition(this.runnerBodyId);
      const rVel = b2Body_GetLinearVelocity(this.runnerBodyId);
      this.debugText.setText([
        `phase: ${this.phase}`,
        `runner sprite: (${this.runner.x.toFixed(0)}, ${this.runner.y.toFixed(0)})`,
        `runner b2d: (${mpx(rPos.x).toFixed(0)}, ${(-mpx(rPos.y)).toFixed(0)})`,
        `runner vel: (${rVel.x.toFixed(2)}, ${rVel.y.toFixed(2)})`,
        `onGround: ${this.isOnGround} contacts: ${this.groundContactCount}`,
        `worldSpeed: ${this.worldSpeed.toFixed(2)}`,
        `segments: ${this.segments.length} bodies: ${this.segments.reduce((s, seg) => s + seg.bodyIds.length, 0)}`,
        `scroll: ${this.scrollOffset.toFixed(0)} dist: ${this.distanceTraveled.toFixed(0)}`,
      ].join('\n'));
    }

    // 1. Jump hold (extra force while button held)
    this.updateJumpHold(delta);

    // 2. Lock runner X velocity + soft cap max jump height
    const vel = b2Body_GetLinearVelocity(this.runnerBodyId);
    const rPos = b2Body_GetPosition(this.runnerBodyId);
    const runnerPhaserY = -mpx(rPos.y);
    // Soft zone starts 200px above ground, hard limit at 280px above ground
    const SOFT_CEILING_Y = this.groundY - 200; // y=350 — start damping
    const HARD_CEILING_Y = this.groundY - 280; // y=270 — full stop
    let clampedVelY = vel.y;
    // On first few frames, suppress any upward bounce from initial body placement
    if (this.debugFrameCount <= 5 && vel.y > 0 && !this.jumpHeld) {
      clampedVelY = 0;
    }
    // Gradually reduce upward velocity as runner approaches ceiling
    if (runnerPhaserY < SOFT_CEILING_Y && clampedVelY > 0) {
      // How deep into the soft zone (0 = just entered, 1 = at hard limit)
      const t = Math.min(1, (SOFT_CEILING_Y - runnerPhaserY) / (SOFT_CEILING_Y - HARD_CEILING_Y));
      // Quadratic falloff: feels like increasing air resistance
      const damping = 1 - t * t;
      clampedVelY *= damping;
      if (t >= 1) this.jumpHeld = false;
    }
    b2Body_SetLinearVelocity(this.runnerBodyId, new b2Vec2(0, clampedVelY));

    // 3. Set kinematic velocities for world scroll
    this.updateKinematicVelocities();

    // 4. Step physics
    WorldStep({ worldId: this.worldId, deltaTime: delta / 1000 });

    // 5. Sync sprites from bodies
    UpdateWorldSprites(this.worldId);

    // 5b. Manual runner sprite sync (body center → sprite feet)
    // BodyToSprite would place sprite center at body center, but we want feet at body bottom
    {
      const rPos = b2Body_GetPosition(this.runnerBodyId);
      this.runner.x = mpx(rPos.x);
      // body center in Phaser Y = -mpx(rPos.y)
      // body bottom in Phaser Y = body_center + half_height = -mpx(rPos.y) + 12
      this.runner.y = -mpx(rPos.y) + 12; // feet at body bottom
    }

    // 6. Process contacts (replaces ALL manual AABB checks)
    this.processContacts();

    // Coyote time: delay losing ground state to bridge seams between segments
    if (this.coyoteFrames > 0) {
      this.coyoteFrames--;
      if (this.coyoteFrames <= 0 && this.groundContactCount <= 0) {
        this.isOnGround = false;
      }
    }

    // Track scroll offset for segment generation
    const speed = this.worldSpeed * dt;
    this.scrollOffset += speed;
    this.distanceTraveled += speed;

    // Multiplier: coin-based only
    this.currentMultiplier = Math.floor(this.currentMultiplier * 100) / 100;

    let mColor = '#ffd700';
    if (this.currentMultiplier >= 5) mColor = '#ff4757';
    else if (this.currentMultiplier >= 3) mColor = '#ff6b6b';
    else if (this.currentMultiplier >= 2) mColor = '#4ecdc4';
    this.multiplierText.setText(`${this.currentMultiplier.toFixed(2)}x`);
    this.multiplierText.setColor(mColor);
    this.coinsText.setText(`Moedas: ${this.coinsCollected}`);

    // Challenge target check
    if (this.challengeActive && this.currentMultiplier >= this.challengeTarget) {
      this.challengeActive = false;
      this.challengesCompleted++;
      this.coinMultiplierBonus = this.challengeTarget;
      this.setCashoutEnabled(true);
      if (this.challengeGoalText) {
        this.challengeGoalText.setText('META ATINGIDA!').setColor('#00ff00');
        this.tweens.add({ targets: this.challengeGoalText, alpha: 0, duration: 3000, onComplete: () => this.challengeGoalText?.destroy() });
      }
      const w = GAME_CONFIG.WIDTH;
      const celebrate = this.add.text(w / 2, this.groundY - 100, 'META ATINGIDA!', {
        fontSize: '24px', fontFamily: 'Arial', color: '#00ff00', fontStyle: 'bold',
        backgroundColor: '#000000cc', padding: { x: 15, y: 8 },
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({ targets: celebrate, alpha: 0, y: celebrate.y - 50, duration: 2000, onComplete: () => celebrate.destroy() });
      const bonusInfo = this.add.text(w / 2, this.groundY - 60, `Moedas agora valem ${(RunnerSettings.multiplierPerCoin * this.coinMultiplierBonus).toFixed(2)}x!`, {
        fontSize: '16px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
        backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({ targets: bonusInfo, alpha: 0, y: bonusInfo.y - 40, duration: 3000, delay: 500, onComplete: () => bonusInfo.destroy() });
      SoundFX.playCashOut();
    }

    if (this.challengeActive && this.challengeGoalText) {
      const progress = Math.min(100, (this.currentMultiplier / this.challengeTarget) * 100);
      this.challengeGoalText.setText(`META: ${this.challengeTarget}x (${progress.toFixed(0)}%)`);
    }

    // Fall death (check runner Y in pixels after sprite sync)
    if (this.runner.y > GAME_CONFIG.HEIGHT + 20) {
      this.die();
      return;
    }

    // Bullet Bill spawning
    if (this.phase === 'running' && this.segmentCount >= 10) {
      this.bulletTimer += delta;
      if (this.bulletTimer > RunnerSettings.bulletInterval - Math.min(this.segmentCount * 100, 3000)) {
        this.bulletTimer = 0;
        this.spawnBullet();
      }
    }

    // Run animation
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

    // Cleanup offscreen segments
    this.cleanupOffscreenSegments();

    // Manual scroll for ground tile sprites (not physics-linked)
    for (const seg of this.segments) {
      for (const g of seg.grounds) {
        g.x -= speed;
      }
    }

    // Cloud parallax (no physics, manual scroll)
    for (const cloud of this.clouds) {
      cloud.x -= speed * 0.3;
      if (cloud.x < -70) {
        cloud.x = GAME_CONFIG.WIDTH + 70;
        cloud.y = Phaser.Math.Between(30, 150);
      }
    }
  }

  // === BOX2D KINEMATIC VELOCITIES ===
  private updateKinematicVelocities(): void {
    const vx = -pxFrameToMs(this.worldSpeed);
    for (const seg of this.segments) {
      for (const bid of seg.bodyIds) {
        b2Body_SetLinearVelocity(bid, new b2Vec2(vx, 0));
      }
    }
    // Bullets move faster
    for (const b of this.bullets) {
      if (b.bodyId) {
        b2Body_SetLinearVelocity(b.bodyId, new b2Vec2(vx - pxFrameToMs(3), 0));
      }
    }
  }

  // === BOX2D CONTACT PROCESSING ===
  private processContacts(): void {
    const contacts = b2World_GetContactEvents(this.worldId);

    if (contacts.beginCount > 0 || contacts.endCount > 0) {
      console.log(`[CONTACTS] f=${this.debugFrameCount} begin=${contacts.beginCount} end=${contacts.endCount} hit=${contacts.hitCount}`);
    }

    // Begin contacts (solid collisions)
    for (let i = 0; i < contacts.beginCount; i++) {
      const evt = contacts.beginEvents[i];
      const bodyA = b2Shape_GetBody(evt.shapeIdA);
      const bodyB = b2Shape_GetBody(evt.shapeIdB);
      const udA = b2Body_GetUserData(bodyA) as PhysicsUserData | null;
      const udB = b2Body_GetUserData(bodyB) as PhysicsUserData | null;
      console.log(`[CONTACT BEGIN] A=${udA?.kind ?? 'null'} B=${udB?.kind ?? 'null'}`);
      if (!udA || !udB) continue;

      const playerUD = udA.kind === 'player' ? udA : udB.kind === 'player' ? udB : null;
      const otherUD = playerUD === udA ? udB : playerUD === udB ? udA : null;
      if (!playerUD || !otherUD) continue;

      switch (otherUD.kind) {
        case 'ground':
        case 'pipe_top':
          this.groundContactCount++;
          this.land();
          break;
        case 'platform':
          this.groundContactCount++;
          this.land();
          break;
        case 'enemy':
          this.handleEnemyContact(otherUD.ref as EnemyData);
          break;
        case 'pipe_body':
        case 'piranha':
        case 'bullet':
          this.die();
          return;
      }
    }

    // End contacts (leaving ground)
    for (let i = 0; i < contacts.endCount; i++) {
      const evt = contacts.endEvents[i];
      const bodyA = b2Shape_GetBody(evt.shapeIdA);
      const bodyB = b2Shape_GetBody(evt.shapeIdB);
      const udA = b2Body_GetUserData(bodyA) as PhysicsUserData | null;
      const udB = b2Body_GetUserData(bodyB) as PhysicsUserData | null;
      if (!udA || !udB) continue;

      const hasPlayer = udA.kind === 'player' || udB.kind === 'player';
      const otherKind = udA.kind === 'player' ? udB.kind : udA.kind;
      if (hasPlayer && (otherKind === 'ground' || otherKind === 'platform' || otherKind === 'pipe_top')) {
        this.groundContactCount--;
        if (this.groundContactCount <= 0) {
          this.groundContactCount = 0;
          // Start coyote time instead of immediately leaving ground
          this.coyoteFrames = this.COYOTE_MAX;
        }
      }
    }

    // Sensor events (coins, mushrooms, qblocks)
    const sensors = b2World_GetSensorEvents(this.worldId);

    if (sensors.beginCount > 0) {
      console.log(`[SENSORS] f=${this.debugFrameCount} begin=${sensors.beginCount} end=${sensors.endCount}`);
    }

    for (let i = 0; i < sensors.beginCount; i++) {
      const evt = sensors.beginEvents[i];
      const sensorBody = b2Shape_GetBody(evt.sensorShapeId);
      const visitorBody = b2Shape_GetBody(evt.visitorShapeId);
      const sensorUD = b2Body_GetUserData(sensorBody) as PhysicsUserData | null;
      const visitorUD = b2Body_GetUserData(visitorBody) as PhysicsUserData | null;
      if (!sensorUD || !visitorUD) continue;

      // One must be player
      const isPlayerVisitor = visitorUD.kind === 'player';
      const isPlayerSensor = sensorUD.kind === 'player';
      if (!isPlayerVisitor && !isPlayerSensor) continue;

      const itemUD = isPlayerVisitor ? sensorUD : visitorUD;

      switch (itemUD.kind) {
        case 'coin':
          this.collectCoin(itemUD.ref as CoinData);
          break;
        case 'qblock':
          this.hitQBlock(itemUD.ref);
          break;
        case 'mushroom':
          this.collectMushroom(itemUD.ref as Phaser.GameObjects.Image);
          break;
        case 'poison':
          this.collectPoisonMushroom(itemUD.ref as Phaser.GameObjects.Image);
          break;
      }
    }
  }

  private handleEnemyContact(enemy: EnemyData): void {
    if (enemy.dead) return;
    const canStomp = enemy.type !== 'enemy_spiny';
    const playerVel = b2Body_GetLinearVelocity(this.runnerBodyId);

    // In Y-up coords: vel.y < 0 = falling down
    if (canStomp && playerVel.y < -0.5) {
      // Stomp!
      enemy.dead = true;
      this.tweens.add({ targets: enemy.sprite, scaleY: 0.2, alpha: 0, duration: 200, onComplete: () => enemy.sprite.destroy() });
      // Bounce up
      const bounceVel = pxFrameToMs(7);
      b2Body_SetLinearVelocity(this.runnerBodyId, new b2Vec2(0, bounceVel));
      this.isOnGround = false;
      this.groundContactCount = 0;
      this.coinsCollected += 2;
      this.currentMultiplier += RunnerSettings.multiplierPerCoin * 2 * this.coinMultiplierBonus;
      SoundFX.playBetTick();
    } else {
      this.die();
    }
  }

  private collectCoin(coinData: CoinData): void {
    if (!coinData.sprite.active) return;
    this.coinsCollected++;

    if (coinData.tutorial) {
      const tutValue = 0.001;
      this.currentMultiplier += tutValue;
      const label = this.add.text(coinData.sprite.x, coinData.sprite.y - 15, `+${tutValue.toFixed(3)}x`, {
        fontSize: '10px', fontFamily: 'Arial', color: '#88ccdd',
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({ targets: label, y: label.y - 35, alpha: 0, duration: 600, onComplete: () => label.destroy() });
    } else if (coinData.premium) {
      const premValue = RunnerSettings.premiumCoinValue * this.coinMultiplierBonus;
      this.currentMultiplier += premValue;
      const label = this.add.text(coinData.sprite.x, coinData.sprite.y - 20, `+${premValue.toFixed(2)}x`, {
        fontSize: '18px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({ targets: label, y: label.y - 50, alpha: 0, duration: 800, onComplete: () => label.destroy() });
    } else {
      const coinValue = RunnerSettings.multiplierPerCoin * this.coinMultiplierBonus;
      this.currentMultiplier += coinValue;
      const label = this.add.text(coinData.sprite.x, coinData.sprite.y - 15, `+${coinValue.toFixed(2)}x`, {
        fontSize: '12px', fontFamily: 'Arial', color: this.coinMultiplierBonus > 1 ? '#ff00ff' : '#ffd700',
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({ targets: label, y: label.y - 35, alpha: 0, duration: 600, onComplete: () => label.destroy() });
    }

    this.tweens.add({ targets: coinData.sprite, y: coinData.sprite.y - 30, alpha: 0, scaleX: 0, duration: 300, onComplete: () => {
      if (coinData.bodyId) {
        RemoveSpriteFromWorld(this.worldId, coinData.sprite, true);
      }
      coinData.sprite.destroy();
    }});
    SoundFX.playCashOut();
  }

  private hitQBlock(qData: any): void {
    if (qData.hit || !qData.sprite.active) return;
    // Only activate from below (player moving up)
    const playerVel = b2Body_GetLinearVelocity(this.runnerBodyId);
    if (playerVel.y <= 0) return; // Must be moving up (positive Y in Box2D Y-up)

    qData.hit = true;
    this.tweens.add({ targets: qData.sprite, y: qData.sprite.y - 8, duration: 100, yoyo: true });
    qData.sprite.setTint(0x888888);

    // Bounce player down
    b2Body_SetLinearVelocity(this.runnerBodyId, new b2Vec2(0, -pxFrameToMs(2)));

    if (qData.magic) {
      SoundFX.playBetTick();
      this.showMagicChallenge();
    } else {
      this.coinsCollected += 3;
      this.currentMultiplier += RunnerSettings.multiplierPerCoin * 3 * this.coinMultiplierBonus;
      SoundFX.playCashOut();
      const burst = this.add.image(qData.sprite.x, qData.sprite.y - 15, 'coin').setScale(0.35);
      this.tweens.add({ targets: burst, y: burst.y - 40, alpha: 0, duration: 500, onComplete: () => burst.destroy() });
    }
  }

  private collectMushroom(mush: Phaser.GameObjects.Image): void {
    if (!mush.active) return;
    this.coinsCollected += 5;
    this.currentMultiplier += RunnerSettings.multiplierPerCoin * 5 * this.coinMultiplierBonus;
    const mushWithBody = mush as Phaser.GameObjects.Image & { _bodyId?: any };
    if (mushWithBody._bodyId) {
      RemoveSpriteFromWorld(this.worldId, mush, true);
    }
    this.tweens.add({ targets: mush, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => mush.destroy() });
    this.tweens.add({ targets: this.runner, alpha: 0.5, duration: 100, yoyo: true, repeat: 5 });
    SoundFX.playCashOut();
  }

  private collectPoisonMushroom(poison: Phaser.GameObjects.Image): void {
    if (!poison.active) return;
    const gained = this.currentMultiplier - 1;
    const loss = gained / 2;
    this.currentMultiplier = Math.max(1, this.currentMultiplier - loss);

    const lossLabel = this.add.text(poison.x, poison.y - 20, `-${loss.toFixed(2)}x`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#ff0000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: lossLabel, y: lossLabel.y - 50, alpha: 0, duration: 1000, onComplete: () => lossLabel.destroy() });
    this.tweens.add({ targets: this.runner, tint: 0x6600aa, duration: 100, yoyo: true, repeat: 5 });
    const poisonWithBody = poison as Phaser.GameObjects.Image & { _bodyId?: any };
    if (poisonWithBody._bodyId) {
      RemoveSpriteFromWorld(this.worldId, poison, true);
    }
    this.tweens.add({ targets: poison, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => poison.destroy() });
    SoundFX.playExplosion();
    this.statusText.setText('Cogumelo podre! Perdeu metade do mult.!');
  }

  // === BULLET BILL ===
  private spawnBullet(): void {
    const by = this.groundY - Phaser.Math.Between(30, 80);
    const bullet = this.add.image(GAME_CONFIG.WIDTH + 20, by, 'enemy_bullet')
      .setScale(0.35).setOrigin(0.5, 1);
    const enemyData: EnemyData = { sprite: bullet, type: 'enemy_bullet', baseY: by, dead: false };

    // Create bullet body
    const pos = toB2Pos(GAME_CONFIG.WIDTH + 20, by - 10);
    const { bodyId } = CreateBoxPolygon({
      worldId: this.worldId,
      type: KINEMATIC,
      position: new b2Vec2(pos.x, pos.y),
      size: new b2Vec2(pxm(10), pxm(8)),
      shapeDef: contactShapeDef(0, 0),
      userData: { kind: 'bullet' } as PhysicsUserData,
    });
    enemyData.bodyId = bodyId;
    AddSpriteToWorld(this.worldId, bullet, { bodyId });

    this.bullets.push(enemyData);

    // Warning flash
    const warn = this.add.text(GAME_CONFIG.WIDTH - 30, by - 10, '!!', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ff0000', fontStyle: 'bold',
    }).setDepth(200);
    this.tweens.add({ targets: warn, alpha: 0, duration: 500, onComplete: () => warn.destroy() });
  }

  // === CLEANUP ===
  private cleanupOffscreenSegments(): void {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      let allOffscreen = true;
      for (const g of seg.grounds) {
        if (g.active && g.x > -100) { allOffscreen = false; break; }
      }
      if (!allOffscreen) {
        // Also check platforms
        for (const p of seg.platforms) {
          if (p.sprite.active && p.sprite.x + p.w > -100) { allOffscreen = false; break; }
        }
      }
      if (!allOffscreen) continue;

      // First: remove all sprites from Box2D world map (prevents UpdateWorldSprites crash)
      // RemoveSpriteFromWorld with destroyBody=true also destroys the body
      const destroyedBodyIds = new Set<number>();
      seg.platforms.forEach(p => { RemoveSpriteFromWorld(this.worldId, p.sprite, true); if (p.bodyId) destroyedBodyIds.add(p.bodyId); p.sprite.destroy(); });
      seg.coins.forEach(c => { RemoveSpriteFromWorld(this.worldId, c.sprite, true); if (c.bodyId) destroyedBodyIds.add(c.bodyId); c.sprite.destroy(); });
      seg.enemies.forEach(e => { RemoveSpriteFromWorld(this.worldId, e.sprite, true); if (e.bodyId) destroyedBodyIds.add(e.bodyId); e.sprite.destroy(); });
      seg.pipes.forEach(p => {
        RemoveSpriteFromWorld(this.worldId, p.sprite, true); if (p.bodyId) destroyedBodyIds.add(p.bodyId); p.sprite.destroy();
        if (p.piranha) { RemoveSpriteFromWorld(this.worldId, p.piranha, true); if (p.piranhaBodyId) destroyedBodyIds.add(p.piranhaBodyId); p.piranha.destroy(); }
        if (p.topBodyId) destroyedBodyIds.add(p.topBodyId);
      });
      seg.qblocks.forEach(q => { RemoveSpriteFromWorld(this.worldId, q.sprite, true); if (q.bodyId) destroyedBodyIds.add(q.bodyId); q.sprite.destroy(); });
      seg.mushrooms.forEach(m => { RemoveSpriteFromWorld(this.worldId, m, true); if ((m as any)._bodyId) destroyedBodyIds.add((m as any)._bodyId); m.destroy(); });
      seg.poisonMushrooms.forEach(m => { RemoveSpriteFromWorld(this.worldId, m, true); if ((m as any)._bodyId) destroyedBodyIds.add((m as any)._bodyId); m.destroy(); });
      // Then: destroy remaining bodies (ground bodies not linked to sprites)
      for (const bid of seg.bodyIds) {
        if (!destroyedBodyIds.has(bid)) {
          try { b2DestroyBody(bid); } catch (_e) { /* already destroyed */ }
        }
      }
      seg.grounds.forEach(g => { g.destroy(); });
      this.segments.splice(i, 1);
    }

    // Cleanup offscreen bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.sprite.x < -50) {
        if (b.bodyId) {
          RemoveSpriteFromWorld(this.worldId, b.sprite, true);
        }
        b.sprite.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  private land(): void {
    this.isOnGround = true;
    this.coyoteFrames = 0; // cancel any pending coyote countdown
    this.runner.setTexture('runner');
  }

  // === MAGIC BLOCK CHALLENGE ===
  private showMagicChallenge(): void {
    this.frozen = true;
    const w = GAME_CONFIG.WIDTH;

    let target: number;
    if (this.currentMultiplier < 2) target = 5;
    else if (this.currentMultiplier < 5) target = 10;
    else if (this.currentMultiplier < 10) target = 20;
    else if (this.currentMultiplier < 20) target = 30;
    else target = Math.ceil(this.currentMultiplier / 10) * 10 + 10;

    const container = this.add.container(0, 0).setDepth(400);
    this.challengeUI = container;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(0, 0, w, GAME_CONFIG.HEIGHT);
    container.add(overlay);

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

    const star = this.add.text(w / 2, py + 30, '\u2605 DESAFIO \u2605', {
      fontSize: '22px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(star);
    this.tweens.add({ targets: star, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });

    const rewardValue = (RunnerSettings.multiplierPerCoin * target).toFixed(2);
    const desc = this.add.text(w / 2, py + 60, `Alcance a meta e suas moedas\npassam a valer ${rewardValue}x cada!`, {
      fontSize: '13px', fontFamily: 'Arial', color: '#ccccff',
      align: 'center',
    }).setOrigin(0.5);
    container.add(desc);

    const targetText = this.add.text(w / 2, py + 110, `${target}x`, {
      fontSize: '48px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(targetText);
    this.tweens.add({ targets: targetText, scaleX: 1.05, scaleY: 1.05, duration: 800, yoyo: true, repeat: -1 });

    const currentInfo = this.add.text(w / 2, py + 150, `Atual: ${this.currentMultiplier.toFixed(2)}x \u2192 Meta: ${target}x`, {
      fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(currentInfo);

    const btnW = (panelW - 30) / 2;
    const btnY = py + panelH - 60;

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
    this.setCashoutEnabled(false);

    const w = GAME_CONFIG.WIDTH;
    this.challengeGoalText = this.add.text(w / 2, 95, `META: ${target}x (0%)`, {
      fontSize: '13px', fontFamily: 'Arial', color: '#ff00ff', fontStyle: 'bold',
      backgroundColor: '#1a0a3ecc', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(100);

    this.statusText.setText(`Desafio aceito! Chegue em ${target}x!`);
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

  shutdown(): void {
    if (this.worldId) {
      b2DestroyWorld(this.worldId);
      this.worldId = null;
    }
  }
}
