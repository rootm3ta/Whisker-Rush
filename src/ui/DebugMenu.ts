/**
 * Tiny debug menu (only with ?debug in the URL): a corner button opening a list of sections,
 * each with buttons that force things (ambient events, hazards, bosses, loot...).
 */
export class DebugMenu {
  private panel: HTMLDivElement | null = null;
  private readonly sections = new Map<string, HTMLDivElement>();

  constructor(host: HTMLElement, enabled = new URLSearchParams(location.search).has('debug')) {
    if (!enabled) return;
    const btn = document.createElement('button');
    btn.textContent = 'DBG';
    btn.style.cssText =
      'position:fixed;left:6px;bottom:calc(env(safe-area-inset-bottom) + 6px);z-index:90;font:700 11px monospace;padding:6px 8px;border:2px solid #2a201c;border-radius:8px;background:#fbf6ec;opacity:.75';
    const panel = document.createElement('div');
    panel.className = 'wr-debug';
    panel.hidden = true;
    panel.style.cssText =
      'position:fixed;left:6px;bottom:calc(env(safe-area-inset-bottom) + 44px);z-index:90;max-height:70vh;overflow:auto;width:min(320px,90vw);background:#fbf6ec;border:2px solid #2a201c;border-radius:10px;padding:8px;font:12px monospace;color:#2a201c';
    for (const el of [btn, panel]) {
      for (const ev of ['pointerdown', 'pointerup', 'click'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
    }
    btn.addEventListener('click', () => (panel.hidden = !panel.hidden));
    host.append(btn, panel);
    this.panel = panel;
  }

  /** Adds a button under a section heading. No-op when debug is off. */
  add(section: string, label: string, fn: () => void): void {
    if (!this.panel) return;
    let sec = this.sections.get(section);
    if (!sec) {
      sec = document.createElement('div');
      sec.innerHTML = `<b style="display:block;margin:6px 0 4px">${section}</b>`;
      this.panel.appendChild(sec);
      this.sections.set(section, sec);
    }
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'margin:2px;padding:5px 7px;font:11px monospace;border:1.5px solid #2a201c;border-radius:6px;background:#fff';
    b.addEventListener('click', fn);
    sec.appendChild(b);
  }
}
