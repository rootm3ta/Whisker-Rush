import * as THREE from 'three';
import { CITIES } from '../data/cities';
import { CAMERA } from '../data/runner';
import { RENDER, SIM } from '../data/render';
import { Cat, type CatDrive } from '../entities/Cat';
import { Runner } from '../gameplay/Runner';
import { CameraRig } from '../render/CameraRig';
import { Overlay } from '../ui/Overlay';
import { applyEnvironment } from '../world/Environment';
import { Track } from '../world/Track';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { Action, Input } from './Input';
import { FixedLoop } from './Loop';
import { StateMachine } from './StateMachine';

export type AppState = 'boot' | 'home' | 'run' | 'paused';

/** Wires simulation, rendering, input and app flow together. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly runner = new Runner(this.bus);
  private readonly track: Track;
  private readonly cat: Cat;
  private readonly input: Input;
  private readonly overlay: Overlay;
  private readonly fsm: StateMachine<AppState>;
  private readonly loop: FixedLoop;
  private readonly drive: CatDrive = { x: 0, y: 0, vy: 0, speed: 0, grounded: true, sliding: false, running: false };
  private simTime = 0;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    const palette = CITIES.mapleLane.palette;
    applyEnvironment(this.scene, palette);
    this.track = new Track(palette);
    this.scene.add(this.track.root);
    this.cat = new Cat(this.bus);
    this.scene.add(this.cat.rig.root, this.cat.rig.shadow);

    this.overlay = new Overlay(host);
    this.input = new Input(host, () => this.simTime);
    this.input.onTap = () => {
      if (this.fsm.is('home')) this.fsm.go('run');
      else if (this.fsm.is('paused')) this.fsm.go('run');
    };

    this.bus.on('land', (impact) => {
      this.rig.addShake(impact * CAMERA.landShake);
      if (impact > CAMERA.landKick * 4) this.rig.addKick(CAMERA.landKick);
    });
    this.bus.on('zoneChange', () => this.rig.addKick(CAMERA.landKick));

    this.fsm = new StateMachine<AppState>(
      {
        boot: {},
        home: {
          enter: () => {
            this.runner.reset();
            this.track.reset();
            this.input.buffer.clear();
            this.overlay.showHome();
          },
          update: () => this.input.buffer.process(this.simTime, this.startFromHome),
        },
        run: {
          enter: () => this.overlay.showRun(),
          update: (dt) => {
            this.input.buffer.process(this.simTime, this.handleRunAction);
            this.runner.step(dt);
            this.track.step(this.runner.distance);
          },
        },
        paused: {
          enter: () => this.overlay.showPaused(),
          update: () => this.input.buffer.process(this.simTime, this.resumeFromPause),
        },
      },
      (next) => this.bus.emit('stateChange', next),
    );

    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.fsm.is('run')) this.fsm.go('paused');
    });
    this.resize();
    this.loop = new FixedLoop(SIM.hz, SIM.maxFrameSec, this.step, this.render);
  }

  start(): void {
    this.fsm.go('boot');
    this.fsm.go('home');
    this.loop.start();
  }

  private readonly startFromHome = (a: number): boolean => {
    if (a !== Action.Pause) this.fsm.go('run');
    return true;
  };

  private readonly resumeFromPause = (a: number): boolean => {
    if (a === Action.Pause) this.fsm.go('run');
    return true;
  };

  private readonly handleRunAction = (a: number): boolean => {
    if (a === Action.Pause) {
      this.fsm.go('paused');
      return true;
    }
    if (a === Action.Ability) return true; // Active abilities arrive in M4.
    return this.runner.tryAction(a);
  };

  private readonly step = (dt: number): void => {
    this.simTime += dt;
    this.fsm.update(dt);
  };

  private readonly render = (alpha: number, frameDt: number): void => {
    const r = this.runner;
    const running = this.fsm.is('run');
    const paused = this.fsm.is('paused');
    const x = r.prevX + (r.x - r.prevX) * alpha;
    const y = r.prevY + (r.y - r.prevY) * alpha;
    const dist = r.prevDistance + (r.distance - r.prevDistance) * alpha;

    this.track.render(dist);
    const d = this.drive;
    d.x = x;
    d.y = y;
    d.vy = r.vy;
    d.speed = r.speed;
    d.grounded = r.grounded;
    d.sliding = r.sliding;
    d.running = running;
    const animDt = paused ? 0 : frameDt;
    this.cat.update(animDt, d);
    this.rig.update(animDt, x, y, running ? r.speed : 0);
    if (running) this.overlay.setDistance(r.distance);
    this.renderer.render(this.scene, this.rig.camera);
  };

  private readonly resize = (): void => {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / h);
  };
}
