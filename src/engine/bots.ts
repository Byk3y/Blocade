/**
 * Bot AI — five play styles per the product brief, all returning real legal
 * actions through the same rules engine the human uses.
 *
 *   random    — picks among legal moves, occasionally drops a random wall
 *   runner    — beelines along its shortest route, rarely blocks
 *   blocker   — hunts for walls that hurt the player's route, over-blocks
 *   balanced  — runs when ahead, blocks when behind
 *   strategic — scores every candidate action by route advantage
 *
 * `blunder` (0..1) makes weaker bots pick a worse action sometimes, so ratings
 * feel different even within a style.
 */

import {
  Action,
  GameState,
  Orientation,
  PlayerId,
  Pos,
  Wall,
  canPlaceWall,
  legalMoveTargets,
  routeDist,
  shortestDist,
  shortestPath,
  wallSets,
  GOAL_ROW,
} from './rules';

export type BotStyle = 'random' | 'runner' | 'blocker' | 'balanced' | 'strategic';

export interface BotOptions {
  style: BotStyle;
  /** 0 = plays its best, 1 = mostly noise */
  blunder?: number;
  rng?: () => number;
}

// ---- helpers ---------------------------------------------------------------

const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/** Distance to goal a move target would leave the bot with. */
function distAfterMove(state: GameState, p: PlayerId, to: Pos): number {
  return shortestDist(to, GOAL_ROW[p], wallSets(state.walls));
}

/** The move that minimises the bot's remaining route. */
function bestMove(state: GameState, p: PlayerId, rng: () => number): Action | null {
  const targets = legalMoveTargets(state, p);
  if (targets.length === 0) return null;
  let best: Pos[] = [];
  let bestD = Infinity;
  for (const t of targets) {
    const d = distAfterMove(state, p, t);
    if (d < 0) continue;
    if (d < bestD) {
      bestD = d;
      best = [t];
    } else if (d === bestD) best.push(t);
  }
  const to = best.length ? pick(best, rng) : pick(targets, rng);
  return { type: 'move', to };
}

function randomMove(state: GameState, p: PlayerId, rng: () => number): Action | null {
  const targets = legalMoveTargets(state, p);
  return targets.length ? { type: 'move', to: pick(targets, rng) } : null;
}

/**
 * Candidate walls worth scoring: every anchor touching a cell on the
 * opponent's current shortest route (that's where blocking changes anything),
 * filtered down to fully legal placements.
 */
function candidateWalls(state: GameState, p: PlayerId): Wall[] {
  const opp = (1 - p) as PlayerId;
  if (state.players[p].wallsLeft <= 0) return [];
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
        const key = `${w.o}${w.r},${w.c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (canPlaceWall(state, w, p).ok) out.push(w);
      }
    }
  }
  return out;
}

interface ScoredWall {
  wall: Wall;
  /** opponent slowdown minus self-damage */
  score: number;
  oppDelta: number;
}

function scoreWalls(state: GameState, p: PlayerId): ScoredWall[] {
  const opp = (1 - p) as PlayerId;
  const oppBefore = routeDist(state, opp);
  const ownBefore = routeDist(state, p);
  return candidateWalls(state, p)
    .map((wall) => {
      const oppDelta = routeDist(state, opp, wall) - oppBefore;
      const ownDelta = routeDist(state, p, wall) - ownBefore;
      return { wall, oppDelta, score: oppDelta - ownDelta };
    })
    .sort((a, b) => b.score - a.score);
}

// ---- the styles ------------------------------------------------------------

export function chooseBotAction(state: GameState, opts: BotOptions): Action | null {
  const rng = opts.rng ?? Math.random;
  const blunder = opts.blunder ?? 0;
  const p = state.turn;

  // every style occasionally fumbles based on its blunder rating
  if (rng() < blunder) {
    const noise = randomMove(state, p, rng);
    if (noise) return noise;
  }

  switch (opts.style) {
    case 'random': {
      if (state.players[p].wallsLeft > 0 && rng() < 0.25) {
        // try a handful of random anchors; place the first legal one
        for (let i = 0; i < 12; i++) {
          const w: Wall = {
            r: Math.floor(rng() * 8),
            c: Math.floor(rng() * 8),
            o: rng() < 0.5 ? 'h' : 'v',
          };
          if (canPlaceWall(state, w, p).ok) return { type: 'wall', wall: w };
        }
      }
      return randomMove(state, p, rng);
    }

    case 'runner': {
      // rarely blocks — only a desperate wall when clearly losing the race
      if (
        state.players[p].wallsLeft > 0 &&
        rng() < 0.12 &&
        routeDist(state, p) > routeDist(state, (1 - p) as PlayerId)
      ) {
        const walls = scoreWalls(state, p);
        if (walls.length && walls[0].score > 0) return { type: 'wall', wall: walls[0].wall };
      }
      return bestMove(state, p, rng);
    }

    case 'blocker': {
      // walls first, asks questions later
      if (state.players[p].wallsLeft > 0 && rng() < 0.7) {
        const walls = scoreWalls(state, p);
        // happy to place even mildly annoying walls
        const annoying = walls.filter((w) => w.oppDelta > 0);
        if (annoying.length) return { type: 'wall', wall: annoying[0].wall };
      }
      return bestMove(state, p, rng);
    }

    case 'balanced': {
      const mine = routeDist(state, p);
      const theirs = routeDist(state, (1 - p) as PlayerId);
      if (mine <= theirs || state.players[p].wallsLeft === 0) return bestMove(state, p, rng);
      const walls = scoreWalls(state, p);
      if (walls.length && walls[0].score > 0) return { type: 'wall', wall: walls[0].wall };
      return bestMove(state, p, rng);
    }

    case 'strategic': {
      // score every action by resulting route advantage (their dist − mine)
      const opp = (1 - p) as PlayerId;
      const theirs = routeDist(state, opp);
      type Scored = { action: Action; score: number };
      const options: Scored[] = [];

      for (const to of legalMoveTargets(state, p)) {
        const d = distAfterMove(state, p, to);
        if (d < 0) continue;
        // +0.25 bias: with equal scores, making progress beats stalling
        options.push({ action: { type: 'move', to }, score: theirs - d + 0.25 });
      }
      const mine = routeDist(state, p);
      for (const sw of scoreWalls(state, p).slice(0, 24)) {
        const ownAfter = mine + (sw.oppDelta - sw.score); // ownDelta = oppDelta − score
        options.push({
          action: { type: 'wall', wall: sw.wall },
          score: theirs + sw.oppDelta - ownAfter,
        });
      }
      if (!options.length) return randomMove(state, p, rng);
      options.sort((a, b) => b.score - a.score);
      return options[0].action;
    }
  }
}
