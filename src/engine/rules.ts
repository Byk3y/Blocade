/**
 * Blocade rules engine — pure TypeScript, no React/UI imports.
 *
 * Coordinates: rows 0..8 top→bottom, cols 0..8 left→right (matches the UI).
 * Player 0 ("you" / blue) starts at the BOTTOM centre (8,4) and wins on row 0.
 * Player 1 (rival / orange) starts at the TOP centre (0,4) and wins on row 8.
 *
 * Walls use Quoridor anchoring: a wall at intersection (r,c) — r,c ∈ 0..7 —
 *   'h' spans the gap BELOW row r, across columns c and c+1
 *   'v' spans the gap RIGHT of column c, across rows r and r+1
 * which is exactly the convention the design mock renders with.
 */

export const N = 9;
export const WALLS_PER_PLAYER = 10;

export type PlayerId = 0 | 1;
export interface Pos {
  r: number;
  c: number;
}
export type Orientation = 'h' | 'v';
export interface Wall {
  r: number;
  c: number;
  o: Orientation;
}

export type Action = { type: 'move'; to: Pos } | { type: 'wall'; wall: Wall };

export interface PlayerState {
  pos: Pos;
  wallsLeft: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  walls: Wall[];
  turn: PlayerId;
  winner: PlayerId | null;
  /** actions taken by each player */
  moveCounts: [number, number];
}

export type RejectReason =
  | 'game-over'
  | 'illegal-move'
  | 'out-of-bounds'
  | 'no-walls'
  | 'overlap'
  | 'traps';

export type ApplyResult =
  | {
      ok: true;
      state: GameState;
      /** for wall actions: how much longer the opponent's shortest route got */
      oppPathDelta?: number;
      /** for wall actions: how much longer the placer's own route got */
      ownPathDelta?: number;
    }
  | { ok: false; reason: RejectReason };

export const GOAL_ROW: Record<PlayerId, number> = { 0: 0, 1: N - 1 };

export function createGame(first: PlayerId = 0): GameState {
  return {
    players: [
      { pos: { r: N - 1, c: 4 }, wallsLeft: WALLS_PER_PLAYER },
      { pos: { r: 0, c: 4 }, wallsLeft: WALLS_PER_PLAYER },
    ],
    walls: [],
    turn: first,
    winner: null,
    moveCounts: [0, 0],
  };
}

export const inBoard = (p: Pos) => p.r >= 0 && p.r < N && p.c >= 0 && p.c < N;
export const samePos = (a: Pos, b: Pos) => a.r === b.r && a.c === b.c;

// ---- wall lookup ----------------------------------------------------------

const wkey = (r: number, c: number) => r * 8 + c;

export interface WallSets {
  h: Set<number>;
  v: Set<number>;
}

export function wallSets(walls: Wall[], extra?: Wall): WallSets {
  const h = new Set<number>();
  const v = new Set<number>();
  for (const w of walls) (w.o === 'h' ? h : v).add(wkey(w.r, w.c));
  if (extra) (extra.o === 'h' ? h : v).add(wkey(extra.r, extra.c));
  return { h, v };
}

/** Is the single step from `a` to adjacent cell `b` blocked by a wall? */
export function stepBlocked(a: Pos, b: Pos, ws: WallSets): boolean {
  if (b.r === a.r + 1) return ws.h.has(wkey(a.r, a.c)) || ws.h.has(wkey(a.r, a.c - 1));
  if (b.r === a.r - 1) return ws.h.has(wkey(b.r, b.c)) || ws.h.has(wkey(b.r, b.c - 1));
  if (b.c === a.c + 1) return ws.v.has(wkey(a.r, a.c)) || ws.v.has(wkey(a.r - 1, a.c));
  if (b.c === a.c - 1) return ws.v.has(wkey(b.r, b.c)) || ws.v.has(wkey(b.r - 1, b.c));
  return true; // not adjacent
}

