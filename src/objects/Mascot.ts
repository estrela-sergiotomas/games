import Phaser from 'phaser';

export type MascotMood = 'idle' | 'excited' | 'nervous' | 'happy' | 'sad';

/**
 * Animated aviator pilot mascot with 3D-style rendering (Donkey Kong inspired).
 * Uses layered shading, highlights, and thick outlines for depth.
 * Drawn programmatically - no external assets needed.
 */
export class Mascot {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private face: Phaser.GameObjects.Graphics;
  private leftEye: Phaser.GameObjects.Graphics;
  private rightEye: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private speechBubble: Phaser.GameObjects.Container;
  private speechText: Phaser.GameObjects.Text;
  private currentMood: MascotMood = 'idle';
  private bodyTween?: Phaser.Tweens.Tween;
  private armTween?: Phaser.Tweens.Tween;
  private sweatTween?: Phaser.Tweens.Tween;
  private leftArm: Phaser.GameObjects.Graphics;
  private rightArm: Phaser.GameObjects.Graphics;
  private sweatDrops: Phaser.GameObjects.Graphics;
  private stars: Phaser.GameObjects.Graphics;

  // Store original position to prevent drift bug
  private originX: number;
  private originY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.container = scene.add.container(x, y);

    // === BODY (3D style with shading) ===
    const body = scene.add.graphics();
    // Shadow under body
    body.fillStyle(0x000000, 0.2);
    body.fillEllipse(0, 58, 48, 12);
    // Jacket base (dark leather)
    body.fillStyle(0x5C2D0E);
    body.fillRoundedRect(-24, 18, 48, 40, 10);
    // Jacket main color
    body.fillStyle(0x8B4513);
    body.fillRoundedRect(-22, 20, 44, 36, 8);
    // Jacket highlight (3D shine on left shoulder)
    body.fillStyle(0xA0622B, 0.6);
    body.fillRoundedRect(-20, 22, 18, 12, 4);
    // Jacket detail line (zipper)
    body.lineStyle(2, 0x6B3410);
    body.lineBetween(0, 24, 0, 52);
    // Zipper teeth
    body.fillStyle(0xC0C0C0);
    for (let i = 0; i < 5; i++) {
      body.fillRect(-2, 26 + i * 5, 4, 2);
    }
    // Collar (thick, 3D)
    body.fillStyle(0xD2691E);
    body.fillRoundedRect(-20, 18, 40, 8, 3);
    // Collar highlight
    body.fillStyle(0xE8A050, 0.5);
    body.fillRoundedRect(-18, 19, 15, 4, 2);
    this.container.add(body);

    // === ARMS (3D rounded) ===
    this.leftArm = scene.add.graphics();
    this.drawArm(this.leftArm, -32, 26, false);
    this.container.add(this.leftArm);

    this.rightArm = scene.add.graphics();
    this.drawArm(this.rightArm, 16, 26, true);
    this.container.add(this.rightArm);

    // === HEAD (3D with shading layers) ===
    this.face = scene.add.graphics();
    // Head shadow
    this.face.fillStyle(0xC4A060);
    this.face.fillCircle(1, 2, 26);
    // Head base
    this.face.fillStyle(0xFFD993);
    this.face.fillCircle(0, 0, 26);
    // Head highlight (3D top-left shine)
    this.face.fillStyle(0xFFE8B8, 0.7);
    this.face.fillCircle(-8, -8, 14);
    // Head rim light (subtle right side)
    this.face.fillStyle(0xFFEBC4, 0.3);
    this.face.fillEllipse(18, -5, 8, 20);

    // Aviator helmet (3D layered)
    this.face.fillStyle(0x5C2D0E); // shadow
    this.face.fillEllipse(0, -10, 56, 34);
    this.face.fillStyle(0x8B4513); // main
    this.face.fillEllipse(0, -11, 54, 32);
    // Helmet highlight
    this.face.fillStyle(0xA0622B, 0.5);
    this.face.fillEllipse(-8, -16, 24, 12);

