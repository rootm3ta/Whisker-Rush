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
import { applyEnvironment } from '../world/Environment';
import { Track } from '../world/Track';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { Action, Input } from './Input';
import { FixedLoop } from './Loop';
import { Rng } from './Rng';
import { StateMachine } from './StateMachine';

export type AppState = 'boot' | 'home' | 'run' | 'paused' | 'crashing' | 'gameOver' | 'reviving';

/** Wires simulation, rendering, input, platform services and app flow together. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly run = new RunSession(this.bus);
  private readonly save = new Save(new LocalStorageAdapter());
  private readonly ads: IAds;
  private readonly track: Track;
  private readonly fieldView = new FieldView();
  private readonly cat: Cat;
  private readonly pack = new DogPack();
  private readonly fx = new CrashFx();
  private readonly powerFx = new PowerFx();
  private readonly bossView = new BossView();
  private readonly powerHud: PowerHud;
  private freshRun = false;
  private readonly fogBase = new THREE.Color();
  private skyBase: THREE.Texture | THREE.Color | null = null;
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
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    const palette = CITIES.mapleLane.palette;
    applyEnvironment(this.scene, palette);
    this.track = new Track(palette);
    this.cat = new Cat(this.bus);
    this.scene.add(this.track.root, this.fieldView.root, this.cat.holder, this.cat.shadow, this.pack.root, this.fx.root);
    this.scene.add(this.powerFx.root, this.bossView.root);
    this.fogBase.copy((this.scene.fog as THREE.Fog).color);
    this.skyBase = this.scene.background as THREE.Texture;

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
    };
    this.market = new MarketScreen(ctx);
    this.screens = {
      upgrades: new UpgradesScreen(ctx),
      wardrobe: new WardrobeScreen(ctx, (on) => {
        this.home.previewOn = on;
        this.home.spin = 0;
      }),
      missions: new MissionsScreen(ctx),
      calendar: new CalendarScreen(ctx),
      pass: new PassScreen(ctx),
      settings: new SettingsScreen(ctx, () => {
        this.save.reset();
        this.fsm.go('boot');
        this.fsm.go('home');
      }),
    };
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
        boot: {},
        home: {
          enter: () => {
            const p = this.save.profile;
            this.run.reset(undefined, p, Date.now(), computeRunConfig(p));
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
            this.overlay.hide();
            this.homeHud.visible = true;
            this.refreshMeta();
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
    b.on('crash', () => this.rig.addShake(0.3));
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
    const fog = this.scene.fog as THREE.Fog;
    if (on) {
      fog.color.copy(this.alleyColor);
      this.scene.background = this.alleyColor;
    } else {
      fog.color.copy(this.fogBase);
      this.scene.background = this.skyBase;
    }
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
    this.fsm.go('home');
    if (overflow > 0) popup(this.host, 'Stash full', [`Tom bought the overflow for ${overflow} coins.`]);
    if (loot.length > 0) this.market.open();
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
  }

  private startRun(): void {
    if (!this.fsm.is('home') || this.anySheetOpen()) return;
    this.fsm.go('run');
  }

  private anySheetOpen(): boolean {
    return document.querySelector('.wr-sheet:not([hidden]), .wr-popup') !== null;
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
        popup(this.host, 'World Tour', ['Rome is packing its bags.', 'The map opens in the next update.']);
        break;
      case 'miso':
        this.homeHud.say(this.home.poke(this.pokes++), x, y - 20);
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
    const dt = realDt * this.timeScale;
    this.simTime += dt;
    this.fsm.update(dt);
  };

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
    this.renderer.render(h.scene, h.camera);
  }

  private readonly render = (alpha: number, frameDt: number): void => {
    if (this.fsm.is('home')) {
      this.renderHome(frameDt);
      return;
    }
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
      let banner = '';
      if (run.secrets.inAlley) banner = UI_TEXT.alleyBanner.replace('{s}', String(Math.ceil(run.secrets.alleyLeft)));
      else if (boss.phase === BossPhase.Throwing) banner = UI_TEXT.bossBanner.replace('{n}', String(boss.dodges)).replace('{t}', String(BOSS.throwsToWin));
      this.powerHud.setBanner(banner);
    }

    const mode = !afterCrash ? PackMode.Run : this.popped ? PackMode.Gloat : PackMode.Pounce;
    if (frozen) this.pack.update(0, run.chase, x, r.speed, mode);
    else this.pack.update(frameDt, run.chase, x, running ? r.speed : 0, mode);
    this.fx.update(frozen ? 0 : frameDt, x, d.y);

    this.rig.update(afterCrash ? frameDt : dt, x, d.y, running ? r.speed : 0, r.flying && !afterCrash);
    if (running || crashing) this.hud.update(run.score, run.satchel, frameDt * 1000);
    this.trail.update(dt, x, d.y + d.lift, r.speed, running && !d.boxed);
    this.renderer.render(this.scene, this.rig.camera);
  };

  private readonly resize = (): void => {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / h);
    this.home.resize(w / h);
  };
}
