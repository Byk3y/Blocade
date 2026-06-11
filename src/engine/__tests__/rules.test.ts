import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Action,
  GameState,
  PlayerId,
  Pos,
  Wall,
  applyAction,
  canPlaceWall,
  createGame,
  legalMoveTargets,
  legalWalls,
  routeDist,
  N,
} from '../rules';
import { chooseBotAction, BotStyle } from '../bots';

const has = (targets: Pos[], r: number, c: number) => targets.some((t) => t.r === r && t.c === c);

/** Build a state by force-setting fields on a fresh game (test helper). */
function makeState(over: {
  p0?: Pos;
  p1?: Pos;
  walls?: Wall[];
  turn?: PlayerId;
  walls0?: number;
  walls1?: number;
}): GameState {
  const g = createGame();
  return {
    ...g,
    players: [
      { pos: over.p0 ?? g.players[0].pos, wallsLeft: over.walls0 ?? 10 },
      { pos: over.p1 ?? g.players[1].pos, wallsLeft: over.walls1 ?? 10 },
    ],
    walls: over.walls ?? [],
    turn: over.turn ?? 0,
  };
}

function mustApply(state: GameState, action: Action): GameState {
  const res = applyAction(state, action);
  assert.ok(res.ok, `action should apply: ${JSON.stringify(action)}`);
  return (res as Extract<typeof res, { ok: true }>).state;
}

describe('setup', () => {
  it('starts players at bottom/top centre with 10 walls each', () => {
    const g = createGame();
    assert.deepEqual(g.players[0].pos, { r: 8, c: 4 });
    assert.deepEqual(g.players[1].pos, { r: 0, c: 4 });
    assert.equal(g.players[0].wallsLeft, 10);
    assert.equal(g.players[1].wallsLeft, 10);
    assert.equal(g.turn, 0);
    assert.equal(g.winner, null);
  });
});

describe('movement', () => {
  it('allows the four orthogonal steps in the open', () => {
    const s = makeState({ p0: { r: 4, c: 4 } });
    const t = legalMoveTargets(s, 0);
    assert.equal(t.length, 4);
    for (const [r, c] of [[3, 4], [5, 4], [4, 3], [4, 5]]) assert.ok(has(t, r, c));
  });

  it('cannot leave the board', () => {
    const s = makeState({ p0: { r: 8, c: 0 }, p1: { r: 0, c: 8 } });
    const t = legalMoveTargets(s, 0);
    assert.ok(!has(t, 9, 0) && !has(t, 8, -1));
    assert.equal(t.length, 2); // up and right only
  });

  it('cannot move through a wall', () => {
    // h wall below row 3 spanning cols 4,5 blocks 4,4 -> 3,4
    const s = makeState({ p0: { r: 4, c: 4 }, walls: [{ r: 3, c: 4, o: 'h' }] });
    const t = legalMoveTargets(s, 0);
    assert.ok(!has(t, 3, 4));
    assert.equal(t.length, 3);
  });

  it('wall blocks from both anchor columns', () => {
    // same wall also blocks 4,5 -> 3,5
    const s = makeState({ p0: { r: 4, c: 5 }, walls: [{ r: 3, c: 4, o: 'h' }] });
    assert.ok(!has(legalMoveTargets(s, 0), 3, 5));
  });

  it('vertical wall blocks horizontal movement', () => {
    // v wall right of col 4 spanning rows 4,5 blocks 4,4 -> 4,5
    const s = makeState({ p0: { r: 4, c: 4 }, walls: [{ r: 4, c: 4, o: 'v' }] });
    const t = legalMoveTargets(s, 0);
    assert.ok(!has(t, 4, 5));
  });

  it('cannot land on the opponent; jumps straight over instead', () => {
    const s = makeState({ p0: { r: 4, c: 4 }, p1: { r: 3, c: 4 } });
    const t = legalMoveTargets(s, 0);
    assert.ok(!has(t, 3, 4), 'cannot land on opponent');
    assert.ok(has(t, 2, 4), 'straight jump');
    assert.ok(!has(t, 3, 3) && !has(t, 3, 5), 'no diagonals while jump is open');
  });

  it('side-steps diagonally when the jump is blocked by a wall', () => {
    const s = makeState({
      p0: { r: 4, c: 4 },
      p1: { r: 3, c: 4 },
      walls: [{ r: 2, c: 4, o: 'h' }], // blocks the 3,4 -> 2,4 jump
    });
    const t = legalMoveTargets(s, 0);
    assert.ok(!has(t, 2, 4), 'jump blocked');
    assert.ok(has(t, 3, 3) && has(t, 3, 5), 'both diagonals open');
  });

  it('side-steps diagonally when the jump would leave the board', () => {
    const s = makeState({ p0: { r: 1, c: 4 }, p1: { r: 0, c: 4 } });
    const t = legalMoveTargets(s, 0);
    assert.ok(!has(t, -1, 4));
    assert.ok(has(t, 0, 3) && has(t, 0, 5));
  });

  it('diagonal side-step respects walls beside the opponent', () => {
    const s = makeState({
      p0: { r: 1, c: 4 },
      p1: { r: 0, c: 4 },
      walls: [{ r: 0, c: 4, o: 'v' }], // blocks 0,4 -> 0,5
    });
    const t = legalMoveTargets(s, 0);
    assert.ok(has(t, 0, 3), 'left diagonal open');
    assert.ok(!has(t, 0, 5), 'right diagonal blocked by wall');
  });

  it('rejects an illegal move and keeps the turn', () => {
    const g = createGame();
    const res = applyAction(g, { type: 'move', to: { r: 5, c: 5 } });
    assert.equal(res.ok, false);
    assert.equal(g.turn, 0, 'state untouched');
  });

  it('a legal move switches the turn', () => {
    const g = createGame();
    const s = mustApply(g, { type: 'move', to: { r: 7, c: 4 } });
    assert.equal(s.turn, 1);
    assert.deepEqual(s.players[0].pos, { r: 7, c: 4 });
    assert.equal(s.moveCounts[0], 1);
  });
});

