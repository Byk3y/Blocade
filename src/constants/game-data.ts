import { colors } from './theme';
import type { BotSkill, BotStyle } from '../engine/bots';
import type { BotPortraitKey } from './bot-portraits';

/**
 * Board / roster data — a faithful port of the `Component` class at the bottom of
 * Blocade Screens.dc.html. Geometry here is expressed in *design pixels* (P=40 pitch,
 * C=34 cell); the Board component scales them with s().
 */
export const P = 40; // cell pitch (34 cell + 6 gap)
export const C = 34; // cell size

export type EyeStyle = 'round' | 'mid' | 'slit';
export type PieceColor = 'blue' | 'green' | 'orange';

export interface Cell {
  bg: string;
  dot: boolean;
  piece: PieceColor | null;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

const T = {
  base: colors.boardCell,
  goalTop: colors.goalBlue,
  goalBot: colors.goalOrange,
};

/** Legal-move dots shown for the active (blue) player on the Game screen. */
const dots: [number, number][] = [
  [4, 4],
  [5, 3],
  [6, 4],
];

/** Map an engine wall (intersection anchor + orientation) to its design-pixel rect. */
export function wallRect(w: { r: number; c: number; o: 'h' | 'v' }): Wall {
  return w.o === 'h'
    ? { x: w.c * P, y: w.r * P + 33, w: 2 * C + 6, h: 8 }
    : { x: w.c * P + 33, y: w.r * P, w: 8, h: 2 * C + 6 };
}

/** The four sample walls (decorative screens), mapped to absolute design-pixel rects. */
export const walls: Wall[] = (
  [
    { r: 3, c: 3, o: 'h' },
    { r: 4, c: 4, o: 'v' },
    { r: 5, c: 5, o: 'h' },
    { r: 1, c: 6, o: 'v' },
  ] as { r: number; c: number; o: 'h' | 'v' }[]
).map(wallRect);

export function makeCells(
  you: { r: number; c: number },
  opp: { r: number; c: number },
  showDots: boolean,
  size = 9,
): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let bg: string = T.base;
      if (r === 0) bg = T.goalTop;
      if (r === size - 1) bg = T.goalBot;
      let piece: PieceColor | null = null;
      if (r === you.r && c === you.c) piece = 'blue';
      if (r === opp.r && c === opp.c) piece = 'orange';
      cells.push({
        bg,
        dot: showDots && dots.some((d) => d[0] === r && d[1] === c),
        piece,
      });
    }
  }
  return cells;
}

export const board = {
  game: makeCells({ r: 5, c: 4 }, { r: 3, c: 4 }, true),
  victory: makeCells({ r: 0, c: 5 }, { r: 6, c: 3 }, false),
  defeat: makeCells({ r: 6, c: 5 }, { r: 8, c: 3 }, false),
};

/** 5×5 tutorial board (How to Play, card 2). */
export const tutorialCells: Cell[] = (() => {
  const cells: Cell[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      let bg: string = T.base;
      if (r === 0) bg = T.goalTop;
      if (r === 4) bg = T.goalBot;
      let piece: PieceColor | null = null;
      if (r === 4 && c === 2) piece = 'blue';
      if (r === 0 && c === 2) piece = 'orange';
      cells.push({ bg, dot: false, piece });
    }
  }
  return cells;
})();

/** Roadblock ticks: `on` filled in `onColor`, rest spent grey. */
export function makeTicks(on: number, onColor: string) {
  return Array.from({ length: 10 }, (_, i) => (i < on ? onColor : colors.tickOff));
}

export const ticks = {
  you: makeTicks(7, colors.blue),
  opp: makeTicks(9, colors.rivalOrange),
};

// ---- Bot roster ----------------------------------------------------------

export type BotState = 'open' | 'selected' | 'beaten' | 'locked';

export interface Bot {
  name: string;
  rating: number;
  avatar: [string, string]; // gradient stops
  portrait?: BotPortraitKey;
  eyes: EyeStyle;
  state: BotState;
  crown?: boolean;
  /** AI personality flavour (move/wall tendency) */
  style: BotStyle;
  /** 0 = plays its best, 1 = mostly noise — the primary strength knob */
  blunder: number;
  /** optional search-strength override (grades the Advanced tier beyond blunder) */
  skill?: Partial<BotSkill>;
  taunt: string;
  styleLine: string;
}

