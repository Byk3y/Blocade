import type { PieceColor } from '../constants/game-data';
import type { GameState, PlayerId } from '../engine';

/**
 * In-memory record of the most recent finished match, so the Result screen can
 * show the real final board and stats without flooding route params.
 * (Deliberately not persisted — replace with real storage when profiles land.)
 */
export interface MatchRecord {
  mode: 'bot' | 'local';
  botName?: string;
  difficulty?: string;
  playerColor: PieceColor;
  rivalColor: PieceColor;
  winner: PlayerId;
  finalState: GameState;
  /** unique per finished match — used to record progression exactly once */
  id: number;
}

let last: MatchRecord | null = null;
let counter = 0;
let recordedId = 0;

export const setLastMatch = (m: Omit<MatchRecord, 'id'>) => {
  last = { ...m, id: ++counter };
};

export const getLastMatch = () => last;

/**
 * Returns true exactly once per match id, so a finished match is recorded to the
 * cloud a single time even across React effect double-invocation or a
 * result-screen remount. A rematch produces a new id, so it records again.
 */
export const claimRecording = (id: number): boolean => {
  if (id <= recordedId) return false;
  recordedId = id;
  return true;
};
