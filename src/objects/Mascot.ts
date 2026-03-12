import Phaser from 'phaser';

export type MascotMood = 'idle' | 'excited' | 'nervous' | 'happy' | 'sad';

/**
 * Animated aviator pilot mascot that reacts to game state.
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
  private leftArm: Phaser.GameObjects.Graphics;
  private rightArm: Phaser.GameObjects.Graphics;
  private sweatDrops: Phaser.GameObjects.Graphics;
  private stars: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    // === BODY ===
    const body = scene.add.graphics();
    // Jacket
    body.fillStyle(0x8B4513);
    body.fillRoundedRect(-22, 20, 44, 35, 8);
    // Jacket detail
    body.fillStyle(0x6B3410);
    body.fillRoundedRect(-4, 22, 8, 30, 2);
    // Collar
    body.fillStyle(0xD2691E);
    body.fillTriangle(-18, 22, 0, 30, 18, 22);
    this.container.add(body);

    // === ARMS ===
    this.leftArm = scene.add.graphics();
    this.drawArm(this.leftArm, -30, 28, false);
    this.container.add(this.leftArm);

    this.rightArm = scene.add.graphics();
    this.drawArm(this.rightArm, 16, 28, true);
    this.container.add(this.rightArm);

    // === HEAD ===
    this.face = scene.add.graphics();
    // Head circle
    this.face.fillStyle(0xFFD993);
    this.face.fillCircle(0, 0, 24);
    // Aviator helmet
    this.face.fillStyle(0x8B4513);
    this.face.fillEllipse(0, -10, 52, 32);
    // Helmet band
    this.face.fillStyle(0xD2691E);
    this.face.fillRect(-26, -5, 52, 5);
    // Goggles strap
    this.face.fillStyle(0x555555);
    this.face.fillRect(-26, -2, 52, 3);
    // Goggle frames
    this.face.fillStyle(0x444444);
    this.face.fillRoundedRect(-18, -8, 14, 12, 4);
    this.face.fillRoundedRect(4, -8, 14, 12, 4);
    // Goggle lenses
    this.face.fillStyle(0x66ccff, 0.7);
    this.face.fillRoundedRect(-16, -6, 10, 8, 3);
    this.face.fillRoundedRect(6, -6, 10, 8, 3);
    // Goggle shine
    this.face.fillStyle(0xffffff, 0.4);
    this.face.fillCircle(-13, -4, 2);
    this.face.fillCircle(9, -4, 2);
    // Nose
    this.face.fillStyle(0xE8C07A);
    this.face.fillCircle(0, 5, 3);
    // Cheeks
    this.face.fillStyle(0xFFB6C1, 0.3);
    this.face.fillCircle(-14, 8, 5);
    this.face.fillCircle(14, 8, 5);
    this.container.add(this.face);

    // === EYES (separate for animation) ===
    this.leftEye = scene.add.graphics();
    this.rightEye = scene.add.graphics();
    this.container.add(this.leftEye);
    this.container.add(this.rightEye);

    // === MOUTH (separate for expressions) ===
    this.mouth = scene.add.graphics();
    this.container.add(this.mouth);

    // === SWEAT DROPS (for nervous state) ===
    this.sweatDrops = scene.add.graphics();
    this.sweatDrops.setAlpha(0);
    this.container.add(this.sweatDrops);

    // === STARS (for happy state) ===
    this.stars = scene.add.graphics();
    this.stars.setAlpha(0);
    this.container.add(this.stars);

    // === SPEECH BUBBLE ===
    const bubbleBg = scene.add.graphics();
    bubbleBg.fillStyle(0xffffff, 0.9);
    bubbleBg.fillRoundedRect(-60, -30, 120, 28, 10);
    bubbleBg.fillTriangle(0, -2, -6, -4, 6, -4);

    this.speechText = scene.add.text(0, -16, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#333333', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.speechBubble = scene.add.container(0, -40, [bubbleBg, this.speechText]);
    this.speechBubble.setAlpha(0);
    this.container.add(this.speechBubble);

    // Initial state
    this.setMood('idle');
    this.startIdleAnimation();
  }

  private drawArm(gfx: Phaser.GameObjects.Graphics, x: number, y: number, isRight: boolean): void {
    gfx.clear();
    gfx.fillStyle(0x8B4513);
    gfx.fillRoundedRect(x, y, 14, 24, 4);
    // Hand
    gfx.fillStyle(0xFFD993);
    gfx.fillCircle(x + 7, y + 26, 5);
  }

  private drawEyes(mood: MascotMood): void {
    this.leftEye.clear();
    this.rightEye.clear();

    switch (mood) {
      case 'idle':
      case 'excited':
        // Normal round eyes
        this.leftEye.fillStyle(0x333333);
        this.leftEye.fillCircle(-9, 8, 3);
        this.rightEye.fillStyle(0x333333);
        this.rightEye.fillCircle(9, 8, 3);
        // Pupils shine
        this.leftEye.fillStyle(0xffffff);
        this.leftEye.fillCircle(-8, 7, 1);
        this.rightEye.fillStyle(0xffffff);
        this.rightEye.fillCircle(10, 7, 1);
        break;
      case 'nervous':
        // Wide worried eyes
        this.leftEye.fillStyle(0x333333);
        this.leftEye.fillCircle(-9, 7, 4);
        this.leftEye.fillStyle(0xffffff);
        this.leftEye.fillCircle(-8, 6, 1.5);
        this.rightEye.fillStyle(0x333333);
        this.rightEye.fillCircle(9, 7, 4);
        this.rightEye.fillStyle(0xffffff);
        this.rightEye.fillCircle(10, 6, 1.5);
        break;
      case 'happy':
        // Happy squint ^_^
        this.leftEye.lineStyle(2.5, 0x333333);
        this.leftEye.beginPath();
        this.leftEye.arc(-9, 8, 4, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        this.leftEye.strokePath();
        this.rightEye.lineStyle(2.5, 0x333333);
        this.rightEye.beginPath();
        this.rightEye.arc(9, 8, 4, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        this.rightEye.strokePath();
        break;
      case 'sad':
        // Sad droopy eyes
        this.leftEye.fillStyle(0x333333);
        this.leftEye.fillEllipse(-9, 9, 6, 4);
        this.leftEye.fillStyle(0xffffff);
        this.leftEye.fillCircle(-8, 8, 1);
        this.rightEye.fillStyle(0x333333);
        this.rightEye.fillEllipse(9, 9, 6, 4);
        this.rightEye.fillStyle(0xffffff);
        this.rightEye.fillCircle(10, 8, 1);
        // Tear
        this.leftEye.fillStyle(0x66ccff, 0.7);
        this.leftEye.fillCircle(-14, 13, 2);
        break;
    }
  }

  private drawMouth(mood: MascotMood): void {
    this.mouth.clear();

    switch (mood) {
      case 'idle':
        // Small smile
        this.mouth.lineStyle(2, 0x333333);
        this.mouth.beginPath();
        this.mouth.arc(0, 13, 5, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
        this.mouth.strokePath();
        break;
      case 'excited':
        // Open smile
        this.mouth.fillStyle(0x333333);
        this.mouth.beginPath();
        this.mouth.arc(0, 13, 7, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180));
        this.mouth.fillPath();
        this.mouth.fillStyle(0xff6666);
        this.mouth.fillEllipse(0, 17, 6, 3);
        break;
      case 'nervous':
        // Wavy worried mouth
        this.mouth.lineStyle(2, 0x333333);
        this.mouth.beginPath();
        this.mouth.moveTo(-8, 16);
        this.mouth.lineTo(-4, 14);
        this.mouth.lineTo(0, 17);
        this.mouth.lineTo(4, 14);
        this.mouth.lineTo(8, 16);
        this.mouth.strokePath();
        break;
      case 'happy':
        // Big happy grin
        this.mouth.fillStyle(0x333333);
        this.mouth.beginPath();
        this.mouth.arc(0, 12, 9, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180));
        this.mouth.fillPath();
        this.mouth.fillStyle(0xff6666);
        this.mouth.fillEllipse(0, 17, 8, 4);
        // Teeth
        this.mouth.fillStyle(0xffffff);
        this.mouth.fillRect(-6, 12, 12, 3);
        break;
      case 'sad':
        // Sad frown
        this.mouth.lineStyle(2.5, 0x333333);
        this.mouth.beginPath();
        this.mouth.arc(0, 20, 6, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        this.mouth.strokePath();
        break;
    }
  }

  private drawSweat(): void {
    this.sweatDrops.clear();
    this.sweatDrops.fillStyle(0x66ccff, 0.8);
    this.sweatDrops.fillEllipse(28, -5, 4, 6);
    this.sweatDrops.fillEllipse(30, 5, 3, 5);
  }

  private drawStars(): void {
    this.stars.clear();
    const positions = [[-32, -15], [32, -10], [-28, 10], [30, 15]];
    positions.forEach(([sx, sy]) => {
      this.stars.fillStyle(0xffd700);
      // 4-point star
      this.stars.fillTriangle(sx, sy - 4, sx - 2, sy, sx + 2, sy);
      this.stars.fillTriangle(sx, sy + 4, sx - 2, sy, sx + 2, sy);
      this.stars.fillTriangle(sx - 4, sy, sx, sy - 2, sx, sy + 2);
      this.stars.fillTriangle(sx + 4, sy, sx, sy - 2, sx, sy + 2);
    });
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
        this.scene.tweens.add({ targets: this.sweatDrops, alpha: { from: 0, to: 0.8 }, y: '+=3', duration: 500, yoyo: true, repeat: -1 });
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

  private say(text: string): void {
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
      y: this.container.y - 3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startExcitedAnimation(): void {
    // Bouncing up and down
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 8,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Bounce.easeOut',
    });
    // Arms waving
    this.armTween = this.scene.tweens.add({
      targets: [this.leftArm, this.rightArm],
      y: -8,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
  }

  private startNervousAnimation(): void {
    // Shaking
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + 2,
      duration: 80,
      yoyo: true,
      repeat: -1,
    });
  }

  private startHappyAnimation(): void {
    // Jumping celebration
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 15,
      duration: 400,
      yoyo: true,
      repeat: 4,
      ease: 'Back.easeOut',
    });
    // Arms up
    this.leftArm.clear();
    this.leftArm.fillStyle(0x8B4513);
    this.leftArm.fillRoundedRect(-34, 5, 14, 24, 4);
    this.leftArm.fillStyle(0xFFD993);
    this.leftArm.fillCircle(-27, 3, 5);

    this.rightArm.clear();
    this.rightArm.fillStyle(0x8B4513);
    this.rightArm.fillRoundedRect(20, 5, 14, 24, 4);
    this.rightArm.fillStyle(0xFFD993);
    this.rightArm.fillCircle(27, 3, 5);
  }

  private startSadAnimation(): void {
    // Drooping down
    this.bodyTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 3,
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
