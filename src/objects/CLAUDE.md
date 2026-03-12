# objects/ - Game Objects

Objetos visuais do jogo.

- `PlaneSprite.ts` - Classe estatica que gera as texturas do aviao programaticamente via Phaser Graphics. Cria: textura do biplano vermelho ('plane'), helice ('propeller'), chama ('flame'), explosao ('explosion'). Chamado no BootScene.
- `Plane.ts` - Classe que encapsula o aviao em jogo. Gerencia posicao, animacao da helice girando, chamas pulsantes, bobbing sutil e explosao com particulas no crash.

## Design do Aviao
Biplano vermelho estilo Aviator (Spribe): corpo vermelho, asas duplas, helice, cockpit com janela, aletas, rodas. Tudo gerado por codigo (sem assets externos de imagem).
