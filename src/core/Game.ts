import * as THREE from 'three';
import { CITIES } from '../data/cities';
import { CRASH } from '../data/chase';
import { ABILITIES } from '../data/abilities';
import { BOSS } from '../data/boss';
import { POWERUPS, POWERUP_FX, POWERUP_IDS, type PowerUpId } from '../data/powerups';
import { CAT_DOOR } from '../data/secrets';
import { CAMERA } from '../data/runner';
import { RENDER, SIM } from '../data/render';
import { REFLEX, STUNTS } from '../data/scoring';
import { DUKE_TAUNTS, STAMP_COLORS, UI_TEXT } from '../data/ui';
import { Cat, type CatDrive } from '../entities/Cat';
import { DogPack, PackMode } from '../entities/DogPack';
import { RunSession } from '../gameplay/RunSession';
import { Save } from '../meta/Save';
import type { IAds } from '../platform/Ads';
import { MockAds } from '../platform/MockAds';
import { LocalStorageAdapter } from '../platform/Storage';
import { CameraRig } from '../render/CameraRig';
import { BossView } from '../render/BossView';
import { PowerFx } from '../render/PowerFx';
import { PowerHud } from '../ui/PowerHud';
import { BossPhase } from '../gameplay/Boss';
import { CrashFx } from '../render/CrashFx';
import { FieldView } from '../render/FieldView';
import { GameOver } from '../ui/GameOver';
import { Hud } from '../ui/Hud';
import { Overlay } from '../ui/Overlay';
import { HomeScene } from '../render/HomeScene';
import { TrailFx } from '../render/TrailFx';
import { HomeHud } from '../ui/HomeHud';
import { popup } from '../ui/Sheet';
import type { MetaCtx } from '../ui/screens/ctx';
import { MarketScreen } from '../ui/screens/MarketScreen';
import { UpgradesScreen } from '../ui/screens/UpgradesScreen';
import { WardrobeScreen } from '../ui/screens/WardrobeScreen';
import { MissionsScreen } from '../ui/screens/MissionsScreen';
import { CalendarScreen } from '../ui/screens/CalendarScreen';
import { PassScreen } from '../ui/screens/PassScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import type { HomeAction } from '../data/home';
import { PASS } from '../data/economy';
import { computeRunConfig } from '../meta/Loadout';
import { applyStats, missionText, type RunStats } from '../meta/Missions';
import { addToStash } from '../meta/Market';
import { canClaimTier, runStamps } from '../meta/Pass';
import { loginState } from '../meta/Calendar';
import { localDay } from '../meta/Time';
import { Comic } from '../ui/Comic';
import { Audio } from '../audio/Audio';
import { WebHaptics } from '../platform/Haptics';
import { JuiceFx } from '../render/JuiceFx';
import { PostFx, QualityProbe } from '../render/PostFx';
import { FlyFx } from '../ui/FlyFx';
import { overlays } from '../ui/Sheet';
import { HIT_STOP } from '../data/fx';
import { MUSIC } from '../data/audio';
import '../ui/juice.css';
import { Tutorial } from '../gameplay/Tutorial';
import { TutorialHud } from '../ui/TutorialHud';
import { TUTORIAL } from '../data/tutorial';
import { claimFreeHat, freeHatPending, nextOnboarding } from '../meta/Onboarding';
import { Environment } from '../world/Environment';
import { KITS } from '../procgen/cityKits';
import { MapScreen } from '../ui/screens/MapScreen';
import type { CityId } from '../data/cities';
import { Track } from '../world/Track';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { Action, Input } from './Input';
import { FixedLoop } from './Loop';
import { Rng } from './Rng';
import { StateMachine } from './StateMachine';

export type AppState = 'boot' | 'comic' | 'home' | 'run' | 'paused' | 'crashing' | 'gameOver' | 'reviving';

