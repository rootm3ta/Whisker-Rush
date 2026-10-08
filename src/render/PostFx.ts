import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, VignetteEffect } from 'postprocessing';
import { QUALITY, RENDER } from '../data/render';

export type Tier = 'high' | 'medium' | 'low';

/** Picks a quality tier from the average frame time after warm-up. */
export class QualityProbe {
  private frames = 0;
  private sum = 0;
  tier: Tier | null = null;

  /** Feed real frame times (seconds). Returns the tier once decided, else null. */
  sample(dt: number): Tier | null {
    if (this.tier) return null;
    this.frames++;
    if (this.frames <= QUALITY.warmupFrames) return null;
    this.sum += dt * 1000;
    if (this.frames < QUALITY.warmupFrames + QUALITY.sampleFrames) return null;
    const avg = this.sum / QUALITY.sampleFrames;
    this.tier = avg > QUALITY.lowAboveMs ? 'low' : avg > QUALITY.mediumAboveMs ? 'medium' : 'high';
    return this.tier;
  }
}

/** Bloom (high threshold, subtle), vignette and SMAA. Low tier renders straight to the screen. */
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass: EffectPass;
  private readonly basePass: EffectPass;
  tier: Tier = 'high';

  constructor(private readonly renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    this.renderPass = new RenderPass(scene, camera);
    const Q = QUALITY;
    const bloom = new BloomEffect({ luminanceThreshold: Q.bloom.threshold, luminanceSmoothing: Q.bloom.smoothing, intensity: Q.bloom.intensity, radius: Q.bloom.radius, mipmapBlur: true });
    this.bloomPass = new EffectPass(camera, bloom);
    this.basePass = new EffectPass(camera, new VignetteEffect({ offset: Q.vignette.offset, darkness: Q.vignette.darkness }), new SMAAEffect());
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.basePass);
  }

  setTier(tier: Tier): void {
    this.tier = tier;
    this.bloomPass.enabled = tier === 'high';
    const dpr = Math.min(window.devicePixelRatio, tier === 'low' ? RENDER.lowTierDpr : RENDER.maxDpr);
    if (this.renderer.getPixelRatio() !== dpr) {
      this.renderer.setPixelRatio(dpr);
      const s = this.renderer.getSize(new THREE.Vector2());
      this.setSize(s.x, s.y);
    }
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h, false);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, dt: number): void {
    if (this.tier === 'low') {
      this.renderer.render(scene, camera);
      return;
    }
    if (this.renderPass.mainScene !== scene) this.renderPass.mainScene = scene;
    if (this.renderPass.mainCamera !== camera) {
      this.renderPass.mainCamera = camera;
      this.bloomPass.mainCamera = camera;
      this.basePass.mainCamera = camera;
    }
    this.composer.render(dt);
  }
}
