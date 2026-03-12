# src/ - Codigo Fonte

Codigo TypeScript do jogo organizado em subpastas:

- `main.ts` - Entry point. Configura o Phaser Game com todas as scenes.
- `scenes/` - Cenas do jogo (Boot, Menu, Crash)
- `objects/` - Game objects (aviao, sprites)
- `ui/` - Componentes de interface (paineis, botoes)
- `utils/` - Constantes, estado global, helpers
- `assets/` - Assets estaticos (audio, imagens futuras)

## Fluxo das Scenes
BootScene (gera texturas) -> MenuScene (tela inicial) -> CrashScene (jogo)
