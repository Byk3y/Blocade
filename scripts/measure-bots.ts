import { createGame, applyAction, PlayerId } from '../src/engine/rules';
import { chooseBotAction, BotStyle, BotSkill } from '../src/engine/bots';

// Mirror of the roster's strength fields (game-data.ts). Difficulty scale is
// currently neutral (1), so effective blunder = the bot's own blunder.
type B = { name: string; style: BotStyle; blunder: number; skill?: Partial<BotSkill> };
const bots: B[] = [
  { name: 'Pebble', style: 'random', blunder: 0.8 },
  { name: 'Momo', style: 'random', blunder: 0.55 },
  { name: 'Tuk', style: 'runner', blunder: 0.38 },
  { name: 'Juno', style: 'runner', blunder: 0.24 },
  { name: 'Riko-9', style: 'balanced', blunder: 0.15 },
  { name: 'Mads', style: 'blocker', blunder: 0.13 },
  { name: 'Echo', style: 'balanced', blunder: 0.055 },
  { name: 'Sable', style: 'blocker', blunder: 0.04 },
  { name: 'Vex', style: 'strategic', blunder: 0.09 },
  { name: 'Onyx', style: 'strategic', blunder: 0.05 },
  { name: 'Nyx', style: 'strategic', blunder: 0.025 },
  { name: 'Warden', style: 'strategic', blunder: 0.008 },
];

const makeRng = (s: number) => () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 2 ** 32;
};

function play(a: B, b: B, first: PlayerId, seed: number): PlayerId | null {
  const rng = makeRng(seed);
  let s = createGame(first);
  const players = [a, b];
  for (let i = 0; i < 600 && s.winner === null; i++) {
    const p = players[s.turn];
    const act = chooseBotAction(s, { style: p.style, blunder: p.blunder, tuning: p.skill, rng });
    if (!act) break;
    const res = applyAction(s, act);
    if (!res.ok) break;
    s = res.state;
  }
  return s.winner;
}

const GAMES = Number(process.env.GAMES ?? 100);
// bots[i] = player0, bots[j] = player1 (the higher/stronger index); fraction j wins.
function winRateStronger(i: number, j: number): number {
  let strongerWins = 0,
    decided = 0;
  for (let g = 0; g < GAMES; g++) {
    const first: PlayerId = (g % 2) as PlayerId; // alternate first-move advantage
    const w = play(bots[i], bots[j], first, g * 7919 + i * 131 + j);
    if (w === null) continue;
    decided++;
    if (w === 1) strongerWins++;
  }
  return decided ? strongerWins / decided : NaN;
}

console.log(`\n=== Adjacent rungs (higher bot vs the one below, ${GAMES} games) ===`);
for (let i = 0; i < bots.length - 1; i++) {
  const wr = winRateStronger(i, i + 1);
  const flag = wr < 0.55 ? '  <-- too close/inverted' : '';
  console.log(
    `${bots[i + 1].name.padEnd(8)} vs ${bots[i].name.padEnd(8)}  ${(wr * 100).toFixed(0).padStart(3)}%  ${'#'.repeat(Math.round(wr * 28))}${flag}`,
  );
}

console.log(`\n=== Wide gaps (strong vs weak — should be lopsided) ===`);
const gaps: [number, number][] = [
  [0, 11], [0, 8], [0, 4], [3, 8], [3, 11], [4, 11], [4, 8], [7, 11], [8, 11],
];
for (const [i, j] of gaps) {
  const wr = winRateStronger(i, j);
  console.log(`${bots[j].name.padEnd(8)} vs ${bots[i].name.padEnd(8)}  ${(wr * 100).toFixed(0).padStart(3)}% win for stronger`);
}
