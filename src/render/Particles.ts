import * as THREE from 'three';
import { Rng } from '../core/Rng';
import { PARTICLES } from '../data/fx';
import { curveUniforms } from './ToonMaterial';

const VERT = /* glsl */ `
uniform float uTime;
uniform float uDist;
uniform float uScale;
uniform float uCurveDown;
uniform float uCurveSide;
attribute vec3 aStart;
attribute vec3 aVel;
attribute vec2 aTime;
attribute vec4 aMisc;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vRot;
void main() {
  float age = uTime - aTime.x;
  float k = age / aTime.y;
  if (k < 0.0 || k > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  vec3 p = aStart + aVel * age;
  p.y += 0.5 * aMisc.y * age * age;
  // Scrolling particles live in track space: start.z is the track distance.
  if (aMisc.w > 0.5) p.z = uDist - aStart.z + aVel.z * age;
  if (aMisc.z > 2.5 && aMisc.z < 3.5) p.x += sin(age * 3.0 + aStart.x * 7.0) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float d = max(-mv.z, 0.0);
  mv.y -= uCurveDown * d * d;
  mv.x += uCurveSide * d * d;
  gl_Position = projectionMatrix * mv;
  float shrink = aMisc.z > 3.5 ? 1.0 : 1.0 - 0.45 * k;
  gl_PointSize = aMisc.x * uScale * shrink / max(d, 0.5);
  vColor = aColor;
  vAlpha = 1.0 - k * k;
  vShape = aMisc.z;
  vRot = age * 6.0 + aStart.x * 3.0;
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vRot;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = 0.0;
  if (vShape < 0.5) {
    a = smoothstep(0.5, 0.15, length(c));
  } else if (vShape < 1.5) {
    float ang = atan(c.y, c.x);
    float r = length(c);
    float star = 0.22 + 0.2 * pow(abs(cos(ang * 2.5)), 3.0);
    a = step(r, star);
  } else if (vShape < 2.5) {
    float s = sin(vRot), co = cos(vRot);
    vec2 q = vec2(co * c.x - s * c.y, s * c.x + co * c.y);
    a = step(abs(q.x), 0.32) * step(abs(q.y), 0.2);
  } else if (vShape < 3.5) {
    float s = sin(vRot * 0.5), co = cos(vRot * 0.5);
    vec2 q = vec2(co * c.x - s * c.y, s * c.x + co * c.y);
    a = step(q.x * q.x / 0.18 + q.y * q.y / 0.04, 1.0);
  } else {
    a = step(abs(c.x), 0.05) * smoothstep(0.5, 0.2, abs(c.y));
  }
  if (a * vAlpha < 0.02) discard;
  gl_FragColor = vec4(vColor, a * vAlpha);
  #include <colorspace_fragment>
}`;

const PER = [3, 3, 2, 4, 3] as const;

export interface EmitSpec {
  count: number;
  colors: readonly number[];
  size: readonly [number, number];
  life: readonly [number, number];
  speed?: readonly [number, number];
  up?: number;
  gravity?: number;
}

/**
 * Pooled GPU particles: one Points draw call. CPU writes spawn attributes into a ring
 * buffer (allocation-free); the vertex shader animates, fades, curves and scrolls them.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly start: Float32Array;
  private readonly vel: Float32Array;
  private readonly time: Float32Array;
  private readonly misc: Float32Array;
  private readonly color: Float32Array;
  private readonly attrs: THREE.BufferAttribute[];
  private readonly mat: THREE.ShaderMaterial;
  private readonly rng = new Rng(808);
  private readonly col = new THREE.Color();
  private head = 0;
  private dirtyFrom = -1;
  private dirtyTo = -1;
  private wrapped = false;
  now = 0;

  constructor() {
    const n = PARTICLES.capacity;
    this.start = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.time = new Float32Array(n * 2).fill(-1e6);
    this.misc = new Float32Array(n * 4);
    this.color = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    const mk = (arr: Float32Array, size: number) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.attrs = [mk(this.start, 3), mk(this.vel, 3), mk(this.time, 2), mk(this.misc, 4), mk(this.color, 3)];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aStart', this.attrs[0]);
    g.setAttribute('aVel', this.attrs[1]);
    g.setAttribute('aTime', this.attrs[2]);
    g.setAttribute('aMisc', this.attrs[3]);
    g.setAttribute('aColor', this.attrs[4]);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDist: { value: 0 },
        uScale: { value: 300 },
        uCurveDown: curveUniforms.uCurveDown,
        uCurveSide: curveUniforms.uCurveSide,
      },
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  /** Point size scale: viewport height in device pixels. */
  setViewport(heightPx: number): void {
    this.mat.uniforms.uScale.value = heightPx * 0.9;
  }

  /** Writes one particle. `scroll` particles take `z` as a track distance and move with the world. */
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, gravity: number, shape: number, color: number, scroll: boolean): void {
    const i = this.head;
    this.head = (this.head + 1) % PARTICLES.capacity;
    if (this.head === 0) this.wrapped = true;
    this.start[i * 3] = x;
    this.start[i * 3 + 1] = y;
    this.start[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.time[i * 2] = this.now;
    this.time[i * 2 + 1] = life;
    this.misc[i * 4] = size;
    this.misc[i * 4 + 1] = gravity;
    this.misc[i * 4 + 2] = shape;
    this.misc[i * 4 + 3] = scroll ? 1 : 0;
    this.col.setHex(color);
    this.color[i * 3] = this.col.r;
    this.color[i * 3 + 1] = this.col.g;
    this.color[i * 3 + 2] = this.col.b;
    if (this.dirtyFrom < 0) this.dirtyFrom = i;
    this.dirtyTo = i;
  }

  /** A burst from a preset, flying outward and up. */
  burst(p: EmitSpec, x: number, y: number, z: number, shape: number, scroll: boolean, color = -1): void {
    const r = this.rng;
    const speed = p.speed ?? [0, 0];
    for (let k = 0; k < p.count; k++) {
      const a = r.range(0, Math.PI * 2);
      const v = r.range(speed[0], speed[1]);
      this.spawn(
        x, y, z,
        Math.cos(a) * v, (p.up ?? 0) * r.range(0.4, 1.2), Math.sin(a) * v,
        r.range(p.life[0], p.life[1]), r.range(p.size[0], p.size[1]), p.gravity ?? 0, shape,
        color >= 0 ? color : r.pick(p.colors), scroll,
      );
    }
  }

  get rand(): Rng {
    return this.rng;
  }

  update(dt: number, dist: number): void {
    this.now += dt;
    this.mat.uniforms.uTime.value = this.now;
    this.mat.uniforms.uDist.value = dist;
    if (this.dirtyFrom < 0) return;
    const per = PER;
    for (let a = 0; a < this.attrs.length; a++) {
      const attr = this.attrs[a];
      attr.clearUpdateRanges();
      if (this.wrapped || this.dirtyTo < this.dirtyFrom) attr.addUpdateRange(0, PARTICLES.capacity * per[a]);
      else attr.addUpdateRange(this.dirtyFrom * per[a], (this.dirtyTo - this.dirtyFrom + 1) * per[a]);
      attr.needsUpdate = true;
    }
    this.dirtyFrom = this.dirtyTo = -1;
    this.wrapped = false;
  }
}
