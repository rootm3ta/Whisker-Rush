import * as THREE from 'three';
import { CITIES } from '../data/cities';
import { CAMERA } from '../data/runner';
import { RENDER, SIM } from '../data/render';
import { REFLEX, STUNTS } from '../data/scoring';
import { STAMP_COLORS, UI_TEXT } from '../data/ui';
import { Cat, type CatDrive } from '../entities/Cat';
import { RunSession } from '../gameplay/RunSession';
import { CameraRig } from '../render/CameraRig';
import { FieldView } from '../render/FieldView';
import { Hud } from '../ui/Hud';
import { Overlay } from '../ui/Overlay';
import { applyEnvironment } from '../world/Environment';
import { Track } from '../world/Track';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { Action, Input } from './Input';
import { FixedLoop } from './Loop';
import { StateMachine } from './StateMachine';

export type AppState = 'boot' | 'home' | 'run' | 'paused' | 'crashed';

/** Wires simulation, rendering, input and app flow together. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly run = new RunSession(this.bus);
  private readonly track: Track;
  private readonly fieldView = new FieldView();
  private readonly cat: Cat;
  private readonly input: Input;
  private readonly overlay: Overlay;
  private readonly hud: Hud;
  private readonly fsm: StateMachine<AppState>;
  private readonly loop: FixedLoop;
  private readonly drive: CatDrive = { x: 0, y: 0, vy: 0, speed: 0, grounded: true, sliding: false, grinding: false, running: false };
  private simTime = 0;
  private timeScale = 1;
  private slowLeft = 0;
  private crashWasCaught = false;
  private crashDelay = 0;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    const palette = CITIES.mapleLane.palette;
    applyEnvironment(this.scene, palette);
    this.track = new Track(palette);
    this.scene.add(this.track.root, this.fieldView.root);
    this.cat = new Cat(this.bus);
    this.scene.add(this.cat.rig.root, this.cat.rig.shadow);

    this.overlay = new Overlay(host);
    this.hud = new Hud(host);
    this.input = new Input(host, () => this.simTime);
    this.input.onTap = () => {
      if (this.fsm.is('home') || this.fsm.is('paused')) this.fsm.go('run');
      else if (this.fsm.is('crashed') && this.crashDelay <= 0) this.fsm.go('home');
    };
    this.wireEvents();

    this.fsm = new StateMachine<AppState>(
      {
        boot: {},
        home: {
          enter: () => {
            this.run.reset();
            this.track.reset();
            this.input.buffer.clear();
            this.hud.reset();
            this.hud.visible = false;
            this.overlay.showHome();
          },
          update: () => this.input.buffer.process(this.simTime, this.startFromHome),
        },
        run: {
          enter: () => {
            this.overlay.hide();
            this.hud.visible = true;
          },
          update: (dt) => {
            this.input.buffer.process(this.simTime, this.handleRunAction);
            this.run.step(dt);
            this.track.step(this.run.runner.distance);
            if (this.run.crashed) this.fsm.go('crashed');
          },
        },
        paused: {
          enter: () => this.overlay.showPaused(),
          update: () => this.input.buffer.process(this.simTime, this.resumeFromPause),
        },
        crashed: {
          enter: () => {
            const s = this.run.score;
            this.crashDelay = 0.6;
            this.timeScale = 1;
            this.slowLeft = 0;
            this.overlay.showCrash(this.crashWasCaught, s.points, s.coins, this.run.satchel.count, this.run.runner.distance);
          },
          update: (dt) => {
            this.crashDelay -= dt;
            this.input.buffer.process(this.simTime, this.restartFromCrash);
          },
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

  private wireEvents(): void {
    const b = this.bus;
    b.on('land', (impact) => {
      this.rig.addShake(impact * CAMERA.landShake);
      if (impact > CAMERA.landKick * 4) this.rig.addKick(CAMERA.landKick);
    });
    b.on('zoneChange', () => this.rig.addKick(CAMERA.landKick));
    b.on('nearMiss', () => {
      this.slowLeft = REFLEX.durationSec;
      this.hud.stamp(UI_TEXT.nearMiss, STAMP_COLORS.nearMiss);
    });
    b.on('stunt', (i) => this.hud.stamp(STUNTS[i].label, STAMP_COLORS.stunt));
    b.on('stumble', () => {
      this.rig.addShake(0.12);
      this.hud.stamp(UI_TEXT.stumble, STAMP_COLORS.warn);
    });
    b.on('satchelFull', () => this.hud.stamp(UI_TEXT.satchelFull, STAMP_COLORS.warn));
    b.on('fishBone', () => this.hud.stamp(UI_TEXT.fishBone, STAMP_COLORS.loot));
    b.on('wallKick', () => this.rig.addKick(CAMERA.landKick * 0.6));
    b.on('crash', (caught) => {
      this.crashWasCaught = caught === 1;
      this.rig.addShake(0.3);
    });
  }

  private readonly startFromHome = (a: number): boolean => {
    if (a !== Action.Pause) this.fsm.go('run');
    return true;
  };

  private readonly resumeFromPause = (a: number): boolean => {
    if (a === Action.Pause) this.fsm.go('run');
    return true;
  };

  private readonly restartFromCrash = (a: number): boolean => {
    if (this.crashDelay <= 0 && a !== Action.Pause) this.fsm.go('home');
    return true;
  };

  private readonly handleRunAction = (a: number): boolean => {
    if (a === Action.Pause) {
      this.fsm.go('paused');
      return true;
    }
    if (a === Action.Ability) return true; // Active abilities arrive in M4.
    return this.run.handleAction(a);
  };

  private readonly step = (realDt: number): void => {
    if (this.slowLeft > 0) {
      this.slowLeft -= realDt;
      this.timeScale = this.slowLeft > 0 ? REFLEX.timeScale : 1;
    }
    const dt = realDt * this.timeScale;
    this.simTime += dt;
    this.fsm.update(dt);
  };

  private readonly render = (alpha: number, frameDt: number): void => {
    const r = this.run.runner;
    const running = this.fsm.is('run');
    const frozen = this.fsm.is('paused') || this.fsm.is('crashed');
    const x = r.prevX + (r.x - r.prevX) * alpha;
    const y = r.prevY + (r.y - r.prevY) * alpha;
    const dist = r.prevDistance + (r.distance - r.prevDistance) * alpha;
    const dt = frozen ? 0 : frameDt * this.timeScale;

    this.track.render(dist);
    this.fieldView.update(this.run.field, dist, dt);
    const d = this.drive;
    d.x = x;
    d.y = y;
    d.vy = r.vy;
    d.speed = r.speed;
    d.grounded = r.grounded;
    d.sliding = r.sliding;
    d.grinding = r.grinding;
    d.running = running;
    this.cat.update(dt, d);
    this.rig.update(this.fsm.is('crashed') ? frameDt : dt, x, y, running ? r.speed : 0);
    if (running) this.hud.update(this.run.score, this.run.satchel, frameDt * 1000);
    this.renderer.render(this.scene, this.rig.camera);
  };

  private readonly resize = (): void => {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / h);
  };
}
