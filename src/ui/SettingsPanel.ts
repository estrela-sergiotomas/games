import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants';

export interface GameSettings {
  houseEdge: number;
  instantCrashChance: number;
  multiplierSpeed: number;
  startingBalance: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  houseEdge: GAME_CONFIG.HOUSE_EDGE,
  instantCrashChance: GAME_CONFIG.INSTANT_CRASH_CHANCE,
  multiplierSpeed: GAME_CONFIG.MULTIPLIER_SPEED,
  startingBalance: GAME_CONFIG.INITIAL_BALANCE,
};

export class SettingsPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private isOpen = false;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private valueTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  onSettingsChange?: (settings: GameSettings) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getSettings(): GameSettings { return { ...this.settings }; }

  create(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(101);
    this.container.setVisible(false);
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.render();
      this.container.setVisible(true);
    } else {
      this.container.setVisible(false);
    }
  }

  private render(): void {
    this.container.removeAll(true);
    this.valueTexts.clear();

    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // Overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);
    const overlayHit = this.scene.add.rectangle(w / 2, h / 2, w, h).setInteractive();
    overlayHit.on('pointerdown', () => this.toggle());
    this.container.add([overlay, overlayHit]);

    // Panel - mobile friendly
    const pw = w - 20, ph = 520;
    const px = 10, py = (h - ph) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(COLORS.BG_PANEL);
    panel.fillRoundedRect(px, py, pw, ph, 16);
    panel.lineStyle(1, COLORS.BORDER);
    panel.strokeRoundedRect(px, py, pw, ph, 16);
    this.container.add(panel);

    const panelHit = this.scene.add.rectangle(w / 2, h / 2, pw, ph).setInteractive();
    panelHit.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); });
    this.container.add(panelHit);

    this.addText(w / 2, py + 20, 'CONFIGURACOES', '18px', '#e0e0e0', true);

    const closeBtn = this.scene.add.text(px + pw - 20, py + 10, 'X', {
      fontSize: '18px', fontFamily: 'Arial', color: '#888888', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggle());
    this.container.add(closeBtn);

    let y = py + 55;

    // RTP
    const rtp = ((1 - this.settings.houseEdge) * 100).toFixed(1);
    this.addSetting('RTP (Return to Player)', `${rtp}%`, y, 'rtp',
      () => { this.settings.houseEdge = Math.max(0.01, this.settings.houseEdge + 0.01); this.updateSettingDisplay(); },
      () => { this.settings.houseEdge = Math.min(0.20, this.settings.houseEdge - 0.01); this.updateSettingDisplay(); },
    );
    this.addText(px + 15, y + 48, 'Retorno ao jogador. Menor = mais dificil.', '9px', '#555555', false, 0);
    y += 75;

    // Instant crash
    const icc = (this.settings.instantCrashChance * 100).toFixed(1);
    this.addSetting('Crash Instantaneo', `${icc}%`, y, 'instantCrash',
      () => { this.settings.instantCrashChance = Math.min(0.20, this.settings.instantCrashChance + 0.01); this.updateSettingDisplay(); },
      () => { this.settings.instantCrashChance = Math.max(0.00, this.settings.instantCrashChance - 0.01); this.updateSettingDisplay(); },
    );
    this.addText(px + 15, y + 48, 'Chance de crashar em 1.00x.', '9px', '#555555', false, 0);
    y += 75;

    // Speed
    this.addSetting('Velocidade', this.settings.multiplierSpeed.toFixed(2), y, 'speed',
      () => { this.settings.multiplierSpeed = Math.min(0.50, this.settings.multiplierSpeed + 0.01); this.updateSettingDisplay(); },
      () => { this.settings.multiplierSpeed = Math.max(0.05, this.settings.multiplierSpeed - 0.01); this.updateSettingDisplay(); },
    );
    this.addText(px + 15, y + 48, 'Velocidade do multiplicador.', '9px', '#555555', false, 0);
    y += 75;

    // Balance
    this.addSetting('Saldo Inicial', this.settings.startingBalance.toString(), y, 'balance',
      () => { this.settings.startingBalance = Math.min(100000, this.settings.startingBalance + 500); this.updateSettingDisplay(); },
      () => { this.settings.startingBalance = Math.max(100, this.settings.startingBalance - 500); this.updateSettingDisplay(); },
    );
    y += 80;

    // Buttons
    const btnW = (pw - 30) / 2;
    this.createSmallButton(px + 5, y, btnW, 40, 'RESETAR', 0xff4757, () => {
      this.settings = { ...DEFAULT_SETTINGS };
      this.updateSettingDisplay();
    });
    this.createSmallButton(px + btnW + 15, y, btnW, 40, 'APLICAR', COLORS.CYAN, () => {
      this.onSettingsChange?.(this.getSettings());
      this.toggle();
    });
  }

  private addSetting(label: string, value: string, y: number, key: string, onUp: () => void, onDown: () => void): void {
    const w = GAME_CONFIG.WIDTH;

    this.addText(20, y, label, '13px', '#cccccc', false, 0);

    // Row: [-] [value] [+]
    const rowY = y + 22;
    this.createSmallButton(w / 2 - 80, rowY, 38, 34, '-', COLORS.BORDER, onDown);

    const valueText = this.addText(w / 2, rowY + 17, value, '18px', '#4ecdc4', true);
    this.valueTexts.set(key, valueText);

    this.createSmallButton(w / 2 + 42, rowY, 38, 34, '+', COLORS.BORDER, onUp);
  }

  private updateSettingDisplay(): void {
    const rtp = this.valueTexts.get('rtp');
    if (rtp) rtp.setText(`${((1 - this.settings.houseEdge) * 100).toFixed(1)}%`);
    const ic = this.valueTexts.get('instantCrash');
    if (ic) ic.setText(`${(this.settings.instantCrashChance * 100).toFixed(1)}%`);
    const speed = this.valueTexts.get('speed');
    if (speed) speed.setText(this.settings.multiplierSpeed.toFixed(2));
    const bal = this.valueTexts.get('balance');
    if (bal) bal.setText(this.settings.startingBalance.toString());
  }

  private createSmallButton(x: number, y: number, bw: number, bh: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.scene.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(0, 0, bw, bh, 6);
    const text = this.scene.add.text(bw / 2, bh / 2, label, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hitArea = this.scene.add.rectangle(bw / 2, bh / 2, bw, bh).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', onClick);
    const container = this.scene.add.container(x, y, [bg, text, hitArea]);
    this.container.add(container);
    return container;
  }

  private addText(x: number, y: number, text: string, size: string, color: string, bold = false, originX = 0.5): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size, fontFamily: 'Arial', color, fontStyle: bold ? 'bold' : 'normal',
    }).setOrigin(originX, 0);
    this.container.add(t);
    return t;
  }
}
