import { Rng } from '../core/Rng';
import { CHALLENGE, CHALLENGES, MISSIONS, MISSION_SET, PASS, type MissionDef, type MissionStat } from '../data/economy';
import { grant } from './Rewards';
import type { MissionSlot, Profile } from './Save';
import { seedOf } from './Time';

export type RunStats = Partial<Record<MissionStat, number>>;

const byId = new Map([...MISSIONS, ...CHALLENGES].map((m) => [m.id, m]));

export function missionDef(id: string): MissionDef {
  return byId.get(id)!;
}

/** Target for a mission in a given set (targets grow each completed set). */
export function missionTarget(id: string, set: number): number {
  const d = missionDef(id);
  if (d.target <= 1) return d.target;
  return Math.round(d.target * (1 + MISSION_SET.growth * set));
}

export function missionText(id: string, set: number): string {
  return missionDef(id).text.replace('{n}', String(missionTarget(id, set)));
}

/** Draws the 3 missions of a set deterministically from the set index. */
export function drawMissionSet(set: number): MissionSlot[] {
  const rng = new Rng(seedOf(set, 3));
  const pool = MISSIONS.map((m) => m.id);
  const out: MissionSlot[] = [];
  while (out.length < MISSION_SET.size) out.push({ id: pool.splice(rng.int(0, pool.length), 1)[0], progress: 0 });
  return out;
}

export function ensureMissions(p: Profile): void {
  if (p.missions.active.length === 0) p.missions.active = drawMissionSet(p.missions.set);
}

export function ensureChallenges(p: Profile, day: number): void {
  if (p.challenges.day === day && p.challenges.list.length) return;
  const rng = new Rng(seedOf(day, 4));
  const pool = CHALLENGES.map((m) => m.id);
  const list: Profile['challenges']['list'] = [];
  while (list.length < CHALLENGE.perDay) list.push({ id: pool.splice(rng.int(0, pool.length), 1)[0], progress: 0, done: false });
  p.challenges = { day, list };
}

function advance(slot: MissionSlot, stats: RunStats): void {
  const d = missionDef(slot.id);
  const v = stats[d.stat] ?? 0;
  slot.progress = d.scope === 'run' ? Math.max(slot.progress, v) : slot.progress + v;
}

export interface MissionResult {
  completed: string[];
  setDone: boolean;
  challengesDone: number;
  rewards: string[];
}

/**
 * Applies stats (from a run, or from selling) to missions and today's challenges.
 * Completing all 3 missions bumps the permanent multiplier and pays the set reward.
 */
export function applyStats(p: Profile, stats: RunStats, day: number, rng: Rng): MissionResult {
  ensureMissions(p);
  ensureChallenges(p, day);
  const res: MissionResult = { completed: [], setDone: false, challengesDone: 0, rewards: [] };
  for (const k in stats) p.totals[k as MissionStat] = (p.totals[k as MissionStat] ?? 0) + (stats[k as MissionStat] ?? 0);

  const set = p.missions.set;
  for (const m of p.missions.active) {
    const target = missionTarget(m.id, set);
    if (m.progress >= target) continue;
    advance(m, stats);
    if (m.progress >= target) {
      res.completed.push(m.id);
      p.pass.stamps += PASS.stamps.mission;
    }
  }
  if (p.missions.active.every((m) => m.progress >= missionTarget(m.id, set))) {
    res.setDone = true;
    p.missions.multiplier = Math.min(MISSION_SET.maxMultiplier, p.missions.multiplier + 1);
    p.missions.set++;
    p.missions.active = drawMissionSet(p.missions.set);
    p.pass.stamps += PASS.stamps.missionSet;
    res.rewards.push(...grant(p, MISSION_SET.reward, rng));
  }
  for (const c of p.challenges.list) {
    if (c.done) continue;
    advance(c, stats);
    if (c.progress >= missionTarget(c.id, 0)) {
      c.done = true;
      res.challengesDone++;
      p.pass.stamps += PASS.stamps.challenge;
      res.rewards.push(...grant(p, { fishBones: CHALLENGE.fishBones }, rng));
    }
  }
  return res;
}
