# scenes/ - Cenas do Jogo

Cada cena e uma classe que extende `Phaser.Scene`.

- `BootScene.ts` - Primeira cena. Gera todas as texturas programaticamente (aviao, helice, chama, explosao, particulas). Nao tem visual proprio, redireciona para MenuScene.
- `MenuScene.ts` - Tela inicial com titulo, aviao animado flutuando, estrelas no fundo e botao JOGAR.
- `CrashScene.ts` - Cena principal do jogo. Gerencia o loop do multiplicador, grafico da curva, controle de aposta/cashout. Contem referencias ao Plane, CrashUI, StatsPanel e SettingsPanel.

## Ciclo de Vida
- `create()` - Setup inicial (chamado uma vez ao entrar na cena)
- `update()` - Loop do jogo (chamado a cada frame, ~60fps)