    // Ear flaps (3D)
    this.face.fillStyle(0x7B3B13);
    this.face.fillRoundedRect(-30, -4, 8, 16, 3);
    this.face.fillRoundedRect(22, -4, 8, 16, 3);
    this.face.fillStyle(0x8B4513, 0.7);
    this.face.fillRoundedRect(-29, -3, 6, 14, 2);
    this.face.fillRoundedRect(23, -3, 6, 14, 2);

    // Helmet band (thick 3D)
    this.face.fillStyle(0x6B3410);
    this.face.fillRect(-28, -5, 56, 6);
    this.face.fillStyle(0xD2691E);
    this.face.fillRect(-28, -4, 56, 4);
    // Band highlight
    this.face.fillStyle(0xE8A050, 0.4);
    this.face.fillRect(-26, -4, 20, 2);

    // Goggles strap (3D thick)
    this.face.fillStyle(0x444444);
    this.face.fillRect(-28, -2, 56, 4);
    this.face.fillStyle(0x555555);
    this.face.fillRect(-28, -1, 56, 2);

    // Goggle frames (3D beveled)
    this.face.fillStyle(0x333333);
    this.face.fillRoundedRect(-20, -10, 16, 14, 5);
    this.face.fillRoundedRect(4, -10, 16, 14, 5);
    // Goggle inner frame
    this.face.fillStyle(0x555555);
    this.face.fillRoundedRect(-19, -9, 14, 12, 4);
    this.face.fillRoundedRect(5, -9, 14, 12, 4);
    // Goggle bridge
    this.face.fillStyle(0x444444);
    this.face.fillRect(-4, -5, 8, 4);
    // Goggle lenses (gradient look)
    this.face.fillStyle(0x3399cc, 0.8);
    this.face.fillRoundedRect(-17, -7, 10, 8, 3);
    this.face.fillRoundedRect(7, -7, 10, 8, 3);
    this.face.fillStyle(0x66ccff, 0.5);
    this.face.fillRoundedRect(-16, -6, 8, 5, 2);
    this.face.fillRoundedRect(8, -6, 8, 5, 2);
    // Goggle shine (3D specular)
    this.face.fillStyle(0xffffff, 0.7);
    this.face.fillCircle(-14, -5, 2.5);
    this.face.fillCircle(10, -5, 2.5);
    this.face.fillStyle(0xffffff, 0.3);
    this.face.fillCircle(-10, -3, 1.5);
    this.face.fillCircle(14, -3, 1.5);

    // Nose (3D with highlight)
    this.face.fillStyle(0xD4A460);
    this.face.fillCircle(0, 6, 4);
    this.face.fillStyle(0xE8C07A);
    this.face.fillCircle(0, 5, 3.5);
    this.face.fillStyle(0xFFDDA0, 0.5);
    this.face.fillCircle(-1, 4, 1.5);

    // Cheeks (3D rosy glow)
    this.face.fillStyle(0xFFB6C1, 0.4);
    this.face.fillCircle(-15, 9, 6);
    this.face.fillCircle(15, 9, 6);
    this.face.fillStyle(0xFF9999, 0.2);
    this.face.fillCircle(-14, 8, 4);
    this.face.fillCircle(14, 8, 4);

