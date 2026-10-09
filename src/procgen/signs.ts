import * as THREE from 'three';
import { applyCurvedWorld } from '../render/ToonMaterial';
import { hex } from '../render/Sky';

/** One sign in an atlas: lettering, colours and an optional neon glow. */
export interface SignSpec {
  text: string;
  fg: number;
  bg: number;
  /** Neon: glowing letters on a dark panel. */
  glow?: boolean;
  /** Vertical lettering (Japanese tategaki signs). */
  vertical?: boolean;
}

const CELL_W = 256;
const CELL_H = 96;

/**
 * Sign lettering atlas (one canvas, one texture, every sign a cell). Drawn once with the system
 * fallback, then redrawn as soon as the subset web font (Noto Sans JP / Georgian) has loaded.
 */
export function signAtlas(signs: readonly SignSpec[], family: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = CELL_W;
  c.height = CELL_H * signs.length;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = () => {
    const g = c.getContext('2d')!;
    signs.forEach((s, i) => {
      const y = i * CELL_H;
      g.fillStyle = hex(s.bg);
      g.fillRect(0, y, CELL_W, CELL_H);
      g.strokeStyle = s.glow ? hex(s.fg) : '#2a201c';
      g.lineWidth = 6;
      g.strokeRect(5, y + 5, CELL_W - 10, CELL_H - 10);
      g.fillStyle = hex(s.fg);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const size = s.vertical ? 30 : Math.min(64, Math.floor((CELL_W - 30) / Math.max(1, [...s.text].length) / 0.95));
      g.font = `700 ${size}px "${family}", sans-serif`;
      if (s.glow) {
        g.shadowColor = hex(s.fg);
        g.shadowBlur = 18;
      }
      if (s.vertical) {
        // Tategaki: characters stacked top to bottom (the cell is rotated on the sign).
        const chars = [...s.text];
        chars.forEach((ch, k) => g.fillText(ch, CELL_W / 2 - ((chars.length - 1) / 2 - k) * 34, y + CELL_H / 2));
      } else g.fillText(s.text, CELL_W / 2, y + CELL_H / 2 + 2);
      g.shadowBlur = 0;
    });
    tex.needsUpdate = true;
  };
  draw();
  const all = signs.map((s) => s.text).join('');
  void document.fonts?.load(`700 48px "${family}"`, all).then(draw, () => undefined);
  return tex;
}

/** A sign board (w x h, facing +z before rotation) whose UVs cover one atlas cell. */
export function signPlane(cell: number, count: number, w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  const v0 = 1 - (cell + 1) / count;
  const v1 = 1 - cell / count;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 : v0);
  return g;
}

/** Unlit atlas material for signs (bright enough to bloom at night). */
export function signMaterial(tex: THREE.Texture): () => THREE.Material {
  let m: THREE.MeshBasicMaterial | null = null;
  return () => {
    if (!m) {
      m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
      applyCurvedWorld(m);
    }
    return m;
  };
}

/** Shared clock for animated screens (Game advances it). */
export const screenUniforms = { uTime: { value: 0 } };

let screenMat: THREE.MeshBasicMaterial | null = null;

/** Giant video screens: abstract animated colour fields (no real ads, no brands). */
export function screenMaterial(): THREE.Material {
  if (screenMat) return screenMat;
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  m.defines = { USE_UV: '' };
  applyCurvedWorld(m);
  const curve = m.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    curve(shader, r);
    shader.uniforms.uTime = screenUniforms.uTime;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
      '#include <opaque_fragment>',
      `vec2 u = vUv;
  float t = uTime;
  vec3 col = 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + u.x * 0.8 + t * 0.12));
  float bars = step(0.5, fract(u.y * 5.0 + t * 0.6));
  float dotp = smoothstep(0.22, 0.18, length(fract(u * vec2(3.0, 2.0) + vec2(t * 0.3, 0.0)) - 0.5));
  outgoingLight = mix(col * (0.75 + 0.25 * bars), vec3(1.0, 0.95, 0.85), dotp * 0.6) * 1.3;
  #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'wrScreen';
  screenMat = m;
  return m;
}
