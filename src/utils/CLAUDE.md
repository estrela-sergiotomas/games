# utils/ - Utilitarios e Estado

- `constants.ts` - Constantes globais do jogo. GAME_CONFIG (dimensoes, saldo inicial, house edge, velocidades) e COLORS (paleta de cores em hex para Phaser).
- `GameState.ts` - Singleton que gerencia o estado global: saldo do jogador, historico de rodadas, geracao do crash point (formula provably fair com house edge configuravel). Metodo getStats() retorna estatisticas calculadas.

## Crash Point Formula
```
crashPoint = (1 - houseEdge) / (1 - random)
```
Com chance extra de crash instantaneo (1.00x).
