import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Action,
  GameState,
  Orientation,
  PlayerId,
  Wall,
  GOAL_ROW,
  N,
  applyAction,
  canPlaceWall,
  createGame,
  inBoard,
  legalWalls,
  samePos,
  shortestDist,
  wallFits,
  wallSets,
} from '../rules';
import { BotStyle, chooseBotAction } from '../bots';

// Deterministic LCG so any failure reproduces from its seed.
const makeRng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const randInt = (rng: () => number, n: number) => Math.floor(rng() * n);

/** Every invariant that must hold for any reachable state. Throws with context. */
function assertInvariants(s: GameState, tag: string) {
  // pawns valid + distinct
  assert.ok(inBoard(s.players[0].pos), `${tag}: p0 off board`);
  assert.ok(inBoard(s.players[1].pos), `${tag}: p1 off board`);
  assert.ok(!samePos(s.players[0].pos, s.players[1].pos), `${tag}: pawns overlap`);

  // wall budget
  for (const p of [0, 1] as PlayerId[]) {
    assert.ok(
      s.players[p].wallsLeft >= 0 && s.players[p].wallsLeft <= 10,
      `${tag}: p${p} wallsLeft out of range (${s.players[p].wallsLeft})`,
    );
  }
  const placed = 10 - s.players[0].wallsLeft + (10 - s.players[1].wallsLeft);
  assert.equal(s.walls.length, placed, `${tag}: wall count != walls placed`);

  // wall set internally consistent (no pair overlaps/crosses)
  for (let i = 0; i < s.walls.length; i++) {
    const rest = s.walls.filter((_, j) => j !== i);
    assert.ok(wallFits(rest, s.walls[i]), `${tag}: walls #${i} conflicts with another`);
  }

  // THE safety invariant — neither player is ever sealed off from their goal
  const ws = wallSets(s.walls);
  for (const p of [0, 1] as PlayerId[]) {
    assert.ok(
      shortestDist(s.players[p].pos, GOAL_ROW[p], ws) >= 0,
      `${tag}: p${p} has NO path to goal — engine allowed a trap`,
    );
  }

  // turn + winner coherence
  assert.ok(s.turn === 0 || s.turn === 1, `${tag}: bad turn`);
  if (s.winner !== null) {
    assert.equal(s.players[s.winner].pos.r, GOAL_ROW[s.winner], `${tag}: winner not on goal row`);
    assert.equal(s.turn, s.winner, `${tag}: turn advanced past a win`);
  }
}

/**
 * Independent oracle for move *geometry* — deliberately shares NO code with the
 * engine's stepBlocked/BFS, so it catches "the engine accepted a move it
 * shouldn't have" (a teleport, a jump with no opponent at the midpoint, a
 * diagonal when the opponent isn't beside you). It validates shape only, not
 * wall-blocking. `from`/`opp` are the positions BEFORE the move.
 */
function assertMoveShape(from: { r: number; c: number }, to: { r: number; c: number }, opp: { r: number; c: number }, tag: string) {
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  if (adr + adc === 1) return; // orthogonal step
  if ((adr === 2 && dc === 0) || (dr === 0 && adc === 2)) {
    // straight jump: opponent must sit at the midpoint
    const mid = { r: from.r + dr / 2, c: from.c + dc / 2 };
    assert.ok(samePos(mid, opp), `${tag}: 2-cell jump with no opponent at the midpoint`);
    return;
  }
  if (adr === 1 && adc === 1) {
    // diagonal side-step: opponent must be the orthogonal neighbour shared with `to`
    const ok =
      samePos(opp, { r: from.r + dr, c: from.c }) || samePos(opp, { r: from.r, c: from.c + dc });
    assert.ok(ok, `${tag}: diagonal move without an adjacent opponent to go around`);
    return;
  }
  assert.fail(`${tag}: move of illegal shape ${JSON.stringify(from)}->${JSON.stringify(to)}`);
}

/** Fire clearly-illegal actions and assert they're rejected without mutating state. */
function probeRejections(s: GameState, rng: () => number) {
  const before = JSON.stringify(s);
  const me = s.players[s.turn].pos;

  const illegal: Action[] = [
    { type: 'move', to: { ...me } }, // onto own square
    { type: 'move', to: { r: me.r < 5 ? 8 : 0, c: me.c < 5 ? 8 : 0 } }, // far corner (manhattan >= 4)
    { type: 'wall', wall: { r: 8, c: randInt(rng, 8), o: 'h' } }, // out-of-bounds anchor
    { type: 'wall', wall: { r: randInt(rng, 8), c: 8, o: 'v' } }, // out-of-bounds anchor
  ];
  if (s.walls.length) illegal.push({ type: 'wall', wall: { ...s.walls[0] } }); // exact overlap

  for (const a of illegal) {
    const res = applyAction(s, a);
    assert.equal(res.ok, false, `expected rejection of ${JSON.stringify(a)}`);
  }
  assert.equal(JSON.stringify(s), before, 'rejected action mutated the state');
}

