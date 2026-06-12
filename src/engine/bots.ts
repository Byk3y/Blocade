/**
 * Bot AI — a single strong evaluation policy with tunable search depth, so the
 * roster forms a *real* strength ladder instead of a dozen 1-ply clones.
 *
 *   strength  = search depth (1 vs 2-ply negamax) + how low the blunder rate is
 *   personality = how readily the bot reaches for walls (rootWalls + wallBias)
 *
 * Everything routes through the same engine a human uses, so every action is
 * legal and the no-trap rule is always respected.
 */

import {
  Action,
  GameState,
  Orientation,
  PlayerId,
  Wall,
  applyAction,
  canPlaceWall,
  legalMoveTargets,
  routeDist,
  shortestPath,
} from './rules';

export type BotStyle = 'random' | 'runner' | 'blocker' | 'balanced' | 'strategic';

/** Per-bot search tuning. Strength = depth + width; wallBias is pure flavor. */
export interface BotSkill {
  depth: number; // 1 = greedy eval, 2 = one-ply lookahead
  rootWalls: number; // candidate walls considered for the bot's own move
  replyWalls: number; // candidate walls considered for the opponent's reply
  wallBias: number; // personality nudge toward (>0) or away from (<0) walls
}

export interface BotOptions {
  style: BotStyle;
  /** 0 = always plays its best, 1 = pure noise */
  blunder?: number;
  rng?: () => number;
  /** overrides the style's default skill (used to grade the Advanced tier) */
  tuning?: Partial<BotSkill>;
}

const WIN = 1000; // dominates the eval range so a winning move is always taken
const WALL_W = 0.15; // mild value on keeping more walls than the opponent

const randInt = (rng: () => number, n: number) => Math.floor(rng() * n);

// ---- evaluation ------------------------------------------------------------

/** Route advantage for `player`: how much closer they are than the opponent. */
function evalFor(state: GameState, player: PlayerId): number {
  const opp = (1 - player) as PlayerId;
  const me = routeDist(state, player);
  const theirs = routeDist(state, opp);
  return theirs - me + WALL_W * (state.players[player].wallsLeft - state.players[opp].wallsLeft);
}

// ---- candidate walls (pruning) --------------------------------------------

/** Walls touching the opponent's shortest route — the only ones worth scoring. */
function candidateWalls(state: GameState, player: PlayerId): Wall[] {
  const opp = (1 - player) as PlayerId;
  if (state.players[player].wallsLeft <= 0) return [];
  const path = shortestPath(state, opp) ?? [];
  const cells = [state.players[opp].pos, ...path];
  const seen = new Set<string>();
  const out: Wall[] = [];
  for (const cell of cells) {
    for (const o of ['h', 'v'] as Orientation[]) {
      for (const [dr, dc] of [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [0, 0],
      ]) {
        const w = { r: cell.r + dr, c: cell.c + dc, o };
        const key = `${o}${w.r},${w.c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (canPlaceWall(state, w, player).ok) out.push(w);
      }
    }
  }
  return out;
}

/** Candidate walls ranked by how much they lengthen the opponent's route. */
function rankedWalls(state: GameState, player: PlayerId, topK: number): Wall[] {
  if (topK <= 0 || state.players[player].wallsLeft <= 0) return [];
  const opp = (1 - player) as PlayerId;
  const oppBefore = routeDist(state, opp);
  return candidateWalls(state, player)
    .map((wall) => ({ wall, gain: routeDist(state, opp, wall) - oppBefore }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, topK)
    .map((x) => x.wall);
}

// ---- search ----------------------------------------------------------------

function actionsFor(state: GameState, player: PlayerId, walls: number): Action[] {
  const moves: Action[] = legalMoveTargets(state, player).map((to) => ({ type: 'move', to }));
  const wallActs: Action[] = rankedWalls(state, player, walls).map((wall) => ({ type: 'wall', wall }));
  return [...moves, ...wallActs];
}

/** Negamax value from the perspective of the side to move in `state`. */
function negamax(state: GameState, depth: number, replyWalls: number): number {
  const player = state.turn;
  let best = -Infinity;
  for (const a of actionsFor(state, player, replyWalls)) {
    const res = applyAction(state, a);
    if (!res.ok) continue;
    let val: number;
    if (res.state.winner !== null) val = WIN;
    else if (depth <= 1) val = evalFor(res.state, player);
    else val = -negamax(res.state, depth - 1, replyWalls);
    if (val > best) best = val;
  }
  return best;
}

/** Pick the best action for the side to move, with a personality nudge on walls. */
function chooseBest(state: GameState, cfg: BotSkill): Action | null {
  const player = state.turn;
  let best: Action | null = null;
  let bestVal = -Infinity;
  for (const a of actionsFor(state, player, cfg.rootWalls)) {
    const res = applyAction(state, a);
    if (!res.ok) continue;
    let val: number;
    if (res.state.winner !== null) val = WIN;
    else if (cfg.depth <= 1) val = evalFor(res.state, player);
    else val = -negamax(res.state, cfg.depth - 1, cfg.replyWalls);
    if (a.type === 'wall') val += cfg.wallBias;
    if (val > bestVal) {
      bestVal = val;
      best = a;
    }
  }
  return best;
}

// ---- personality presets ---------------------------------------------------

// Strength comes from DEPTH (1 vs 2-ply lookahead ≈ 99% win) and blunder — those
// are the only real levers. Measurements showed search WIDTH barely matters and
// that leaning on walls is simply stronger play, so wallBias is kept tiny: just
// enough to flavour HOW a bot plays (a runner races, a blocker reaches for walls)
// without flipping the rating ladder. depth-1 styles share one base policy.
const STYLE: Record<BotStyle, BotSkill> = {
  random: { depth: 1, rootWalls: 6, replyWalls: 0, wallBias: 0 },
  runner: { depth: 1, rootWalls: 5, replyWalls: 0, wallBias: -0.15 }, // slight lean to racing
  blocker: { depth: 1, rootWalls: 7, replyWalls: 0, wallBias: 0.15 }, // slight lean to walls
  balanced: { depth: 1, rootWalls: 6, replyWalls: 0, wallBias: 0 },
  strategic: { depth: 2, rootWalls: 6, replyWalls: 1, wallBias: 0 }, // real lookahead
};

/** A blundered action: usually a random legal move, occasionally a stray wall. */
function randomAction(state: GameState, rng: () => number): Action | null {
  const player = state.turn;
  if (state.players[player].wallsLeft > 0 && rng() < 0.2) {
    for (let i = 0; i < 10; i++) {
      const w: Wall = { r: randInt(rng, 8), c: randInt(rng, 8), o: rng() < 0.5 ? 'h' : 'v' };
      if (canPlaceWall(state, w, player).ok) return { type: 'wall', wall: w };
    }
  }
  const moves = legalMoveTargets(state, player);
  return moves.length ? { type: 'move', to: moves[randInt(rng, moves.length)] } : null;
}

export function chooseBotAction(state: GameState, opts: BotOptions): Action | null {
  const rng = opts.rng ?? Math.random;
  const blunder = opts.blunder ?? 0;
  const cfg: BotSkill = { ...STYLE[opts.style], ...opts.tuning };

  if (rng() < blunder) {
    return randomAction(state, rng) ?? chooseBest(state, cfg);
  }
  return chooseBest(state, cfg) ?? randomAction(state, rng);
}
