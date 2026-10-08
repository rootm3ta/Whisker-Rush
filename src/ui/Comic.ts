import type * as THREE from 'three';
import { COMIC, SPLASH } from '../data/story';
import { buildComicPanels, type Panel } from '../render/ComicScenes';
import { InkPass } from '../render/InkPass';
import { curveUniforms } from '../render/ToonMaterial';
import { RENDER } from '../data/render';
import { ICON, esc } from './Sheet';
import './comic.css';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A wobbly hand-drawn rectangle path (SVG) around a panel. */
function wobblyRect(r: Rect, seed: number): string {
  const j = (i: number) => Math.sin(seed * 13.7 + i * 2.3) * 2.2;
  const pts = [
    [r.x + j(1), r.y + j(2)],
    [r.x + r.w / 2, r.y + j(3)],
    [r.x + r.w + j(4), r.y + j(5)],
    [r.x + r.w + j(6), r.y + r.h / 2],
    [r.x + r.w + j(7), r.y + r.h + j(8)],
    [r.x + r.w / 2, r.y + r.h + j(9)],
    [r.x + j(10), r.y + r.h + j(11)],
    [r.x + j(12), r.y + r.h / 2],
  ];
  return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z`;
}

/**
 * Splash (paw stamp) and the 3-panel intro comic. Panels are Three.js scenes drawn
 * through the ink + paper pass into stacked viewports, with SVG borders and captions on top.
 */
export class Comic {
  private readonly root: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly captions: HTMLElement[] = [];
  private readonly skip: HTMLButtonElement;
  private readonly flash: HTMLElement;
  private readonly splash: HTMLElement;
  private panels: Panel[] | null = null;
  private readonly ink = new InkPass();
  private rects: Rect[] = [];
  private t = 0;
  private splashLeft = 0;
  private running = false;
  private done = false;
  private savedCurve = [0, 0];
  onDone: (() => void) | null = null;

  constructor(private readonly host: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'wr-comic';
    root.hidden = true;
    root.innerHTML = `
      <svg class="wr-comic-borders"></svg>
      ${COMIC.panels.map((p) => `<div class="wr-cap"><b>${esc(p.title)}</b><span>${esc(p.caption)}</span></div>`).join('')}
      <div class="wr-whistle">${esc(COMIC.whistle)}</div>
      <button class="wr-btn wr-skip" hidden>Skip</button>
      <div class="wr-flash"></div>`;
    host.appendChild(root);
    this.root = root;
    this.svg = root.querySelector('svg')!;
    root.querySelectorAll<HTMLElement>('.wr-cap').forEach((c) => this.captions.push(c));
    this.skip = root.querySelector('.wr-skip')!;
    this.flash = root.querySelector('.wr-flash')!;
    for (const ev of ['pointerdown', 'pointerup', 'click'] as const) root.addEventListener(ev, (e) => e.stopPropagation());
    this.skip.addEventListener('click', () => this.finish());

    const splash = document.createElement('div');
    splash.className = 'wr-splash';
    splash.hidden = true;
    splash.innerHTML = `<div class="wr-splash-stamp">${ICON.paw}<span>Whisker Rush</span></div>`;
    host.appendChild(splash);
    this.splash = splash;
  }

  showSplash(): void {
    this.splash.hidden = false;
    this.splashLeft = SPLASH.sec;
  }

  get splashing(): boolean {
    return this.splashLeft > 0;
  }

  /** Counts the splash down; returns true on the frame it ends. */
  updateSplash(dt: number): boolean {
    if (this.splashLeft <= 0) return false;
    this.splashLeft -= dt;
    if (this.splashLeft > 0) return false;
    this.splash.hidden = true;
    return true;
  }

  start(): void {
    this.panels ??= buildComicPanels();
    this.t = 0;
    this.done = false;
    this.running = true;
    this.root.hidden = false;
    this.skip.hidden = true;
    this.flash.classList.remove('on');
    // The comic is a flat page: no curved-world bend.
    this.savedCurve = [curveUniforms.uCurveDown.value, curveUniforms.uCurveSide.value];
    curveUniforms.uCurveDown.value = 0;
    curveUniforms.uCurveSide.value = 0;
    this.layout();
  }

  get active(): boolean {
    return this.running;
  }

  /** Smash cut: white flash, then hand over to the tutorial run. */
  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.flash.classList.add('on');
    window.setTimeout(() => {
      this.running = false;
      this.root.hidden = true;
      curveUniforms.uCurveDown.value = this.savedCurve[0] || RENDER.curveDown;
      curveUniforms.uCurveSide.value = this.savedCurve[1] || RENDER.curveSide;
      this.onDone?.();
    }, COMIC.flashSec * 1000);
  }

  layout(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const m = 14;
    const gap = 12;
    const top = 56;
    const bottom = 70;
    const ph = (h - top - bottom - gap * 2) / 3;
    this.rects = [0, 1, 2].map((i) => ({ x: m, y: top + i * (ph + gap), w: w - m * 2, h: ph }));
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.innerHTML = this.rects
      .map((r, i) => `<path class="wr-border" data-i="${i}" d="${wobblyRect(r, i + 1)}" pathLength="1"/>`)
      .join('');
    this.rects.forEach((r, i) => {
      const c = this.captions[i];
      c.style.left = `${r.x + 8}px`;
      c.style.top = `${r.y + 6}px`;
      c.style.width = `${r.w - 16}px`;
      c.style.height = `${r.h - 12}px`;
    });
    const dpr = Math.min(window.devicePixelRatio, RENDER.maxDpr);
    this.ink.setSize(Math.round(this.rects[0].w * dpr), Math.round(this.rects[0].h * dpr));
    for (const p of this.panels ?? []) {
      p.camera.aspect = this.rects[0].w / this.rects[0].h;
      p.camera.updateProjectionMatrix();
    }
  }

  render(renderer: THREE.WebGLRenderer, dt: number): void {
    if (!this.running || !this.panels) return;
    this.t += dt;
    const t = this.t;
    if (t >= COMIC.skipAfter) this.skip.hidden = false;
    if (t >= COMIC.end) this.finish();
    const h = this.host.clientHeight;
    renderer.setClearColor(COMIC.paper, 1);
    renderer.clear();
    const borders = this.svg.querySelectorAll<SVGPathElement>('.wr-border');
    for (let i = 0; i < 3; i++) {
      const start = COMIC.starts[i];
      const local = t - start;
      const border = borders[i];
      if (local < 0) {
        border.style.strokeDashoffset = '1';
        this.captions[i].classList.remove('on');
        continue;
      }
      border.style.strokeDashoffset = String(Math.max(0, 1 - local / COMIC.borderDrawSec));
      const reveal = Math.min(1, Math.max(0, (local - COMIC.borderDrawSec * 0.6) / 0.5));
      // Panels before the current one keep breathing slowly (parallax), later ones wait.
      const p = this.panels[i];
      p.update(local, dt);
      const r = this.rects[i];
      this.ink.render(renderer, p.scene, p.camera, { x: r.x, y: h - r.y - r.h, w: r.w, h: r.h }, t, reveal);
      this.captions[i].classList.toggle('on', local > COMIC.borderDrawSec + 0.4);
    }
    renderer.setViewport(0, 0, this.host.clientWidth, this.host.clientHeight);
    const whistleT = t - COMIC.starts[2] - 1.6;
    this.root.classList.toggle('wr-whistling', whistleT > 0 && whistleT < 1.4);
  }
}
