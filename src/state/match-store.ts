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
  winner: PlayerId;
  finalState: GameState;
}

let last: MatchRecord | null = null;

export const setLastMatch = (m: MatchRecord) => {
  last = m;
};

export const getLastMatch = () => last;