describe('walls', () => {
  it('placement decrements the stock and switches turn', () => {
    const g = createGame();
    const s = mustApply(g, { type: 'wall', wall: { r: 4, c: 4, o: 'h' } });
    assert.equal(s.players[0].wallsLeft, 9);
    assert.equal(s.turn, 1);
    assert.equal(s.walls.length, 1);
  });

  it('rejects out-of-bounds anchors', () => {
    const g = createGame();
    for (const wall of [
      { r: 8, c: 0, o: 'h' as const },
      { r: 0, c: 8, o: 'v' as const },
      { r: -1, c: 0, o: 'h' as const },
    ]) {
      const res = canPlaceWall(g, wall);
      assert.equal(res.ok, false);
    }
  });

  it('rejects duplicate and overlapping same-orientation walls', () => {
    const s = makeState({ walls: [{ r: 4, c: 4, o: 'h' }] });
    for (const c of [3, 4, 5]) {
      const res = canPlaceWall(s, { r: 4, c, o: 'h' });
      assert.equal(res.ok, false, `h overlap at c=${c}`);
    }
    assert.ok(canPlaceWall(s, { r: 4, c: 2, o: 'h' }).ok, 'two away is fine');
    assert.ok(canPlaceWall(s, { r: 4, c: 6, o: 'h' }).ok);
  });

  it('rejects crossing walls at the same intersection', () => {
    const s = makeState({ walls: [{ r: 4, c: 4, o: 'h' }] });
    const res = canPlaceWall(s, { r: 4, c: 4, o: 'v' });
    assert.equal(res.ok, false);
    // but a v wall one step over is legal
    assert.ok(canPlaceWall(s, { r: 4, c: 5, o: 'v' }).ok);
  });

  it('rejects placement with no walls left', () => {
    const s = makeState({ walls0: 0 });
    const res = canPlaceWall(s, { r: 4, c: 4, o: 'h' });
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, 'no-walls');
  });

  it('rejects a wall that fully traps a player', () => {
    // player 1 at 0,0 — v(0,0) walls off the right of cells (0,0)/(1,0);
    // sealing h(1,0) below row 1 completes a 2-cell cage with no way to row 8
    const s = makeState({
      p1: { r: 0, c: 0 },
      walls: [{ r: 0, c: 0, o: 'v' }],
    });
    const res = canPlaceWall(s, { r: 1, c: 0, o: 'h' });
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, 'traps');
  });

  it('wall rejection does not consume the wall or the turn', () => {
    const s = makeState({ walls0: 3, walls: [{ r: 4, c: 4, o: 'h' }] });
    const res = applyAction(s, { type: 'wall', wall: { r: 4, c: 4, o: 'h' } });
    assert.equal(res.ok, false);
    assert.equal(s.players[0].wallsLeft, 3);
    assert.equal(s.turn, 0);
  });

  it('reports how much a wall slows the opponent', () => {
    const g = createGame();
    const res = applyAction(g, { type: 'wall', wall: { r: 0, c: 3, o: 'h' } });
    assert.ok(res.ok);
    if (res.ok) assert.ok((res.oppPathDelta ?? 0) >= 1, 'blocking the spawn column adds distance');
  });
});

