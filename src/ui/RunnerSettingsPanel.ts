import Phaser from 'phaser';
import { GAME_CONFIG } from '../utils/constants';
import { RunnerSettings } from '../utils/RunnerSettings';

interface SettingDef {
  label: string;
  key: string;
  get: () => number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  desc: string;
}

export class RunnerSettingsPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private valueTexts = new Map<string, Phaser.GameObjects.Text>();
  private onClose: () => void;
  private scrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;

  private settings: SettingDef[] = [
    { label: 'Gravidade', key: 'gravity', get: () => RunnerSettings.gravity, set: v => RunnerSettings.gravity = v, min: 0.2, max: 1.5, step: 0.1, format: v => v.toFixed(1), desc: 'Forca da gravidade' },
    { label: 'Forca do Pulo', key: 'jump', get: () => RunnerSettings.jumpForce, set: v => RunnerSettings.jumpForce = v, min: -15, max: -5, step: 0.5, format: v => v.toFixed(1), desc: 'Potencia do pulo' },
    { label: 'Velocidade Base', key: 'baseSpeed', get: () => RunnerSettings.baseSpeed, set: v => RunnerSettings.baseSpeed = v, min: 1, max: 5, step: 0.25, format: v => v.toFixed(2), desc: 'Velocidade inicial' },
    { label: 'Velocidade Max', key: 'maxSpeed', get: () => RunnerSettings.maxSpeed, set: v => RunnerSettings.maxSpeed = v, min: 3, max: 10, step: 0.5, format: v => v.toFixed(1), desc: 'Velocidade maxima' },
    { label: 'Limite p/ Acelerar', key: 'speedThreshold', get: () => RunnerSettings.speedThreshold, set: v => RunnerSettings.speedThreshold = v, min: 2, max: 30, step: 1, format: v => v.toFixed(0) + 'x', desc: 'Mult. onde velocidade sobe' },
    { label: 'Mult./Moeda', key: 'multCoin', get: () => RunnerSettings.multiplierPerCoin, set: v => RunnerSettings.multiplierPerCoin = v, min: 0.01, max: 0.5, step: 0.01, format: v => v.toFixed(2), desc: 'Quanto cada moeda sobe o mult.' },
    { label: 'Moeda Premium (+x)', key: 'premiumVal', get: () => RunnerSettings.premiumCoinValue, set: v => RunnerSettings.premiumCoinValue = v, min: 0.5, max: 5, step: 0.5, format: v => '+' + v.toFixed(1) + 'x', desc: 'Valor da moeda premium' },
    { label: '% Moeda Premium', key: 'premiumChance', get: () => RunnerSettings.premiumCoinChance, set: v => RunnerSettings.premiumCoinChance = v, min: 0, max: 0.3, step: 0.02, format: v => (v * 100).toFixed(0) + '%', desc: 'Chance de moeda premium' },
    { label: '% Bloco Magico', key: 'magicChance', get: () => RunnerSettings.magicBlockChance, set: v => RunnerSettings.magicBlockChance = v, min: 0, max: 0.3, step: 0.01, format: v => (v * 100).toFixed(0) + '%', desc: 'Chance de bloco de desafio' },
    { label: '% Cogumelo Podre', key: 'poisonChance', get: () => RunnerSettings.poisonMushroomChance, set: v => RunnerSettings.poisonMushroomChance = v, min: 0, max: 0.3, step: 0.02, format: v => (v * 100).toFixed(0) + '%', desc: 'Perde metade do mult. ganho' },
    { label: 'Densidade Inimigos', key: 'enemyDensity', get: () => RunnerSettings.enemyDensity, set: v => RunnerSettings.enemyDensity = v, min: 0.1, max: 1.5, step: 0.1, format: v => (v * 100).toFixed(0) + '%', desc: 'Frequencia de inimigos' },
    { label: 'Gap Minimo', key: 'gapMin', get: () => RunnerSettings.gapSizeMin, set: v => RunnerSettings.gapSizeMin = v, min: 20, max: 80, step: 5, format: v => v.toFixed(0), desc: 'Tamanho minimo do buraco' },
    { label: 'Gap Maximo', key: 'gapMax', get: () => RunnerSettings.gapSizeMax, set: v => RunnerSettings.gapSizeMax = v, min: 40, max: 120, step: 5, format: v => v.toFixed(0), desc: 'Tamanho maximo do buraco' },
    { label: 'Intervalo Bullet', key: 'bullet', get: () => RunnerSettings.bulletInterval, set: v => RunnerSettings.bulletInterval = v, min: 2000, max: 10000, step: 500, format: v => (v / 1000).toFixed(1) + 's', desc: 'Tempo entre Bullet Bills' },
    { label: 'Distancia Tutorial', key: 'tutorial', get: () => RunnerSettings.tutorialDistance, set: v => RunnerSettings.tutorialDistance = v, min: 200, max: 1500, step: 100, format: v => v.toFixed(0), desc: 'Distancia segura no inicio' },
  ];

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onClose = onClose;
    this.container = scene.add.container(0, 0).setDepth(500);
    this.render();
  }

  private render(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // Overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, w, h);
    const overlayHit = this.scene.add.rectangle(w / 2, h / 2, w, h).setInteractive();
    overlayHit.on('pointerdown', () => this.close());
    this.container.add([overlay, overlayHit]);

    // Panel
    const pw = w - 16, ph = h - 60;
    const px = 8, py = 30;

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1a1a2e);
    panel.fillRoundedRect(px, py, pw, ph, 12);
    panel.lineStyle(1, 0x444444);
    panel.strokeRoundedRect(px, py, pw, ph, 12);
    this.container.add(panel);

    // Block clicks on panel from closing
    const panelHit = this.scene.add.rectangle(w / 2, py + ph / 2, pw, ph).setInteractive();
    panelHit.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    this.container.add(panelHit);

    // Title
    const title = this.scene.add.text(w / 2, py + 15, 'CONFIG COIN RUNNER', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(px + pw - 18, py + 8, 'X', {
      fontSize: '18px', fontFamily: 'Arial', color: '#888', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // Settings content area with mask for scrolling
    const contentY = py + 42;
    const contentH = ph - 100;

    // Create a mask shape
    const maskShape = this.scene.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(px, contentY, pw, contentH);
    const mask = maskShape.createGeometryMask();

    this.contentContainer = this.scene.add.container(0, 0);
    this.contentContainer.setMask(mask);
    this.container.add(this.contentContainer);

    let y = contentY;
    const rowH = 62;

    for (const s of this.settings) {
      // Label
      const lbl = this.scene.add.text(px + 12, y, s.label, {
        fontSize: '12px', fontFamily: 'Arial', color: '#cccccc', fontStyle: 'bold',
      });
      this.contentContainer.add(lbl);

      // Description
      const desc = this.scene.add.text(px + 12, y + 15, s.desc, {
        fontSize: '9px', fontFamily: 'Arial', color: '#666666',
      });
      this.contentContainer.add(desc);

      // Controls: [-] value [+]
      const ctrlY = y + 28;
      this.addCtrlBtn(px + 12, ctrlY, 36, 26, '-', () => {
        s.set(Math.max(s.min, s.get() - s.step));
        this.updateValue(s.key, s);
      });

      const valText = this.scene.add.text(px + 12 + 38 + 50, ctrlY + 13, s.format(s.get()), {
        fontSize: '15px', fontFamily: 'Arial', color: '#4ecdc4', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(valText);
      this.valueTexts.set(s.key, valText);

      this.addCtrlBtn(px + 12 + 38 + 100 + 2, ctrlY, 36, 26, '+', () => {
        s.set(Math.min(s.max, s.get() + s.step));
        this.updateValue(s.key, s);
      });

      y += rowH;
    }

    // Scroll support
    const maxScroll = Math.max(0, y - contentY - contentH);
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, -maxScroll, 0);
      this.contentContainer.y = this.scrollY;
    });

    // Bottom buttons
    const btnY = py + ph - 50;
    const btnW = (pw - 30) / 2;

    this.addBottomBtn(px + 8, btnY, btnW, 38, 'RESETAR', 0xff4757, () => {
      RunnerSettings.reset();
      for (const s of this.settings) {
        this.updateValue(s.key, s);
      }
    });

    this.addBottomBtn(px + 8 + btnW + 10, btnY, btnW, 38, 'APLICAR', 0x00aa00, () => {
      this.close();
    });
  }

  private updateValue(key: string, s: SettingDef): void {
    const t = this.valueTexts.get(key);
    if (t) t.setText(s.format(s.get()));
  }

  private addCtrlBtn(x: number, y: number, bw: number, bh: number, label: string, onClick: () => void): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x333355);
    bg.fillRoundedRect(0, 0, bw, bh, 5);
    const text = this.scene.add.text(bw / 2, bh / 2, label, {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.scene.add.rectangle(bw / 2, bh / 2, bw, bh).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onClick);
    const c = this.scene.add.container(x, y, [bg, text, hit]);
    this.contentContainer.add(c);
  }

  private addBottomBtn(x: number, y: number, bw: number, bh: number, label: string, color: number, onClick: () => void): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(0, 0, bw, bh, 8);
    const text = this.scene.add.text(bw / 2, bh / 2, label, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.scene.add.rectangle(bw / 2, bh / 2, bw, bh).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onClick);
    const c = this.scene.add.container(x, y, [bg, text, hit]);
    this.container.add(c);
  }

  private close(): void {
    this.container.destroy();
    this.onClose();
  }
}