    // Chin definition
    this.face.lineStyle(1, 0xC4A060, 0.3);
    this.face.beginPath();
    this.face.arc(0, 10, 16, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150));
    this.face.strokePath();

    this.container.add(this.face);

    // === EYES (separate for animation) ===
    this.leftEye = scene.add.graphics();
    this.rightEye = scene.add.graphics();
    this.container.add(this.leftEye);
    this.container.add(this.rightEye);

    // === MOUTH (separate for expressions) ===
    this.mouth = scene.add.graphics();
    this.container.add(this.mouth);

    // === SWEAT DROPS ===
    this.sweatDrops = scene.add.graphics();
    this.sweatDrops.setAlpha(0);
    this.container.add(this.sweatDrops);

    // === STARS ===
    this.stars = scene.add.graphics();
    this.stars.setAlpha(0);
    this.container.add(this.stars);

    // === SPEECH BUBBLE (3D style) ===
    const bubbleBg = scene.add.graphics();
    // Shadow
    bubbleBg.fillStyle(0x000000, 0.15);
    bubbleBg.fillRoundedRect(-58, -28, 120, 28, 10);
    // Main bubble
    bubbleBg.fillStyle(0xffffff, 0.95);
    bubbleBg.fillRoundedRect(-60, -30, 120, 28, 10);
    // Bubble highlight
    bubbleBg.fillStyle(0xffffff, 0.4);
    bubbleBg.fillRoundedRect(-55, -28, 50, 8, 4);
    // Tail
    bubbleBg.fillTriangle(0, -2, -6, -4, 6, -4);

    this.speechText = scene.add.text(0, -16, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#333333', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.speechBubble = scene.add.container(0, -42, [bubbleBg, this.speechText]);
    this.speechBubble.setAlpha(0);
    this.container.add(this.speechBubble);

    // Initial state
    this.setMood('idle');
    this.startIdleAnimation();
  }

  private drawArm(gfx: Phaser.GameObjects.Graphics, x: number, y: number, isRight: boolean): void {
    gfx.clear();
    // Arm shadow
    gfx.fillStyle(0x5C2D0E);
    gfx.fillRoundedRect(x - 1, y + 1, 16, 26, 5);
    // Arm main
    gfx.fillStyle(0x8B4513);
    gfx.fillRoundedRect(x, y, 16, 24, 5);
    // Arm highlight
    gfx.fillStyle(0xA0622B, 0.4);
    gfx.fillRoundedRect(x + (isRight ? 2 : 8), y + 2, 6, 10, 3);
    // Glove/hand (3D)
    gfx.fillStyle(0xD4A460);
    gfx.fillCircle(x + 8, y + 27, 6);
    gfx.fillStyle(0xFFD993);
    gfx.fillCircle(x + 8, y + 26, 5.5);
    gfx.fillStyle(0xFFE8B8, 0.5);
    gfx.fillCircle(x + 6, y + 24, 2);
  }

  private drawEyes(mood: MascotMood): void {
    this.leftEye.clear();
    this.rightEye.clear();

    switch (mood) {
      case 'idle':
      case 'excited': {
        // 3D eyes with depth
        // Eye whites
        this.leftEye.fillStyle(0xffffff);
        this.leftEye.fillCircle(-9, 8, 4.5);
        this.rightEye.fillStyle(0xffffff);
        this.rightEye.fillCircle(9, 8, 4.5);
        // Iris
        this.leftEye.fillStyle(0x4a3520);
        this.leftEye.fillCircle(-9, 8, 3);
        this.rightEye.fillStyle(0x4a3520);
        this.rightEye.fillCircle(9, 8, 3);
        // Pupil
        this.leftEye.fillStyle(0x111111);
        this.leftEye.fillCircle(-9, 8, 2);
        this.rightEye.fillStyle(0x111111);
        this.rightEye.fillCircle(9, 8, 2);
        // Specular highlight
        this.leftEye.fillStyle(0xffffff, 0.9);
        this.leftEye.fillCircle(-8, 7, 1.2);
        this.rightEye.fillStyle(0xffffff, 0.9);
        this.rightEye.fillCircle(10, 7, 1.2);
        // Secondary highlight
        this.leftEye.fillStyle(0xffffff, 0.4);
        this.leftEye.fillCircle(-10, 9, 0.8);
        this.rightEye.fillStyle(0xffffff, 0.4);
        this.rightEye.fillCircle(8, 9, 0.8);
        break;
      }
      case 'nervous': {
        // Wide worried eyes (3D)
        this.leftEye.fillStyle(0xffffff);
        this.leftEye.fillCircle(-9, 7, 5.5);
        this.rightEye.fillStyle(0xffffff);
        this.rightEye.fillCircle(9, 7, 5.5);
        // Iris (small, showing whites = scared)
        this.leftEye.fillStyle(0x4a3520);
        this.leftEye.fillCircle(-9, 7, 2.5);
        this.rightEye.fillStyle(0x4a3520);
        this.rightEye.fillCircle(9, 7, 2.5);
        this.leftEye.fillStyle(0x111111);
        this.leftEye.fillCircle(-9, 7, 1.5);
        this.rightEye.fillStyle(0x111111);
        this.rightEye.fillCircle(9, 7, 1.5);
        this.leftEye.fillStyle(0xffffff, 0.9);
        this.leftEye.fillCircle(-8, 6, 1);
        this.rightEye.fillStyle(0xffffff, 0.9);
        this.rightEye.fillCircle(10, 6, 1);
        break;
      }
      case 'happy': {
        // Happy squint ^_^ (3D arcs)
        this.leftEye.lineStyle(3, 0x333333);
        this.leftEye.beginPath();
        this.leftEye.arc(-9, 8, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        this.leftEye.strokePath();
        this.rightEye.lineStyle(3, 0x333333);
        this.rightEye.beginPath();
        this.rightEye.arc(9, 8, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        this.rightEye.strokePath();
        // Small sparkle
        this.leftEye.fillStyle(0xffd700, 0.6);
        this.leftEye.fillCircle(-5, 5, 1.5);
        this.rightEye.fillStyle(0xffd700, 0.6);
        this.rightEye.fillCircle(13, 5, 1.5);
        break;
      }
      case 'sad': {
        // Sad droopy eyes (3D)
        this.leftEye.fillStyle(0xffffff);
        this.leftEye.fillEllipse(-9, 9, 8, 5);
        this.rightEye.fillStyle(0xffffff);
        this.rightEye.fillEllipse(9, 9, 8, 5);
        this.leftEye.fillStyle(0x4a3520);
        this.leftEye.fillCircle(-9, 10, 2);
        this.rightEye.fillStyle(0x4a3520);
        this.rightEye.fillCircle(9, 10, 2);
        this.leftEye.fillStyle(0x111111);
        this.leftEye.fillCircle(-9, 10, 1.2);
        this.rightEye.fillStyle(0x111111);
        this.rightEye.fillCircle(9, 10, 1.2);
        // Sad eyebrows
        this.leftEye.lineStyle(2, 0x6B3410);
        this.leftEye.lineBetween(-14, 4, -5, 6);
        this.rightEye.lineStyle(2, 0x6B3410);
        this.rightEye.lineBetween(5, 6, 14, 4);
        // Tear (3D shiny)
        this.leftEye.fillStyle(0x4499dd, 0.6);
        this.leftEye.fillEllipse(-15, 14, 3, 5);
        this.leftEye.fillStyle(0x88ccff, 0.8);
        this.leftEye.fillEllipse(-15, 13, 2, 3);
        this.leftEye.fillStyle(0xffffff, 0.5);
        this.leftEye.fillCircle(-15, 12, 1);
        break;
      }
    }
  }

  private drawMouth(mood: MascotMood): void {
    this.mouth.clear();

    switch (mood) {
      case 'idle':
        this.mouth.lineStyle(2.5, 0x333333);
        this.mouth.beginPath();
        this.mouth.arc(0, 14, 5, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
        this.mouth.strokePath();
        break;
      case 'excited':
        // Open grin (3D)
        this.mouth.fillStyle(0x222222);
        this.mouth.beginPath();
        this.mouth.arc(0, 14, 8, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180));
        this.mouth.fillPath();
        // Tongue
        this.mouth.fillStyle(0xee5555);
        this.mouth.fillEllipse(0, 19, 7, 4);
        this.mouth.fillStyle(0xff7777, 0.5);
        this.mouth.fillEllipse(-1, 18, 4, 2);
        // Teeth
        this.mouth.fillStyle(0xffffff);
        this.mouth.fillRect(-5, 14, 10, 3);
        break;
      case 'nervous':
        // Wavy worried mouth (3D)
        this.mouth.lineStyle(2.5, 0x333333);
        this.mouth.beginPath();
        this.mouth.moveTo(-9, 17);
        this.mouth.lineTo(-5, 14);
        this.mouth.lineTo(0, 18);
        this.mouth.lineTo(5, 14);
        this.mouth.lineTo(9, 17);
        this.mouth.strokePath();
        break;
      case 'happy':
        // Big grin with teeth (3D)
        this.mouth.fillStyle(0x222222);
        this.mouth.beginPath();
        this.mouth.arc(0, 13, 10, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180));
        this.mouth.fillPath();
        // Tongue
        this.mouth.fillStyle(0xee5555);
        this.mouth.fillEllipse(0, 19, 9, 5);
        this.mouth.fillStyle(0xff7777, 0.5);
        this.mouth.fillEllipse(-2, 18, 4, 3);
        // Teeth row
        this.mouth.fillStyle(0xffffff);
        this.mouth.fillRect(-7, 13, 14, 4);
        // Tooth gaps
        this.mouth.lineStyle(0.5, 0xdddddd);
        for (let i = -5; i <= 5; i += 3.5) {
          this.mouth.lineBetween(i, 13, i, 17);
        }
        break;
      case 'sad':
        // Big frown (3D)
        this.mouth.lineStyle(3, 0x333333);
        this.mouth.beginPath();
        this.mouth.arc(0, 22, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        this.mouth.strokePath();
        break;
    }
  }

  private drawSweat(): void {
    this.sweatDrops.clear();
    // 3D sweat drops
    this.sweatDrops.fillStyle(0x4499dd, 0.6);
    this.sweatDrops.fillEllipse(30, -5, 5, 8);
    this.sweatDrops.fillStyle(0x88ccff, 0.8);
    this.sweatDrops.fillEllipse(30, -6, 3, 5);
    this.sweatDrops.fillStyle(0xffffff, 0.6);
    this.sweatDrops.fillCircle(30, -8, 1.5);

    this.sweatDrops.fillStyle(0x4499dd, 0.5);
    this.sweatDrops.fillEllipse(32, 6, 4, 6);
    this.sweatDrops.fillStyle(0x88ccff, 0.7);
    this.sweatDrops.fillEllipse(32, 5, 2.5, 4);
  }

  private drawStars(): void {
    this.stars.clear();
    const positions = [[-36, -18], [36, -12], [-32, 12], [34, 16]];
    positions.forEach(([sx, sy]) => {
      // 3D star with glow
      this.stars.fillStyle(0xffaa00, 0.4);
      this.stars.fillCircle(sx, sy, 6);
      this.stars.fillStyle(0xffd700);
      this.stars.fillTriangle(sx, sy - 5, sx - 2.5, sy, sx + 2.5, sy);
      this.stars.fillTriangle(sx, sy + 5, sx - 2.5, sy, sx + 2.5, sy);
      this.stars.fillTriangle(sx - 5, sy, sx, sy - 2.5, sx, sy + 2.5);
      this.stars.fillTriangle(sx + 5, sy, sx, sy - 2.5, sx, sy + 2.5);
      // Star highlight
      this.stars.fillStyle(0xffffff, 0.6);
      this.stars.fillCircle(sx - 1, sy - 1, 1.5);
    });
  }

  private resetPosition(): void {
    this.container.setPosition(this.originX, this.originY);
    this.drawArm(this.leftArm, -32, 26, false);
    this.drawArm(this.rightArm, 16, 26, true);
  }

  setMood(mood: MascotMood): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;

    this.drawEyes(mood);
    this.drawMouth(mood);

    // Reset extras
    this.sweatDrops.setAlpha(0);
    this.stars.setAlpha(0);

    // Stop existing tweens
    this.bodyTween?.stop();
    this.armTween?.stop();
    this.sweatTween?.stop();

    // Reset position to prevent drift
    this.resetPosition();

    switch (mood) {
      case 'idle':
        this.startIdleAnimation();
        break;
      case 'excited':
        this.startExcitedAnimation();
        this.say('Vai! Vai! Vai!');
        break;
      case 'nervous':
        this.startNervousAnimation();
        this.drawSweat();
        this.sweatTween = this.scene.tweens.add({ targets: this.sweatDrops, alpha: { from: 0, to: 0.8 }, duration: 500, yoyo: true, repeat: -1 });
        this.say('Cuidado...');
        break;
      case 'happy':
        this.startHappyAnimation();
        this.drawStars();
        this.scene.tweens.add({ targets: this.stars, alpha: { from: 0, to: 1 }, angle: { from: 0, to: 15 }, duration: 300, yoyo: true, repeat: 3 });
        this.say('UHUU! Ganhou!');
        break;
      case 'sad':
        this.startSadAnimation();
        this.say('Que pena...');
        break;
    }
  }

  /** Public method to show custom speech */
  say(text: string): void {
    this.speechText.setText(text);
    this.speechBubble.setAlpha(0);
    this.scene.tweens.add({
      targets: this.speechBubble,
      alpha: 1,
      duration: 200,
    });
    this.scene.time.delayedCall(2500, () => {
      this.scene.tweens.add({
        targets: this.speechBubble,
        alpha: 0,
        duration: 300,
      });
    });
  }

  private startIdleAnimation(): void {
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.originY - 3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startExcitedAnimation(): void {
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.originY - 8,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Bounce.easeOut',
    });
    this.armTween = this.scene.tweens.add({
      targets: [this.leftArm, this.rightArm],
      y: -8,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
  }

  private startNervousAnimation(): void {
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      x: this.originX + 2,
      duration: 80,
      yoyo: true,
      repeat: -1,
    });
  }

  private startHappyAnimation(): void {
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.originY - 15,
      duration: 400,
      yoyo: true,
      repeat: 4,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.container.setPosition(this.originX, this.originY);
      },
    });
    // Arms up (3D)
    this.leftArm.clear();
    this.leftArm.fillStyle(0x5C2D0E);
    this.leftArm.fillRoundedRect(-36, 3, 16, 26, 5);
    this.leftArm.fillStyle(0x8B4513);
    this.leftArm.fillRoundedRect(-35, 2, 16, 24, 5);
    this.leftArm.fillStyle(0xA0622B, 0.4);
    this.leftArm.fillRoundedRect(-33, 4, 6, 10, 3);
    this.leftArm.fillStyle(0xD4A460);
    this.leftArm.fillCircle(-27, 0, 6);
    this.leftArm.fillStyle(0xFFD993);
    this.leftArm.fillCircle(-27, -1, 5.5);

    this.rightArm.clear();
    this.rightArm.fillStyle(0x5C2D0E);
    this.rightArm.fillRoundedRect(20, 3, 16, 26, 5);
    this.rightArm.fillStyle(0x8B4513);
    this.rightArm.fillRoundedRect(21, 2, 16, 24, 5);
    this.rightArm.fillStyle(0xA0622B, 0.4);
    this.rightArm.fillRoundedRect(29, 4, 6, 10, 3);
    this.rightArm.fillStyle(0xD4A460);
    this.rightArm.fillCircle(29, 0, 6);
    this.rightArm.fillStyle(0xFFD993);
    this.rightArm.fillCircle(29, -1, 5.5);
  }

  private startSadAnimation(): void {
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.originY + 3,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }
}