export const roster: { title: string; tally: string; beaten: number; bots: Bot[] }[] = [
  {
    title: 'BEGINNER',
    tally: '3/4 BEATEN',
    beaten: 3,
    bots: [
      { name: 'Pebble', portrait: 'pebble', rating: 320, avatar: ['#8fbf7e', '#557d47'], eyes: 'round', state: 'beaten', style: 'random', blunder: 0.8, taunt: '“Which way is forward again?”', styleLine: 'Wanders happily' },
      { name: 'Momo', portrait: 'momo', rating: 460, avatar: ['#e6b54e', '#a87a1e'], eyes: 'round', state: 'beaten', style: 'random', blunder: 0.55, taunt: '“I block… vibes, mostly.”', styleLine: 'Unpredictable' },
      { name: 'Tuk', portrait: 'tuk', rating: 640, avatar: ['#62b5a4', '#2f7a6a'], eyes: 'round', state: 'beaten', style: 'runner', blunder: 0.38, taunt: '“Catch me if you can.”', styleLine: 'Runs, never blocks' },
      { name: 'Juno', portrait: 'juno', rating: 820, avatar: ['#d98a9c', '#a04a60'], eyes: 'round', state: 'open', style: 'runner', blunder: 0.24, taunt: '“Shortest path. Every time.”', styleLine: 'Pure racer' },
    ],
  },
  {
    title: 'INTERMEDIATE',
    tally: '0/4 BEATEN',
    beaten: 0,
    bots: [
      { name: 'Riko-9', portrait: 'riko9', rating: 1140, avatar: ['#ff8a4d', '#cf520c'], eyes: 'round', state: 'selected', style: 'balanced', blunder: 0.15, taunt: '“I never take the long way.”', styleLine: 'Runs ahead, blocks behind' },
      { name: 'Mads', portrait: 'mads', rating: 1320, avatar: ['#5e8fd6', '#2b4f96'], eyes: 'mid', state: 'open', style: 'blocker', blunder: 0.13, taunt: '“Hope you like detours.”', styleLine: 'Wall-happy menace' },
      { name: 'Echo', portrait: 'echo', rating: 1500, avatar: ['#7fa8b8', '#43687a'], eyes: 'mid', state: 'open', style: 'balanced', blunder: 0.055, taunt: '“I mirror your every plan.”', styleLine: 'Adapts to you' },
      { name: 'Sable', portrait: 'sable', rating: 1700, avatar: ['#8c8678', '#56523f'], eyes: 'mid', state: 'open', style: 'blocker', blunder: 0.04, taunt: '“The walls have opinions.”', styleLine: 'Defensive wall expert' },
    ],
  },
  {
    title: 'ADVANCED & MASTER',
    tally: '0/4 BEATEN',
    beaten: 0,
    bots: [
      { name: 'Vex', portrait: 'vex', rating: 2010, avatar: ['#9a74d4', '#5c3a92'], eyes: 'slit', state: 'open', style: 'strategic', blunder: 0.09, taunt: '“Route advantage: mine.”', styleLine: 'Thinks a move ahead' },
      { name: 'Onyx', portrait: 'onyx', rating: 2180, avatar: ['#6a7180', '#3a404c'], eyes: 'slit', state: 'open', style: 'strategic', blunder: 0.05, taunt: '“I saw this game end already.”', styleLine: 'Cold calculator' },
      { name: 'Nyx', portrait: 'nyx', rating: 2300, avatar: ['#b06a9e', '#6e3a62'], eyes: 'slit', state: 'open', style: 'strategic', blunder: 0.025, taunt: '“Every lane you like, I own.”', styleLine: 'Territory tyrant' },
      { name: 'Warden', portrait: 'warden', rating: 2400, avatar: ['#3a404c', '#15181f'], eyes: 'slit', state: 'open', crown: true, style: 'strategic', blunder: 0.008, taunt: '“No one gets through.”', styleLine: 'The final wall' },
    ],
  },
];

export const allBots: Bot[] = roster.flatMap((s) => s.bots);
export const botByName = (name?: string): Bot | undefined => allBots.find((b) => b.name === name);

/**
 * Difficulty segment scales a bot's blunder rate. Currently neutral — each bot's
 * own `blunder`/`skill` defines its strength, so the segment is a label for now.
 * (A future manual handicap can re-introduce a gentle scale here.)
 */
export const difficultyBlunderScale: Record<string, number> = {
  Beginner: 1,
  Intermediate: 1,
  Advanced: 1,
};

export const featuredBot = {
  name: 'Riko-9',
  rating: 1140,
  difficulty: 'INTERMEDIATE',
  taunt: '“I never take the long way.”',
  subline: 'Rating 1140 · Beats 48% of players',
  avatar: ['#ff8a4d', '#cf520c'] as [string, string],
};
