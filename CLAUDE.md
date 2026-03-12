# Crash Game - Projeto iGaming

## Visao Geral
Crash game offline estilo Aviator (Spribe) feito com Phaser 3 + TypeScript + Vite.
Jogo de multiplicador onde o jogador aposta e precisa fazer cash out antes do aviao crashar.

## Stack
- **Phaser 3** - Game framework HTML5
- **TypeScript** - Tipagem
- **Vite** - Build tool

## Estrutura
- `src/` - Codigo fonte TypeScript
- `docs/` - Build de producao (GitHub Pages serve daqui)
- `crash.html` - Versao standalone legada (HTML puro)

## Comandos
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de producao para docs/
- `npm run preview` - Preview do build

## Deploy
GitHub Pages configurado para servir da pasta `docs/` na branch atual.
Base path: `/games/`

## Padrao de Projeto
- **Scene Pattern** (Phaser): cada tela e uma Scene independente
- **Singleton State**: GameState gerencia saldo e historico globalmente
- **Component UI**: cada painel de UI e uma classe separada
