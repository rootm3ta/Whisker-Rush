import { Game } from './core/Game';

const host = document.getElementById('app')!;
const game = new Game(host);
game.start();

// Debug handle for headless checks: open with ?debug.
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __wr: Game }).__wr = game;
}
