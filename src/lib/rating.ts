/**
 * Elo-style rating change for a finished match.
 *
 * Beat a higher-rated bot → a big gain; beat a much weaker one → a small bump.
 * Lose to a weak bot → a real sting. Magnitude is floored at 1 so every match
 * moves the needle. K=32 is the classic chess-club value and feels right for an
 * arcade ladder.
 *
 * Pure + deterministic. (Client-computed for now since rating isn't competitive;
 * a future ranked mode should compute this server-side in the RPC for integrity.)
 */
const K = 32;

export function ratingDelta(playerRating: number, botRating: number, won: boolean): number {
  const expected = 1 / (1 + 10 ** ((botRating - playerRating) / 400));
  const mag = Math.max(1, Math.round(K * Math.abs((won ? 1 : 0) - expected)));
  return won ? mag : -mag;
}

/** Signed delta formatted for display with the design's U+2212 minus, e.g. "+18" / "−7". */
export function formatDelta(delta: number): string {
  return `${delta >= 0 ? '+' : '−'}${Math.abs(delta)}`;
}