describe('winning', () => {
  it('player 0 wins on row 0', () => {
    const s = makeState({ p0: { r: 1, c: 7 }, p1: { r: 5, c: 0 } });
    const done = mustApply(s, { type: 'move', to: { r: 0, c: 7 } });
    assert.equal(done.winner, 0);
  });

  it('player 1 wins on row 8', () => {
    const s = makeState({ p0: { r: 4, c: 0 }, p1: { r: 7, c: 7 }, turn: 1 });
    const done = mustApply(s, { type: 'move', to: { r: 8, c: 7 } });
    assert.equal(done.winner, 1);
  });

  it('no actions accepted after the game ends', () => {
    const s = makeState({ p0: { r: 1, c: 7 } });
    const done = mustApply(s, { type: 'move', to: { r: 0, c: 7 } });
    const res = applyAction(done, { type: 'move', to: { r: 8, c: 4 } });
    assert.equal(res.ok, false);
  });
});

describe('pathfinding sanity', () => {
  it('open-board route distances are 8', () => {
    const g = createGame();
    assert.equal(routeDist(g, 0), 8);
    assert.equal(routeDist(g, 1), 8);
  });

  it('legalWalls is non-empty on the opening board and all entries verify', () => {
    const g = createGame();
    const walls = legalWalls(g);
    assert.equal(walls.length, 128); // every anchor legal on an empty board
    for (const w of walls.slice(0, 10)) assert.ok(canPlaceWall(g, w).ok);
  });
});

describe('bots', () => {
  const styles: BotStyle[] = ['random', 'runner', 'blocker', 'balanced', 'strategic'];

  // deterministic LCG so failures reproduce
  const makeRng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  for (const style of styles) {
    it(`${style} bot only takes legal actions and finishes a full game`, () => {
      for (let seed = 1; seed <= 3; seed++) {
        const rng = makeRng(seed * 7919);
        let s = createGame();
        let guard = 0;
        while (s.winner === null && guard++ < 600) {
          const action = chooseBotAction(s, { style, blunder: 0.1, rng });
          assert.ok(action, 'bot always has an action');
          const res = applyAction(s, action!);
          assert.ok(res.ok, `bot action must be legal (${style}, seed ${seed})`);
          if (res.ok) s = res.state;
        }
        assert.notEqual(s.winner, null, `${style} game must finish (seed ${seed})`);
      }
    });
  }

  it('strategic beats random over a small series', () => {
    let stratWins = 0;
    const GAMES = 6;
    for (let i = 0; i < GAMES; i++) {
      const rng = makeRng(1000 + i);
      let s = createGame(i % 2 === 0 ? 0 : 1); // alternate first player
      let guard = 0;
      while (s.winner === null && guard++ < 600) {
        const style: BotStyle = s.turn === 0 ? 'strategic' : 'random';
        const action = chooseBotAction(s, { style, blunder: style === 'random' ? 0.3 : 0, rng });
        const res = applyAction(s, action!);
        assert.ok(res.ok);
        if (res.ok) s = res.state;
      }
      if (s.winner === 0) stratWins++;
    }
    assert.ok(stratWins >= GAMES - 1, `strategic should dominate random (won ${stratWins}/${GAMES})`);
  });
});