// Mixed policies; at least one side always seeks progress so games terminate.
const PROGRESS: { style: BotStyle; blunder: number }[] = [
  { style: 'runner', blunder: 0.25 },
  { style: 'balanced', blunder: 0.3 },
  { style: 'strategic', blunder: 0.15 },
];
const ANY: { style: BotStyle; blunder: number }[] = [
  { style: 'random', blunder: 0.4 },
  { style: 'blocker', blunder: 0.2 },
  { style: 'runner', blunder: 0.3 },
  { style: 'balanced', blunder: 0.35 },
];

function playGame(seed: number, onStep?: (s: GameState) => void): GameState {
  const rng = makeRng(seed);
  const progressSide: PlayerId = randInt(rng, 2) as PlayerId;
  const pol: Record<PlayerId, { style: BotStyle; blunder: number }> = {
    0: progressSide === 0 ? PROGRESS[randInt(rng, PROGRESS.length)] : ANY[randInt(rng, ANY.length)],
    1: progressSide === 1 ? PROGRESS[randInt(rng, PROGRESS.length)] : ANY[randInt(rng, ANY.length)],
  };

  let s = createGame(randInt(rng, 2) as PlayerId);
  const CAP = 800;
  let steps = 0;
  while (s.winner === null && steps < CAP) {
    assertInvariants(s, `seed ${seed} step ${steps}`);
    if (rng() < 0.1) probeRejections(s, rng);
    onStep?.(s);

    const policy = pol[s.turn];
    const action = chooseBotAction(s, { style: policy.style, blunder: policy.blunder, rng });
    assert.ok(action, `seed ${seed}: bot returned no action`);

    // capture move geometry inputs before the action mutates nothing (engine is pure)
    const mover = s.turn;
    const from = s.players[mover].pos;
    const opp = s.players[1 - mover].pos;

    const res = applyAction(s, action!);
    assert.ok(res.ok, `seed ${seed} step ${steps}: bot produced an ILLEGAL action ${JSON.stringify(action)}`);
    if (res.ok) {
      if (action!.type === 'move') assertMoveShape(from, action!.to, opp, `seed ${seed} step ${steps}`);
      s = res.state;
    }
    steps++;
  }
  assertInvariants(s, `seed ${seed} final`);
  assert.notEqual(s.winner, null, `seed ${seed}: game did not terminate within ${CAP} moves (livelock?)`);
  return s;
}

describe('engine fuzz — invariants over random games', () => {
  it('holds invariants across 800 mixed-policy games', () => {
    for (let seed = 1; seed <= 800; seed++) playGame(seed * 2654435761);
  });
});

describe('engine fuzz — determinism', () => {
  it('same seed produces byte-identical games (engine is pure)', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const a = playGame(seed * 40503);
      const b = playGame(seed * 40503);
      assert.equal(JSON.stringify(a), JSON.stringify(b), `seed ${seed}: non-deterministic`);
    }
  });
});

describe('engine fuzz — no-trap stress', () => {
  it('never accepts a trapping wall while greedily filling the board', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const rng = makeRng(seed * 2246822519);
      let s = createGame();
      let placed = 0;
      for (let tries = 0; tries < 240 && placed < 20; tries++) {
        const w: Wall = { r: randInt(rng, 8), c: randInt(rng, 8), o: rng() < 0.5 ? 'h' : 'v' };
        const check = canPlaceWall(s, w);
        if (!check.ok) continue;
        const res = applyAction(s, { type: 'wall', wall: w });
        assert.ok(res.ok, `seed ${seed}: canPlaceWall said ok but applyAction rejected`);
        if (res.ok) s = res.state;
        placed++;
        assertInvariants(s, `no-trap seed ${seed} placed ${placed}`);
      }
    }
  });

  it('every wall legalWalls() returns actually applies', () => {
    const rng = makeRng(12345);
    let s = createGame();
    // build a mid-game position with a handful of walls
    for (let i = 0; i < 6; i++) {
      const legal = legalWalls(s);
      if (!legal.length) break;
      const w = legal[randInt(rng, legal.length)];
      const res = applyAction(s, { type: 'wall', wall: w });
      assert.ok(res.ok);
      if (res.ok) s = res.state;
    }
    // every wall legalWalls reports for the current player must be applicable
    for (const w of legalWalls(s)) {
      assert.ok(canPlaceWall(s, w).ok, `legalWalls returned a non-placeable wall ${JSON.stringify(w)}`);
    }
  });
});
