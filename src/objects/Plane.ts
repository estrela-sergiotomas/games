import Phaser from 'phaser';

export class Plane {
  private plane: Phaser.GameObjects.Image;
  private propeller: Phaser.GameObjects.Image;
  private flame: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private propTween?: Phaser.Tweens.Tween;
  private flameTween?: Phaser.Tweens.Tween;
  private bobTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Flame (behind plane)
    this.flame = scene.add.image(x - 48, y, 'flame')
      .setOrigin(1, 0.5)
      .setAlpha(0);

    // Main plane
    this.plane = scene.add.image(x, y, 'plane').setOrigin(0.5);

    // Propeller on nose
    this.propeller = scene.add.image(x + 28, y, 'propeller')
      .setOrigin(0.5)
      .setAlpha(0);
  }

  get x(): number { return this.plane.x; }
  get y(): number { return this.plane.y; }

  setPosition(x: number, y: number): void {
    this.plane.setPosition(x, y);
    this.propeller.setPosition(x + 28, y);
    this.flame.setPosition(x - 30, y);
  }

  startFlying(): void {
    this.propeller.setAlpha(1);
    this.flame.setAlpha(0.8);

    // Spin propeller
    this.propTween = this.scene.tweens.add({
      targets: this.propeller,
      scaleX: { from: 1, to: 0.2 },
      duration: 80,
      yoyo: true,
      repeat: -1,
    });

    // Flicker flame
    this.flameTween = this.scene.tweens.add({
      targets: this.flame,
      scaleX: { from: 0.8, to: 1.3 },
      scaleY: { from: 0.8, to: 1.2 },
      alpha: { from: 0.6, to: 1 },
      duration: 100,
      yoyo: true,
      repeat: -1,
    });

    // Slight bobbing
    this.bobTween = this.scene.tweens.add({
      targets: [this.plane, this.propeller, this.flame],
      y: '-=3',
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopFlying(): void {
    this.propTween?.stop();
    this.flameTween?.stop();
    this.bobTween?.stop();
    this.propeller.setAlpha(0);
    this.flame.setAlpha(0);
  }

  explode(): void {
    this.stopFlying();
    this.plane.setAlpha(0);

    const exp = this.scene.add.image(this.plane.x, this.plane.y, 'explosion').setScale(0.5);
    this.scene.tweens.add({
      targets: exp,
      scale: 3,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => exp.destroy(),
    });

    // Particles
    const particles = this.scene.add.particles(this.plane.x, this.plane.y, 'particle', {
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      tint: [0xff4757, 0xff6600, 0xffd700],
      quantity: 20,
      duration: 100,
    });

    this.scene.time.delayedCall(800, () => particles.destroy());
  }

  reset(x: number, y: number): void {
    this.plane.setAlpha(1);
    this.setPosition(x, y);
  }

  setVisible(visible: boolean): void {
    this.plane.setVisible(visible);
    this.propeller.setVisible(visible);
    this.flame.setVisible(visible);
  }
}
