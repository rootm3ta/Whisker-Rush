import * as THREE from 'three';
import { COMIC } from '../data/story';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float near;
uniform float far;
uniform float boil;
uniform float reveal;
uniform vec3 paper;
uniform vec3 ink;
uniform float kDepth;
uniform float kColor;
uniform vec2 threshold;
uniform float wobble;
uniform float levels;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float lin(vec2 uv) {
  float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return (2.0 * near * far) / (far + near - z * (far - near)) / far;
}
float lum(vec2 uv) { return dot(texture2D(tColor, uv).rgb, vec3(0.299, 0.587, 0.114)); }

void main() {
  // Hand-drawn wobble: the sampling grid shifts a little, stepping at the boil rate.
  vec2 j = (vec2(noise(vUv * 40.0 + boil), noise(vUv * 40.0 - boil)) - 0.5) * texel * wobble;
  vec2 uv = vUv + j;
  float gd = 0.0, gc = 0.0;
  float d00 = lin(uv + texel * vec2(-1, -1)), d10 = lin(uv + texel * vec2(0, -1)), d20 = lin(uv + texel * vec2(1, -1));
  float d01 = lin(uv + texel * vec2(-1, 0)), d21 = lin(uv + texel * vec2(1, 0));
  float d02 = lin(uv + texel * vec2(-1, 1)), d12 = lin(uv + texel * vec2(0, 1)), d22 = lin(uv + texel * vec2(1, 1));
  gd = length(vec2(d20 + 2.0 * d21 + d22 - d00 - 2.0 * d01 - d02, d02 + 2.0 * d12 + d22 - d00 - 2.0 * d10 - d20));
  float c00 = lum(uv + texel * vec2(-1, -1)), c10 = lum(uv + texel * vec2(0, -1)), c20 = lum(uv + texel * vec2(1, -1));
  float c01 = lum(uv + texel * vec2(-1, 0)), c21 = lum(uv + texel * vec2(1, 0));
  float c02 = lum(uv + texel * vec2(-1, 1)), c12 = lum(uv + texel * vec2(0, 1)), c22 = lum(uv + texel * vec2(1, 1));
  gc = length(vec2(c20 + 2.0 * c21 + c22 - c00 - 2.0 * c01 - c02, c02 + 2.0 * c12 + c22 - c00 - 2.0 * c10 - c20));
  float edge = smoothstep(threshold.x, threshold.y, gd * kDepth * 10.0 + gc * kColor);

  vec3 col = texture2D(tColor, vUv).rgb;
  col = floor(col * levels + 0.5) / levels;
  // Paper: fibres and grain, multiplied in like ink on a sketchbook page.
  float grain = noise(vUv / texel * 0.6) * 0.5 + noise(vUv / texel * 0.15) * 0.5;
  float fibre = smoothstep(0.7, 1.0, noise(vec2(vUv.x * 900.0, vUv.y * 40.0)));
  vec3 pap = paper * (0.9 + 0.1 * grain) - fibre * 0.04;
  col = mix(col, col * pap * 1.08, 0.55);
  col = mix(col, ink, edge * 0.9);
  // Reveal: the panel washes in from paper.
  col = mix(pap, col, reveal);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Ink-outline + paper-texture post effect for comic panels. One render target, reused per panel. */
export class InkPass {
  private rt: THREE.WebGLRenderTarget;
  private readonly mat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() {
    this.rt = this.makeTarget(2, 2);
    const ink = COMIC.ink;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        texel: { value: new THREE.Vector2() },
        near: { value: 0.1 },
        far: { value: 40 },
        boil: { value: 0 },
        reveal: { value: 1 },
        paper: { value: new THREE.Color(COMIC.paper) },
        ink: { value: new THREE.Color(COMIC.inkColor) },
        kDepth: { value: ink.depth },
        kColor: { value: ink.color },
        threshold: { value: new THREE.Vector2(...ink.threshold) },
        wobble: { value: ink.wobble },
        levels: { value: ink.levels },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.scene.add(this.quad);
  }

  private makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const depth = new THREE.DepthTexture(w, h);
    return new THREE.WebGLRenderTarget(w, h, { depthTexture: depth, samples: 0 });
  }

  /** Size in device pixels of one panel. */
  setSize(w: number, h: number): void {
    if (this.rt.width === w && this.rt.height === h) return;
    this.rt.dispose();
    this.rt = this.makeTarget(w, h);
  }

  /** Renders `scene` through the ink pass into the canvas rect (CSS pixels, bottom-left origin). */
  render(
    r: THREE.WebGLRenderer,
    scene: THREE.Scene,
    cam: THREE.PerspectiveCamera,
    rect: { x: number; y: number; w: number; h: number },
    time: number,
    reveal: number,
  ): void {
    r.setRenderTarget(this.rt);
    r.setViewport(0, 0, this.rt.width / r.getPixelRatio(), this.rt.height / r.getPixelRatio());
    r.render(scene, cam);
    r.setRenderTarget(null);
    const u = this.mat.uniforms;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    (u.texel.value as THREE.Vector2).set(1 / this.rt.width, 1 / this.rt.height);
    u.near.value = cam.near;
    u.far.value = cam.far;
    u.boil.value = Math.floor(time * COMIC.ink.boilFps) * 1.7;
    u.reveal.value = reveal;
    r.setScissorTest(true);
    r.setScissor(rect.x, rect.y, rect.w, rect.h);
    r.setViewport(rect.x, rect.y, rect.w, rect.h);
    r.render(this.scene, this.cam);
    r.setScissorTest(false);
  }
}