/** Wires simulation, rendering, input, platform services and app flow together. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly run = new RunSession(this.bus);
  private readonly save = new Save(new LocalStorageAdapter());
  private readonly ads: IAds;
  private track: Track;
  private readonly env: Environment;
  private city: CityId = 'mapleLane';
  private readonly map: MapScreen;
  private readonly fieldView = new FieldView();
  private readonly cat: Cat;
  private readonly pack = new DogPack();
  private readonly fx = new CrashFx();
  private readonly powerFx = new PowerFx();
  private readonly bossView = new BossView();
  private readonly powerHud: PowerHud;
  private freshRun = false;
  private readonly alleyColor = new THREE.Color(CAT_DOOR.fog);
  private readonly input: Input;
  private readonly overlay: Overlay;
  private readonly home: HomeScene;
  private readonly homeHud: HomeHud;
  private readonly trail = new TrailFx();
  private readonly homeTrail = new TrailFx();
  private readonly market: MarketScreen;
  private readonly screens: {
    upgrades: UpgradesScreen;
    wardrobe: WardrobeScreen;
    missions: MissionsScreen;
    calendar: CalendarScreen;
    pass: PassScreen;
    settings: SettingsScreen;
  };
  private readonly metaRng = new Rng((Date.now() ^ 0x5bd1e995) >>> 0);
  private readonly labelPos = new THREE.Vector3();
  private pokes = 0;
  private readonly comic: Comic;
  private readonly tutorial: Tutorial;
  private readonly tutorialHud: TutorialHud;
  /** Replaying the intro from Settings: no flags change, back home afterwards. */
  private replaying = false;
  private tutorialDoneT = -1;
  private readonly audio: Audio;
  private readonly haptics = new WebHaptics();
  private readonly juice: JuiceFx;
  private readonly postFx: PostFx;
  private readonly quality = new QualityProbe();
  private readonly fly: FlyFx;
  private hitStop = 0;
  private lastFly = 0;
  private readonly catScreen = new THREE.Vector3();
  private catPx = 0;
  private catPy = 0;
  private stemKey = -1;
  private bannerKey = -1;
  private dragX: number | null = null;
  private readonly hud: Hud;
  private readonly gameOver: GameOver;
  private readonly fsm: StateMachine<AppState>;
  private readonly loop: FixedLoop;
  private readonly rng = new Rng(Date.now() >>> 0);
  private readonly drive: CatDrive = {
    x: 0, y: 0, vy: 0, speed: 0, grounded: true, sliding: false, grinding: false,
    running: false, hidden: false, dizzy: false, flicker: false,
    boxed: false, nap: false, loaf: false, lift: 0,
  };
  private simTime = 0;
  private timeScale = 1;
  private slowLeft = 0;
  private crashT = 0;
  private popped = false;

  constructor(private readonly host: HTMLElement) {
    // SMAA in the post chain replaces MSAA; the composer needs no stencil.
    this.renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.env = new Environment(this.scene, CITIES.mapleLane.palette);
    this.track = new Track(KITS.mapleLane);
    this.cat = new Cat(this.bus);
    this.scene.add(this.track.root, this.fieldView.root, this.cat.holder, this.cat.shadow, this.pack.root, this.fx.root);
    this.scene.add(this.powerFx.root, this.bossView.root);

    this.ads = new MockAds(host);
    this.overlay = new Overlay(host);
    this.hud = new Hud(host);
    this.powerHud = new PowerHud(host, {
      ability: () => this.useAbility(),
      roomba: () => this.useRoomba(),
      boost: (id) => this.useBoost(id),
    });
    this.gameOver = new GameOver(host, {
      revive: () => this.tryRevive(),
      share: () => this.share(),
      continue: () => this.finishRun(),
    });
    this.scene.add(this.trail.root);
    this.juice = new JuiceFx(this.bus);
    this.scene.add(this.juice.particles.points);
    this.audio = new Audio(this.bus);
    this.audio.setTheme(CITIES.mapleLane.music);
    this.postFx = new PostFx(this.renderer, this.scene, this.rig.camera);
    this.fly = new FlyFx(host);
    this.home = new HomeScene(new EventBus<GameEvents>());
    this.home.scene.add(this.homeTrail.root);
    this.homeHud = new HomeHud(host, {
      run: () => this.startRun(),
      settings: () => this.screens.settings.open(),
      pass: () => this.screens.pass.open(),
    });
    const ctx: MetaCtx = {
      save: this.save,
      rng: this.metaRng,
      host,
      now: () => Date.now(),
      refresh: () => this.refreshMeta(),
      reward: (title, lines) => popup(host, title, lines),
      addStats: (stats) => this.applyMetaStats(stats),
      sound: (id) => this.audio.play(id),
    };
    this.market = new MarketScreen(ctx);
    this.map = new MapScreen(ctx, () => this.prepareRun());
    this.screens = {
      upgrades: new UpgradesScreen(ctx),
      wardrobe: new WardrobeScreen(ctx, (on) => {
        this.home.previewOn = on;
        this.home.spin = 0;
      }),
      missions: new MissionsScreen(ctx),
      calendar: new CalendarScreen(ctx),
      pass: new PassScreen(ctx),
      settings: new SettingsScreen(
        ctx,
        () => {
          this.save.reset();
          this.fsm.go('boot');
        },
        () => this.playIntro(true),
      ),
    };
    this.comic = new Comic(host);
    this.comic.onDone = () => {
      if (!this.replaying) {
        this.save.profile.flags.introSeen = true;
        this.save.write();
      }
      this.startTutorial();
    };
    this.tutorial = new Tutorial(this.bus, this.run);
    this.tutorialHud = new TutorialHud(host);
    this.gameOver.onTick = () => this.audio.play('tick');
    this.input = new Input(host, () => this.simTime);
    this.input.onTap = () => {
      if (this.fsm.is('paused')) this.fsm.go('run');
    };
    host.addEventListener('click', this.onHomeClick);
    host.addEventListener('pointerdown', (e) => (this.dragX = this.home.previewOn ? e.clientX : null));
    host.addEventListener('pointermove', (e) => {
      if (this.dragX === null) return;
      this.home.spin += (e.clientX - this.dragX) * 0.012;
      this.dragX = e.clientX;
    });
    host.addEventListener('pointerup', () => (this.dragX = null));
    this.wireEvents();

    this.fsm = new StateMachine<AppState>(
      {
        boot: {
          enter: () => {
            this.save.profile.sessions++;
            this.save.write();
            this.homeHud.visible = false;
            this.overlay.hide();
            this.comic.showSplash();
          },
          update: (dt) => {
            if (!this.comic.updateSplash(dt)) return;
            const next = nextOnboarding(this.save.profile);
            if (next === 'comic') this.playIntro(false);
            else if (next === 'tutorial') this.startTutorial();
            else this.fsm.go('home');
          },
        },
        comic: {
          enter: () => {
            this.homeHud.visible = false;
            this.comic.start();
          },
        },
        home: {
          enter: () => {
            this.prepareRun();
            this.overlay.hide();
            this.homeHud.visible = true;
            this.refreshMeta();
            const hat = freeHatPending(this.save.profile);
            this.homeHud.setHighlight(hat ? 'wardrobe' : null, hat ? 'Free hat!' : '');
          },
          update: () => this.input.buffer.process(this.simTime, this.startFromHome),
          exit: () => {
            this.homeHud.visible = false;
            this.home.previewOn = false;
          },
        },
        run: {
          enter: () => {
            this.overlay.hide();
            this.gameOver.hide();
            this.hud.visible = true;
            this.powerHud.visible = true;
            if (this.freshRun) {
              this.freshRun = false;
              const inv = this.save.profile.inventory;
              this.powerHud.showBoosts(inv.zoomies, inv.fishRocket, POWERUP_FX.boostWindowSec);
            }
          },
          update: (dt) => {
            this.input.buffer.process(this.simTime, this.handleRunAction);
            this.run.step(dt);
            this.track.step(this.run.runner.distance);
            if (this.tutorial.active) this.updateTutorial(dt);
            if (this.run.crashed) this.fsm.go('crashing');
          },
        },
        paused: {
          enter: () => this.overlay.showPaused(),
          update: () => this.input.buffer.process(this.simTime, this.resumeFromPause),
        },
        crashing: {
          enter: () => {
            this.crashT = 0;
            this.popped = false;
            this.timeScale = 1;
            this.slowLeft = 0;
            this.hud.setRush(false);
            this.powerHud.hideBoosts();
            this.powerHud.visible = false;
            const r = this.run.runner;
            this.fx.startCloud(r.x, r.y, 0);
          },
          update: (dt) => {
            this.crashT += dt;
            this.input.buffer.clear();
            if (this.crashT < CRASH.cloudSec) {
              this.run.chase.stepPounce(dt);
            } else {
              this.run.chase.stepGloat(dt);
            }
            if (this.crashT < CRASH.cloudSec) {
              /* still fighting in the cloud */
            } else if (!this.popped) {
              this.popped = true;
              this.fx.stopCloud();
              this.fx.setDizzy(true);
              this.cat.pop();
              this.pack.taunt();
              this.hud.taunt(this.rng.pick(DUKE_TAUNTS));
            } else if (this.crashT >= CRASH.cloudSec + CRASH.dizzySec) {
              this.fsm.go('gameOver');
            }
          },
        },
        gameOver: {
          enter: () => this.showGameOver(),
          update: (dt) => this.run.chase.stepGloat(dt),
        },
        reviving: {},
      },
      (next) => {
        this.bus.emit('stateChange', next);
        this.audio.setMode(next === 'run' ? 'run' : next === 'boot' || next === 'crashing' || next === 'paused' ? 'off' : 'home');
        this.stemKey = -1;
      },
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
    this.loop.start();
  }

  /** Resets the run session, track and HUD for a fresh run (no state change). */
  private prepareRun(): void {
    const p = this.save.profile;
    const config = computeRunConfig(p);
    this.setCity(config.city);
    this.run.reset(undefined, p, Date.now(), config);
    this.track.reset();
    this.input.buffer.clear();
    this.hud.reset();
    this.hud.visible = false;
    this.powerHud.visible = false;
    this.powerHud.setAbility(p.ability);
    this.powerHud.setRoombaCount(p.inventory.roomba);
    this.powerHud.setHunt(this.run.secrets.word, p.hunt.found);
    this.fieldView.word = this.run.secrets.word;
    this.setAlleyLook(false);
    this.freshRun = true;
    this.gameOver.hide();
    this.cat.setLook(p.cat, p.outfit);
    this.trail.setTrail(p.outfit.trail);
  }

  private playIntro(replay: boolean): void {
    this.replaying = replay;
    this.fsm.go('comic');
  }

  /** Smash cut from the comic straight into the tutorial run, no menu in between. */
  private startTutorial(): void {
    this.prepareRun();
    this.freshRun = false;
    this.run.slowMul = TUTORIAL.speedMul;
    this.tutorial.start();
    this.tutorialHud.visible = true;
    this.tutorialDoneT = -1;
    this.fsm.go('run');
  }

  private updateTutorial(dt: number): void {
    const t = this.tutorial;
    t.update(dt);
    if (!t.finished) return;
    if (this.tutorialDoneT < 0) {
      this.tutorialDoneT = TUTORIAL.doneStampSec;
      this.hud.stamp(TUTORIAL.done, STAMP_COLORS.stunt);
      return;
    }
    this.tutorialDoneT -= dt;
    if (this.tutorialDoneT > 0) return;
    t.stop();
    this.tutorialHud.visible = false;
    if (this.replaying) {
      this.replaying = false;
      this.fsm.go('home');
      return;
    }
    // Straight into the first real run, which is guaranteed fun.
    this.save.profile.flags.tutorialDone = true;
    this.save.write();
    this.prepareRun();
    this.freshRun = false;
    this.hud.visible = true;
    this.powerHud.visible = true;
    const inv = this.save.profile.inventory;
    this.powerHud.showBoosts(inv.zoomies, inv.fishRocket, POWERUP_FX.boostWindowSec);
    this.hud.stamp(TUTORIAL.nowForReal, STAMP_COLORS.nearMiss);
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
    b.on('crash', () => {
      this.rig.addShake(0.3);
      this.hitStop = HIT_STOP.crashSec;
      this.haptics.heavy();
    });
    b.on('stumble', () => {
      this.hitStop = HIT_STOP.stumbleSec;
      this.haptics.medium();
    });
    b.on('nearMiss', () => this.haptics.medium());
    b.on('land', (impact) => {
      if (impact > 12) this.haptics.light();
    });
    b.on('ability', () => this.haptics.medium());
    b.on('coin', () => {
      const now = performance.now();
      if (now - this.lastFly < 90) return;
      this.lastFly = now;
      this.fly.fly('coin', this.catPx, this.catPy, this.hud.coinsTarget);
    });
    b.on('loot', () => this.fly.fly('loot', this.catPx, this.catPy, this.hud.satchelTarget));
    // Every button: haptic tick and a soft pop (CLAUDE.md section 7).
    this.host.addEventListener(
      'pointerdown',
      (e) => {
        if (!(e.target as HTMLElement).closest('button')) return;
        this.haptics.tick();
        this.audio.play('pop');
      },
      true,
    );
    b.on('dukeTaunt', () => {
      this.pack.taunt();
      this.hud.taunt(this.rng.pick(DUKE_TAUNTS));
    });
    b.on('packRushWarn', () => {
      this.hud.setRush(true);
      this.hud.stamp(UI_TEXT.packRush, STAMP_COLORS.nearMiss);
    });
    b.on('packRushEnd', () => this.hud.setRush(false));
    const stamp = (t: string, c: string = STAMP_COLORS.stunt) => this.hud.stamp(t, c);
    b.on('powerStart', (i) => stamp(POWERUPS[POWERUP_IDS[i]].name.toUpperCase() + '!', STAMP_COLORS.loot));
    b.on('shieldPop', (k) => {
      stamp(k === 0 ? UI_TEXT.pop : UI_TEXT.roombaOff, STAMP_COLORS.warn);
      this.rig.addShake(0.15);
    });
    b.on('smash', () => this.rig.addShake(0.08));
    b.on('ability', (i) => {
      const id = Object.keys(ABILITIES)[i] as keyof typeof ABILITIES;
      stamp(ABILITIES[id].name.toUpperCase() + '!', STAMP_COLORS.nearMiss);
      const r = this.run.runner;
      if (id === 'hiss') this.fx.burst(r.x, r.y, 0, ABILITIES.hiss.color);
      if (id === 'pounce') this.rig.addKick(8);
    });
    b.on('bell', () => stamp(UI_TEXT.bell.replace('{n}', String(this.run.secrets.bellsFound)), STAMP_COLORS.loot));
    b.on('allBells', () => stamp(UI_TEXT.allBells, STAMP_COLORS.loot));
    b.on('letter', () => this.powerHud.setHunt(this.run.secrets.word, this.save.profile.hunt.found));
    b.on('huntComplete', () => stamp(UI_TEXT.huntDone, STAMP_COLORS.loot));
    b.on('mysteryFish', () => stamp(UI_TEXT.mystery, STAMP_COLORS.loot));
    b.on('gag', (g) => stamp(UI_TEXT.gags[g], STAMP_COLORS.warn));
    b.on('catDoor', () => {
      stamp(UI_TEXT.catDoor, STAMP_COLORS.loot);
      this.setAlleyLook(true);
    });
    b.on('alleyEnd', () => this.setAlleyLook(false));
    b.on('bossStart', () => stamp(UI_TEXT.bossStart, STAMP_COLORS.nearMiss));
    b.on('bossDefeated', () => {
      stamp(UI_TEXT.bossDown, STAMP_COLORS.stunt);
      this.rig.addShake(0.25);
    });
    b.on('chest', () => stamp(UI_TEXT.chest, STAMP_COLORS.loot));
  }

  /** Secret Alley: dusky violet fog and sky while inside. */
  private setAlleyLook(on: boolean): void {
    if (on) {
      this.env.fog.color.copy(this.alleyColor);
      this.scene.background = this.alleyColor;
    } else {
      this.env.setPalette(CITIES[this.city].palette);
    }
  }

  /**
   * Switches the street, sky, local dogs, boss vehicle and music to a city.
   * Everything comes from the city's data file and kit.
   */
  private setCity(id: CityId): void {
    if (id === this.city) return;
    this.city = id;
    const c = CITIES[id];
    this.scene.remove(this.track.root);
    this.track.dispose();
    this.track = new Track(KITS[id]);
    this.scene.add(this.track.root);
    this.env.setPalette(c.palette);
    this.pack.setPups(c.dogs.pups[0], c.dogs.rush);
    this.bossView.setVehicle(KITS[id], c.boss.riderY, c.boss.riderZ);
    this.audio.setTheme(c.music);
  }

  private useAbility(): void {
    if (!this.fsm.is('run')) return;
    this.run.activateAbility();
  }

  private useRoomba(): void {
    if (!this.fsm.is('run')) return;
    const inv = this.save.profile.inventory;
    if (inv.roomba <= 0 || !this.run.startRoomba()) return;
    inv.roomba--;
    this.save.write();
    this.powerHud.setRoombaCount(inv.roomba);
  }

  private useBoost(id: PowerUpId): void {
    if (!this.fsm.is('run')) return;
    const inv = this.save.profile.inventory;
    const key = id === 'zoomies' ? 'zoomies' : 'fishRocket';
    if (inv[key] <= 0) return;
    inv[key]--;
    this.save.write();
    this.run.activatePowerUp(id);
  }

  private showGameOver(): void {
    const run = this.run;
    const banked = run.takeUnbanked();
    this.save.addCurrency(banked.coins, banked.fishBones);
    const p = this.save.profile;
    const score = run.score.points;
    const loot: number[] = [];
    for (let i = 0; i < run.satchel.count; i++) loot.push(run.satchel.at(i));
    if (score > p.bestScore && p.bestScore > 0) {
      this.juice.confetti();
      this.audio.play('stamp');
    }
    this.gameOver.show({
      caught: run.caught,
      score,
      distance: run.runner.distance,
      best: Math.max(p.bestScore, score),
      newBest: score > p.bestScore,
      coins: run.score.coins,
      loot,
      revives: run.revives.total,
      revive: run.nextRevive(),
      fishBones: p.fishBones,
    });
    this.bus.emit('gameOver', 0);
  }

  private tryRevive(): void {
    if (!this.fsm.is('gameOver')) return;
    const opt = this.run.nextRevive();
    if (opt.kind === 'ad') {
      this.gameOver.hide();
      this.fsm.go('reviving');
      void this.ads.showRewarded('Revive').then((ok) => {
        if (ok) this.doRevive('ad');
        else this.fsm.go('gameOver');
      });
    } else if (this.save.spendFishBones(opt.cost)) {
      this.doRevive('fishBones');
    }
  }

  private doRevive(kind: 'ad' | 'fishBones'): void {
    this.run.revive(kind);
    this.fx.setDizzy(false);
    const r = this.run.runner;
    this.fx.burst(r.x, r.y, 0);
    this.cat.pop();
    this.hud.stamp(UI_TEXT.revived, STAMP_COLORS.stunt);
    this.fsm.go('run');
  }

  private share(): void {
    const text = UI_TEXT.gameOver.shareText.replace('{m}', String(Math.floor(this.run.runner.distance)));
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    if (nav.share) {
      nav.share({ title: UI_TEXT.title, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => this.gameOver.toast(UI_TEXT.gameOver.shareCopied),
        () => this.gameOver.toast(UI_TEXT.gameOver.shareSoon),
      );
    } else {
      this.gameOver.toast(UI_TEXT.gameOver.shareSoon);
    }
  }

  /**
   * Post-run: missions and challenges, Paw Stamps, loot into the stash, record the run,
   * then home. If the Satchel had loot, Old Tom's Market opens (skippable).
   */
  private finishRun(): void {
    if (!this.fsm.is('gameOver')) return;
    const run = this.run;
    const p = this.save.profile;
    const distance = run.runner.distance;
    p.pass.stamps += runStamps(distance);
    const loot: number[] = [];
    for (let i = 0; i < run.satchel.count; i++) loot.push(run.satchel.at(i));
    const overflow = addToStash(p, loot);
    p.revives += run.revives.total;
    this.applyMetaStats(run.stats.snapshot(distance, run.score.coins));
    this.save.recordRun(run.score.points, distance);
    this.fx.setDizzy(false);
    const first = run.config.firstRun;
    if (first) p.flags.firstRunDone = true;
    const newcomer = !p.flags.tomIntroDone && p.flags.firstRunDone;
    if (newcomer) p.flags.tomIntroDone = true;
    this.save.write();
    this.fsm.go('home');
    if (overflow > 0) popup(this.host, 'Stash full', [`Tom bought the overflow for ${overflow} coins.`]);
    // First run: Old Tom introduces himself and pays a newcomer bonus. Later: only with loot.
    if (newcomer || loot.length > 0) this.market.open(newcomer);
  }

  /** Feeds stats to missions/challenges and pops up anything completed. */
  private applyMetaStats(stats: RunStats): void {
    const p = this.save.profile;
    const set = p.missions.set;
    const res = applyStats(p, stats, localDay(Date.now()), this.metaRng);
    this.save.write();
    if (res.completed.length) popup(this.host, 'Mission complete!', res.completed.map((id) => missionText(id, set)));
    if (res.setDone) popup(this.host, `Set done! Multiplier x${p.missions.multiplier}`, res.rewards);
    else if (res.challengesDone) popup(this.host, 'Daily challenge done!', res.rewards);
    this.refreshMeta();
  }

  /** Re-reads the profile into the Home HUD and both cats' looks. */
  private refreshMeta(): void {
    const p = this.save.profile;
    const day = localDay(Date.now());
    let passClaim = false;
    for (let t = 1; t <= PASS.tiers && !passClaim; t++) passClaim = canClaimTier(p, t);
    this.homeHud.setStats(p.coins, p.fishBones, p.missions.multiplier, p.bestScore, Math.floor(p.pass.stamps / PASS.stampsPerTier));
    this.homeHud.setDot('calendar', loginState(p, day).canClaim);
    this.homeHud.setDot('pass', passClaim);
    this.homeHud.setDot('market', Object.keys(p.stash).length > 0);
    this.cat.setLook(p.cat, p.outfit);
    this.home.cat.setLook(p.cat, p.outfit);
    this.trail.setTrail(p.outfit.trail);
    this.homeTrail.setTrail(p.outfit.trail);
    this.powerHud.setRoombaCount(p.inventory.roomba);
    this.powerHud.setAbility(p.ability);
    this.audio.setEnabled(p.settings.music, p.settings.sfx);
    this.haptics.enabled = p.settings.haptics;
  }

  private startRun(): void {
    if (!this.fsm.is('home') || this.anySheetOpen()) return;
    this.fsm.go('run');
  }

  private anySheetOpen(): boolean {
    return overlays.open > 0;
  }

  private readonly onHomeClick = (e: MouseEvent): void => {
    if (!this.fsm.is('home') || e.target !== this.renderer.domElement || this.anySheetOpen()) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const hit = this.home.pick(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    if (!hit) return;
    this.openHomeAction(hit as HomeAction | 'miso', e.clientX, e.clientY);
  };

  private openHomeAction(a: HomeAction | 'miso', x = 0, y = 0): void {
    switch (a) {
      case 'run':
        this.startRun();
        break;
      case 'market':
        this.market.open();
        break;
      case 'map':
        this.map.open();
        break;
      case 'miso':
        this.homeHud.say(this.home.poke(this.pokes++), x, y - 20);
        break;
      case 'wardrobe':
        if (claimFreeHat(this.save.profile)) {
          this.save.write();
          this.refreshMeta();
          this.homeHud.setHighlight(null);
          popup(this.host, 'Free hat!', ['A Bucket Hat, on the house.', 'Miso is wearing it already.']);
        }
        this.screens.wardrobe.open();
        break;
      default:
        this.screens[a].open();
    }
  }

  /** Keyboard only: Up / Space starts a run from Home (swipes on Home are for spinning Miso). */
  private readonly startFromHome = (a: number): boolean => {
    if (this.input.lastSource === 'key' && (a === Action.Up || a === Action.Ability)) this.startRun();
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
    if (a === Action.Ability) {
      // Double-tap / Space: the ability when charged, otherwise hop on a Roomba.
      if (this.run.abilities.charged) this.useAbility();
      else this.useRoomba();
      return true;
    }
    if (a === Action.Roomba) {
      this.useRoomba();
      return true;
    }
    return this.run.handleAction(a);
  };

  private readonly step = (realDt: number): void => {
    if (this.slowLeft > 0) {
      this.slowLeft -= realDt;
      this.timeScale = this.slowLeft > 0 ? REFLEX.timeScale : 1;
    }
    if (this.tutorial.active && this.fsm.is('run')) {
      this.timeScale = this.tutorial.frozen ? TUTORIAL.freezeScale : 1;
      // Real-time countdown for the end stamp, even though the world may be frozen.
      if (this.tutorial.finished) this.timeScale = 1;
    }
    // Hit-stop: the world holds still for a beat on impact.
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      return;
    }
    const dt = realDt * this.timeScale;
    this.simTime += dt;
    this.fsm.update(dt);
  };

  /** Auto quality tier from the first frames' average frame time. */
  private sampleQuality(frameDt: number): void {
    const tier = this.quality.sample(frameDt);
    if (!tier) return;
    this.postFx.setTier(tier);
    this.juice.particles.setViewport(this.host.clientHeight * this.renderer.getPixelRatio());
  }

  private renderHome(frameDt: number): void {
    const h = this.home;
    h.update(frameDt);
    this.homeHud.update(frameDt);
    this.market.update();
    const w = this.host.clientWidth;
    const hh = this.host.clientHeight;
    const sheet = this.anySheetOpen();
    this.homeHud.setCovered(sheet);
    for (const a of h.anchors) {
      const v = this.labelPos.copy(a.pos).project(h.camera);
      this.homeHud.placeLabel(a.action, ((v.x + 1) / 2) * w, ((1 - v.y) / 2) * hh, !sheet && v.z < 1);
    }
    const seat = h.cat.holder.position;
    this.homeTrail.update(frameDt, 0, 0, h.previewOn ? 2 : 0, h.previewOn);
    this.homeTrail.root.position.copy(seat);
    this.homeTrail.root.scale.setScalar(h.cat.holder.scale.x);
    this.sampleQuality(frameDt);
    this.postFx.render(h.scene, h.camera, frameDt);
  }

  private readonly render = (alpha: number, frameDt: number): void => {
    if (this.fsm.is('home')) {
      this.renderHome(frameDt);
      return;
    }
    if (this.fsm.is('boot') || this.fsm.is('comic')) {
      if (this.comic.active) this.comic.render(this.renderer, frameDt);
      else {
        this.renderer.setClearColor(0xf4ead6, 1);
        this.renderer.clear();
      }
      return;
    }
    if (this.tutorial.active) this.tutorialHud.update(this.tutorial);
    const run = this.run;
    const r = run.runner;
    const fsm = this.fsm;
    const running = fsm.is('run');
    const crashing = fsm.is('crashing');
    const afterCrash = crashing || fsm.is('gameOver') || fsm.is('reviving');
    const frozen = fsm.is('paused');
    const x = r.prevX + (r.x - r.prevX) * alpha;
    const y = r.prevY + (r.y - r.prevY) * alpha;
    const dist = r.prevDistance + (r.distance - r.prevDistance) * alpha;
    const dt = frozen ? 0 : frameDt * this.timeScale;

    this.track.render(dist);
    this.fieldView.update(run.field, dist, afterCrash ? 0 : dt);
    const d = this.drive;
    d.x = x;
    d.y = afterCrash && this.popped ? 0 : y;
    d.vy = r.vy;
    d.speed = r.speed;
    d.grounded = r.grounded || afterCrash;
    d.sliding = r.sliding && !afterCrash;
    d.grinding = r.grinding && !afterCrash;
    d.running = running;
    d.hidden = crashing && !this.popped;
    d.dizzy = afterCrash && this.popped;
    d.flicker = running && run.collision.invulnerable && !run.mods.invincible;
    const pu = run.powerUps;
    d.boxed = pu.isOn('box') && !afterCrash;
    d.nap = run.napping;
    d.loaf = run.secrets.loafLeft > 0 && !afterCrash;
    d.lift = pu.riding && !afterCrash ? 0.22 : 0;
    this.cat.update(dt, d);
    this.powerFx.update(dt, pu, { x, y: d.y + d.lift, purr: run.abilities.purrLeft > 0 });
    this.bossView.update(dt, run.boss, dist);
    this.fieldView.goldBoost = pu.isOn('treats');
    const canvas = this.renderer.domElement;
    canvas.classList.toggle('fx-catnip', running && pu.isOn('catnip'));
    canvas.classList.toggle('fx-nap', running && run.napping);
    if (running) {
      this.powerHud.update(pu, run.abilities.charge, frameDt);
      this.powerHud.setSpeedLines(pu.isOn('zoomies') || pu.isOn('fishRocket') || r.dashLeft > 0 || pu.isOn('catnip'));
      const boss = run.boss;
      // Banner text only rebuilds when its number changes.
      const alley = run.secrets.inAlley;
      const key = alley ? 1000 + Math.ceil(run.secrets.alleyLeft) : boss.phase === BossPhase.Throwing ? 2000 + boss.dodges : 0;
      if (key !== this.bannerKey) {
        this.bannerKey = key;
        let banner = '';
        if (alley) banner = UI_TEXT.alleyBanner.replace('{s}', String(Math.ceil(run.secrets.alleyLeft)));
        else if (key) banner = UI_TEXT.bossBanner.replace('{n}', String(boss.dodges)).replace('{t}', String(BOSS.throwsToWin));
        this.powerHud.setBanner(banner);
      }
      // Music stems follow speed; the filter closes during power-ups; Catnip pitches up.
      const anyPower = pu.anyActive;
      const catnip = pu.isOn('catnip');
      const S = MUSIC.stems;
      const tierSpeed = r.speed >= S.lead ? 2 : r.speed >= S.bass ? 1 : 0;
      const stemKey = tierSpeed * 4 + (anyPower ? 2 : 0) + (catnip ? 1 : 0);
      if (stemKey !== this.stemKey) {
        this.stemKey = stemKey;
        this.audio.setStems(r.speed, anyPower, catnip);
      }
    }

    const mode = !afterCrash ? PackMode.Run : this.popped ? PackMode.Gloat : PackMode.Pounce;
    if (frozen) this.pack.update(0, run.chase, x, r.speed, mode);
    else this.pack.update(frameDt, run.chase, x, running ? r.speed : 0, mode);
    this.fx.update(frozen ? 0 : frameDt, x, d.y);

    this.rig.update(afterCrash ? frameDt : dt, x, d.y, running ? r.speed : 0, r.flying && !afterCrash);
    if (running || crashing) this.hud.update(run.score, run.satchel, frameDt * 1000);
    this.trail.update(dt, x, d.y + d.lift, r.speed, running && !d.boxed);
    this.juice.update(frozen ? 0 : afterCrash ? frameDt : dt, {
      x,
      y: d.y,
      dist,
      speed: running ? r.speed : 0,
      catnip: running && pu.isOn('catnip'),
      fast: running && (pu.isOn('zoomies') || pu.isOn('fishRocket') || r.dashLeft > 0),
      running,
    });
    // Cat position on screen, for reward fly-to-counter icons.
    this.catScreen.set(x, d.y + 0.9, 0).project(this.rig.camera);
    this.catPx = ((this.catScreen.x + 1) / 2) * this.host.clientWidth;
    this.catPy = ((1 - this.catScreen.y) / 2) * this.host.clientHeight;
    this.sampleQuality(frameDt);
    this.postFx.render(this.scene, this.rig.camera, frameDt);
  };

  private readonly resize = (): void => {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.renderer.setSize(w, h, false);
    this.postFx?.setSize(w, h);
    this.juice?.particles.setViewport(h * this.renderer.getPixelRatio());
    this.rig.resize(w / h);
    this.home.resize(w / h);
    if (this.comic?.active) this.comic.layout();
  };
}