// ---- movement -------------------------------------------------------------

const DIRS: Pos[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

/**
 * All cells the given player may move to: orthogonal steps, the straight jump
 * over an adjacent opponent, and — only when that jump is blocked by a wall or
 * the board edge — the diagonal side-steps around the opponent.
 */
export function legalMoveTargets(state: GameState, player: PlayerId = state.turn): Pos[] {
  const me = state.players[player].pos;
  const opp = state.players[1 - player].pos;
  const ws = wallSets(state.walls);
  const out: Pos[] = [];

  for (const d of DIRS) {
    const n1 = { r: me.r + d.r, c: me.c + d.c };
    if (!inBoard(n1) || stepBlocked(me, n1, ws)) continue;

    if (!samePos(n1, opp)) {
      out.push(n1);
      continue;
    }

    // opponent directly adjacent — try the straight jump
    const n2 = { r: n1.r + d.r, c: n1.c + d.c };
    if (inBoard(n2) && !stepBlocked(n1, n2, ws)) {
      out.push(n2);
      continue;
    }

    // jump blocked → diagonal side-steps around the opponent
    const perps = d.r !== 0 ? [{ r: 0, c: -1 }, { r: 0, c: 1 }] : [{ r: -1, c: 0 }, { r: 1, c: 0 }];
    for (const pd of perps) {
      const n3 = { r: n1.r + pd.r, c: n1.c + pd.c };
      if (inBoard(n3) && !stepBlocked(n1, n3, ws) && !samePos(n3, me)) out.push(n3);
    }
  }
  return out;
}

// ---- pathfinding ----------------------------------------------------------

/**
 * BFS shortest distance from `from` to the goal row, ignoring pawns
 * (standard Quoridor reachability). Returns -1 when no route exists.
 */
export function shortestDist(from: Pos, goalRow: number, ws: WallSets): number {
  if (from.r === goalRow) return 0;
  const seen = new Uint8Array(N * N);
  const queue: number[] = [from.r * N + from.c];
  const dist: number[] = [0];
  seen[queue[0]] = 1;
  for (let i = 0; i < queue.length; i++) {
    const r = Math.floor(queue[i] / N);
    const c = queue[i] % N;
    for (const d of DIRS) {
      const nr = r + d.r;
      const nc = c + d.c;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const id = nr * N + nc;
      if (seen[id]) continue;
      if (stepBlocked({ r, c }, { r: nr, c: nc }, ws)) continue;
      if (nr === goalRow) return dist[i] + 1;
      seen[id] = 1;
      queue.push(id);
      dist.push(dist[i] + 1);
    }
  }
  return -1;
}

/** Shortest route for a player as a list of cells (excluding start), or null. */
export function shortestPath(state: GameState, player: PlayerId, extra?: Wall): Pos[] | null {
  const ws = wallSets(state.walls, extra);
  const from = state.players[player].pos;
  const goalRow = GOAL_ROW[player];
  if (from.r === goalRow) return [];

  const prev = new Int16Array(N * N).fill(-2);
  const start = from.r * N + from.c;
  prev[start] = -1;
  const queue = [start];
  let goal = -1;
  for (let i = 0; i < queue.length && goal < 0; i++) {
    const r = Math.floor(queue[i] / N);
    const c = queue[i] % N;
    for (const d of DIRS) {
      const nr = r + d.r;
      const nc = c + d.c;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const id = nr * N + nc;
      if (prev[id] !== -2) continue;
      if (stepBlocked({ r, c }, { r: nr, c: nc }, ws)) continue;
      prev[id] = queue[i];
      if (nr === goalRow) {
        goal = id;
        break;
      }
      queue.push(id);
    }
  }
  if (goal < 0) return null;
  const path: Pos[] = [];
  for (let id = goal; id !== start; id = prev[id]) path.unshift({ r: Math.floor(id / N), c: id % N });
  return path;
}

export function routeDist(state: GameState, player: PlayerId, extra?: Wall): number {
  return shortestDist(state.players[player].pos, GOAL_ROW[player], wallSets(state.walls, extra));
}

// ---- wall placement -------------------------------------------------------

/** Geometric legality only (bounds + overlap/cross), no path check. */
export function wallFits(walls: Wall[], w: Wall): boolean {
  if (w.r < 0 || w.r > 7 || w.c < 0 || w.c > 7) return false;
  for (const x of walls) {
    if (x.o === w.o) {
      if (w.o === 'h' && x.r === w.r && Math.abs(x.c - w.c) <= 1) return false;
      if (w.o === 'v' && x.c === w.c && Math.abs(x.r - w.r) <= 1) return false;
    } else if (x.r === w.r && x.c === w.c) {
      return false; // crossing at the same intersection
    }
  }
  return true;
}

export function canPlaceWall(
  state: GameState,
  w: Wall,
  player: PlayerId = state.turn,
): { ok: true } | { ok: false; reason: RejectReason } {
  if (state.players[player].wallsLeft <= 0) return { ok: false, reason: 'no-walls' };
  if (w.r < 0 || w.r > 7 || w.c < 0 || w.c > 7) return { ok: false, reason: 'out-of-bounds' };
  if (!wallFits(state.walls, w)) return { ok: false, reason: 'overlap' };
  // the no-trap rule: both players must keep at least one route
  const ws = wallSets(state.walls, w);
  for (const p of [0, 1] as PlayerId[]) {
    if (shortestDist(state.players[p].pos, GOAL_ROW[p], ws) < 0) return { ok: false, reason: 'traps' };
  }
  return { ok: true };
}

/** Every geometrically + path-legal wall for the current player. */
export function legalWalls(state: GameState, player: PlayerId = state.turn): Wall[] {
  const out: Wall[] = [];
  if (state.players[player].wallsLeft <= 0) return out;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      for (const o of ['h', 'v'] as Orientation[]) {
        const w = { r, c, o };
        if (canPlaceWall(state, w, player).ok) out.push(w);
      }
  return out;
}

// ---- applying actions -----------------------------------------------------

export function applyAction(state: GameState, action: Action): ApplyResult {
  if (state.winner !== null) return { ok: false, reason: 'game-over' };
  const p = state.turn;

  if (action.type === 'move') {
    const ok = legalMoveTargets(state, p).some((t) => samePos(t, action.to));
    if (!ok) return { ok: false, reason: 'illegal-move' };
    const players: [PlayerState, PlayerState] = [
      { ...state.players[0] },
      { ...state.players[1] },
    ];
    players[p] = { ...players[p], pos: action.to };
    const winner = action.to.r === GOAL_ROW[p] ? p : null;
    const moveCounts: [number, number] = [...state.moveCounts];
    moveCounts[p]++;
    return {
      ok: true,
      state: { ...state, players, winner, turn: winner === null ? ((1 - p) as PlayerId) : p, moveCounts },
    };
  }

  const check = canPlaceWall(state, action.wall, p);
  if (!check.ok) return check;

  const oppBefore = routeDist(state, (1 - p) as PlayerId);
  const ownBefore = routeDist(state, p);
  const players: [PlayerState, PlayerState] = [{ ...state.players[0] }, { ...state.players[1] }];
  players[p] = { ...players[p], wallsLeft: players[p].wallsLeft - 1 };
  const moveCounts: [number, number] = [...state.moveCounts];
  moveCounts[p]++;
  const next: GameState = {
    ...state,
    players,
    walls: [...state.walls, action.wall],
    turn: (1 - p) as PlayerId,
    moveCounts,
  };
  return {
    ok: true,
    state: next,
    oppPathDelta: routeDist(next, (1 - p) as PlayerId) - oppBefore,
    ownPathDelta: routeDist(next, p) - ownBefore,
  };
}
