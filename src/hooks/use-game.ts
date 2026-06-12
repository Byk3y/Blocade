import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Action,
  GameState,
  Orientation,
  Pos,
  RejectReason,
  Wall,
  applyAction,
  canPlaceWall,
  chooseBotAction,
  createGame,
  legalMoveTargets,
  samePos,
} from '../engine';
import { Bot, difficultyBlunderScale } from '../constants/game-data';

export type WallUI =
  | { kind: 'move' }
  | { kind: 'wall'; o: Orientation; preview: Wall | null };

export interface Feedback {
  text: string;
  tone: 'info' | 'good' | 'bad';
  id: number;
}

const REJECT_TEXT: Record<RejectReason, string> = {
  'game-over': 'The match is over',
  'illegal-move': 'That move is blocked',
  'out-of-bounds': 'Choose a valid lane',
  'no-walls': 'You’re out of roadblocks',
  overlap: 'Roadblock already placed there',
  traps: 'That roadblock blocks every route',
};

function placedWallText(delta: number): { text: string; tone: Feedback['tone'] } {
  if (delta >= 4) return { text: `Brutal Block! +${delta} to their route`, tone: 'good' };
  if (delta >= 2) return { text: `Route cut off — forced detour (+${delta})`, tone: 'good' };
  if (delta >= 1) return { text: `Forced detour (+${delta})`, tone: 'good' };
  return { text: 'Placed. They didn’t even flinch.', tone: 'info' };
}

function botWallText(name: string, delta: number): { text: string; tone: Feedback['tone'] } {
  if (delta >= 3) return { text: `${name} cut your route (+${delta}) — find another way`, tone: 'bad' };
  if (delta >= 1) return { text: `${name} forced a detour (+${delta})`, tone: 'bad' };
  return { text: `${name} placed a roadblock`, tone: 'info' };
}

/**
 * All game-screen state and turn flow: human input, wall preview, feedback
 * messages, and bot scheduling. The rules themselves live in src/engine.
 */
export function useGame({
  mode,
  bot,
  difficulty,
  onGameOver,
}: {
  mode: 'bot' | 'local';
  bot?: Bot;
  difficulty?: string;
  onGameOver: (final: GameState) => void;
}) {
  const [state, setState] = useState<GameState>(() => createGame());
  const [ui, setUi] = useState<WallUI>({ kind: 'move' });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overFired = useRef(false);

  const say = useCallback((text: string, tone: Feedback['tone'] = 'info') => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    const id = Date.now();
    setFeedback({ text, tone, id });
    feedbackTimer.current = setTimeout(() => {
      setFeedback((f) => (f?.id === id ? null : f));
    }, 2800);
  }, []);

  const humanTurn = state.winner === null && (mode === 'local' || state.turn === 0);

  const legalTargets = useMemo(
    () => (humanTurn ? legalMoveTargets(state) : []),
    [state, humanTurn],
  );

  // ---- bot turns -----------------------------------------------------------
  useEffect(() => {
    if (mode !== 'bot' || !bot || state.winner !== null || state.turn !== 1) return;
    setBotThinking(true);
    const delay = 650 + Math.random() * 900;
    const t = setTimeout(() => {
      setBotThinking(false);
      const blunder = Math.min(
        0.9,
        bot.blunder * (difficultyBlunderScale[difficulty ?? 'Intermediate'] ?? 1),
      );
      const action = chooseBotAction(state, { style: bot.style, blunder, tuning: bot.skill });
      if (!action) return; // cannot happen with the no-trap rule, but stay safe
      const res = applyAction(state, action);
      if (res.ok) {
        setState(res.state);
        if (action.type === 'wall') {
          const f = botWallText(bot.name, res.oppPathDelta ?? 0);
          say(f.text, f.tone);
        }
      }
    }, delay);
    return () => {
      clearTimeout(t);
      setBotThinking(false);
    };
  }, [mode, bot, difficulty, state, say]);

  // ---- game over -----------------------------------------------------------
  useEffect(() => {
    if (state.winner === null || overFired.current) return;
    overFired.current = true;
    // a beat to see the winning move land before the sheet slides up
    overTimer.current = setTimeout(() => onGameOver(state), 900);
    return () => {
      if (overTimer.current) clearTimeout(overTimer.current);
    };
  }, [state, onGameOver]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (overTimer.current) clearTimeout(overTimer.current);
    },
    [],
  );

  // ---- human input ---------------------------------------------------------

  const doAction = useCallback(
    (action: Action): boolean => {
      const res = applyAction(state, action);
      if (!res.ok) {
        say(REJECT_TEXT[res.reason], 'bad');
        return false;
      }
      setState(res.state);
      if (action.type === 'wall') {
        const f = placedWallText(res.oppPathDelta ?? 0);
        say(f.text, f.tone);
      }
      return true;
    },
    [state, say],
  );

  /** Tap on a board cell: move there if legal; in wall mode, cancel out. */
  const tapCell = useCallback(
    (r: number, c: number) => {
      if (!humanTurn) return;
      if (ui.kind === 'wall') {
        setUi({ kind: 'move' });
        return;
      }
      const me = state.players[state.turn].pos;
      if (me.r === r && me.c === c) return; // tapped own piece
      const to: Pos = { r, c };
      if (legalTargets.some((t) => samePos(t, to))) {
        doAction({ type: 'move', to });
      } else if (Math.abs(me.r - r) + Math.abs(me.c - c) === 1) {
        say('That move is blocked', 'bad');
      } else {
        say('Choose a marked tile', 'info');
      }
    },
    [humanTurn, ui, state, legalTargets, doAction, say],
  );

  /** Tap one of the tray wells to start (or cancel) roadblock placement. */
  const pickWall = useCallback(
    (o: Orientation) => {
      if (!humanTurn) return;
      if (state.players[state.turn].wallsLeft <= 0) {
        say('You’re out of roadblocks', 'bad');
        return;
      }
      setUi((u) =>
        u.kind === 'wall' && u.o === o ? { kind: 'move' } : { kind: 'wall', o, preview: null },
      );
    },
    [humanTurn, state, say],
  );

  /** Drop a dragged roadblock at a snapped slot. Returns true if it landed. */
  const placeWall = useCallback(
    (wall: Wall): boolean => doAction({ type: 'wall', wall }),
    [doAction],
  );

  /** Back out of wall-placement mode (used when a drag starts). */
  const resetMode = useCallback(() => setUi({ kind: 'move' }), []);

  /** Tap an intersection slot while in wall mode: preview first, confirm on second tap. */
  const tapSlot = useCallback(
    (r: number, c: number) => {
      if (!humanTurn || ui.kind !== 'wall') return;
      const wall: Wall = { r, c, o: ui.o };
      if (ui.preview && ui.preview.r === r && ui.preview.c === c) {
        if (doAction({ type: 'wall', wall })) setUi({ kind: 'move' });
        return;
      }
      const check = canPlaceWall(state, wall);
      if (!check.ok) {
        say(REJECT_TEXT[check.reason], 'bad');
        return;
      }
      setUi({ kind: 'wall', o: ui.o, preview: wall });
    },
    [humanTurn, ui, state, doAction, say],
  );

  return {
    state,
    ui,
    feedback,
    botThinking,
    humanTurn,
    legalTargets,
    tapCell,
    pickWall,
    tapSlot,
    placeWall,
    resetMode,
    say,
  };
}
