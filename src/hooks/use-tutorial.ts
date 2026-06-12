import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Action,
  GameState,
  GOAL_ROW,
  Pos,
  Wall,
  WALLS_PER_PLAYER,
  applyAction,
  legalMoveTargets,
  shortestDist,
  wallSets,
} from '../engine';

/**
 * The guided first match against Pebble. Not real free play: Pebble walks his
 * shortest path each turn (deterministic), and the player is gated to exactly
 * the one mechanic each beat teaches — move, jump, wall, win. Pebble's voice
 * carries the personality; the `coach` line carries the instruction.
 */

export type Phase = 'move' | 'jump' | 'wall' | 'win';

interface Beat {
  phase: Phase;
  /** the quiet system instruction — what to tap */
  coach: string;
  /** the one move/jump target tile (move & jump beats) */
  target?: Pos;
  /** a hint ghost showing roughly where the wall goes (wall beat) */
  targetWall?: Wall;
  /** Pebble's line, said as he takes his reply turn after your action */
  pebble: string;
}

/** You (blue) start mid-board heading up; Pebble (orange) a few rows above. */
function seed(): GameState {
  return {
    players: [
      { pos: { r: 4, c: 4 }, wallsLeft: WALLS_PER_PLAYER },
      { pos: { r: 1, c: 4 }, wallsLeft: WALLS_PER_PLAYER },
    ],
    walls: [],
    turn: 0,
    winner: null,
    moveCounts: [0, 0],
  };
}

const GREETING =
  'Oh — a challenger! I’m Pebble. I mostly… wander, honestly. Go on, take a step toward the top row.';
const WIN_LINE = 'You made it across. Okay, you’re actually good at this. Rematch sometime? …friends?';

const BEATS: Beat[] = [
  {
    phase: 'move',
    coach: 'Tap the glowing tile to step toward the top row — that’s your finish line.',
    target: { r: 3, c: 4 },
    pebble: 'My turn! Forward, forward— oh. I’m right in front of you now. Whoops.',
  },
  {
    phase: 'jump',
    coach: 'Pebble’s blocking your lane. Tap the glowing tile to leap clean over him.',
    target: { r: 1, c: 4 },
    pebble: 'You JUMPED me?! …Fine. I’m still racing you to the bottom.',
  },
  {
    phase: 'wall',
    coach: 'Now slow him down — drag a flat block onto the lane just below Pebble.',
    targetWall: { r: 3, c: 3, o: 'h' },
    pebble: 'A wall?! Rude. Ugh, fiiine — the scenic route. Totally meant to go this way.',
  },
  {
    phase: 'win',
    coach: 'One step to glory. Tap the glowing tile on the top row to win.',
    target: { r: 0, c: 4 },
    pebble: WIN_LINE,
  },
];

/** Pebble's reply: the legal step that shortens his route to the bottom row. */
function pebbleReply(state: GameState): Action | null {
  const targets = legalMoveTargets(state, 1);
  if (!targets.length) return null;
  const ws = wallSets(state.walls);
  let best = targets[0];
  let bestD = Infinity;
  for (const t of targets) {
    const d = shortestDist(t, GOAL_ROW[1], ws);
    const dd = d < 0 ? Infinity : d;
    if (dd < bestD) {
      bestD = dd;
      best = t;
    }
  }
  return { type: 'move', to: best };
}

export function useTutorial() {
  const [state, setState] = useState<GameState>(seed);
  const [beatIndex, setBeatIndex] = useState(0);
  const [bubble, setBubble] = useState(GREETING);
  const [nudge, setNudge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // Pebble's turn / between beats
  const [won, setWon] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    },
    [],
  );

  const beat = BEATS[Math.min(beatIndex, BEATS.length - 1)];

  const hint = useCallback((text: string) => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setNudge(text);
    nudgeTimer.current = setTimeout(() => setNudge(null), 2400);
  }, []);

  /** Apply your accepted action, then let Pebble react + reply, then advance. */
  const proceed = useCallback((nextState: GameState, pebbleLine: string) => {
    setNudge(null);
    setState(nextState);
    setBusy(true);
    if (nextState.winner === 0) {
      setBubble(WIN_LINE);
      setWon(true);
      return; // board stays frozen behind the victory card
    }
    const t1 = setTimeout(() => {
      setBubble(pebbleLine);
      const reply = pebbleReply(nextState);
      let after = nextState;
      if (reply) {
        const r = applyAction(nextState, reply);
        if (r.ok) after = r.state;
      }
      setState(after);
      const t2 = setTimeout(() => {
        setBeatIndex((b) => Math.min(b + 1, BEATS.length - 1));
        setBusy(false);
      }, 1150);
      timers.current.push(t2);
    }, 650);
    timers.current.push(t1);
  }, []);

  const blocked = busy || won;

  /** Tap a board cell (move & jump beats). */
  const tapCell = useCallback(
    (r: number, c: number) => {
      if (blocked) return;
      if (beat.phase === 'wall') {
        hint('Grab a block from the tray below and drag it onto the board.');
        return;
      }
      const t = beat.target;
      if (!t) return;
      if (r === t.r && c === t.c) {
        const res = applyAction(state, { type: 'move', to: { r, c } });
        if (res.ok) proceed(res.state, beat.pebble);
        return;
      }
      hint(
        beat.phase === 'jump'
          ? 'Tap the glowing tile to jump over Pebble.'
          : 'Tap the glowing tile — head for the top row.',
      );
    },
    [blocked, beat, state, proceed, hint],
  );

  /** Drop a dragged roadblock (wall beat). Returns true if accepted. */
  const placeWall = useCallback(
    (wall: Wall): boolean => {
      if (blocked) return false;
      if (beat.phase !== 'wall') {
        hint('Not yet — make your move first.');
        return false;
      }
      if (wall.o !== 'h') {
        hint('Use a flat block — drag the wide one across the lane below Pebble.');
        return false;
      }
      const res = applyAction(state, { type: 'wall', wall });
      if (!res.ok) {
        hint('That spot won’t hold. Aim the block right across the lane below Pebble.');
        return false;
      }
      if ((res.oppPathDelta ?? 0) <= 0) {
        hint('Closer to Pebble — block the lane right in front of him.');
        return false;
      }
      proceed(res.state, beat.pebble);
      return true;
    },
    [blocked, beat, state, proceed, hint],
  );

  const onTapWell = useCallback(() => {
    if (blocked) return;
    if (beat.phase === 'wall') hint('Press and drag the block onto the lane below Pebble.');
  }, [blocked, beat, hint]);

  const wallPhase = beat.phase === 'wall' && !blocked;
  const glow: Pos[] =
    !blocked && (beat.phase === 'move' || beat.phase === 'jump') && beat.target ? [beat.target] : [];

  return {
    state,
    bubble,
    coach: nudge ?? beat.coach,
    isNudge: nudge !== null,
    phase: beat.phase,
    beatIndex,
    beatCount: BEATS.length,
    glow,
    wallPhase,
    targetWall: wallPhase ? beat.targetWall : undefined,
    busy,
    won,
    tapCell,
    placeWall,
    onTapWell,
  };
}
