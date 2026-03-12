# ui/ - Componentes de Interface

Paineis e elementos de UI do jogo.

- `CrashUI.ts` - Interface principal do CrashScene. Contem: display do multiplicador, saldo, status, botoes (jogar, cashout, stats, settings, menu), controle de aposta (+/-), historico de crashes. Callbacks: onPlay, onCashOut, onOpenStats, onOpenSettings.
- `StatsPanel.ts` - Painel modal de estatisticas. Mostra: rodadas, win rate, lucro total, maior ganho/perda, melhor multiplicador, sequencias, distribuicao de crashes (grafico de barras), historico completo.
- `SettingsPanel.ts` - Painel modal de configuracoes. Permite ajustar: RTP (house edge), chance de crash instantaneo, velocidade do multiplicador, saldo inicial. Tem botao resetar e aplicar.

## Padrao
Cada painel e uma classe independente que recebe a Scene no construtor. Usa container Phaser para agrupar elementos. Overlay escuro fecha ao clicar fora.
