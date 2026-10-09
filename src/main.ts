import { Game } from './core/Game';
import { SAVE_KEYS } from './meta/Save';
import { createPlatform } from './platform';

async function boot(): Promise<void> {
  const host = document.getElementById('app')!;
  // Dev character lineup for model reviews (?lineup).
  if (new URLSearchParams(location.search).has('lineup')) {
    (await import('./render/Lineup')).startLineup(host);
    return;
  }
  // Native plugins on iOS/Android, web mocks in the browser.
  const platform = await createPlatform(host, SAVE_KEYS);
  const game = new Game(host, platform);
  game.start();
  // Debug handle for headless checks: open with ?debug.
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __wr: Game }).__wr = game;
  }
}

void boot();
