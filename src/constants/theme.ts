import { Dimensions } from 'react-native';

/**
 * Blocade — "Paper District" design tokens.
 * Values taken verbatim from the design handoff (Blocade Screens.dc.html / README.md).
 * The mocks are authored at a 390px-wide phone. `s()` scales fixed pixel values
 * proportionally so the layout stays pixel-accurate on 390-class devices and
 * gracefully on others (capped so big phones don't balloon the UI).
 */
const GUIDELINE_WIDTH = 390;
const screenWidth = Dimensions.get('window').width;
export const DESIGN_WIDTH = Math.min(screenWidth, 430);

/** Scale a design pixel value to the current device. */
export const s = (n: number) => (n * DESIGN_WIDTH) / GUIDELINE_WIDTH;

export const colors = {
  // surfaces
  bgTop: '#f8f5ee',
  bgBottom: '#f0ebde',
  surface: '#fffdf8',
  surfaceBorder: '#e6dfcf',
  panel: '#fbf8f1',
  sheetTop: '#fbf8f1',
  sheetBottom: '#f4efe2',
  boardCell: '#ebe5d6',
  insetWell: '#f4efe3',
  divider: '#ece5d5',

  // text
  ink: '#22262e',
  inkSoft: '#454a55',
  textSecondary: '#76736a',
  textMuted: '#8d8a80',
  label: '#a09c90',
  disabled: '#a8a499',
  disabledText: '#a39f93',

  // identity
  blue: '#2f5fe0',
  blueDark: '#2243a8',
  rivalOrange: '#e8590c',
  orangeDark: '#b54607',
  brass: '#c9a45c',

  // tints
  goalBlue: 'rgba(47,95,224,0.14)',
  goalOrange: 'rgba(232,89,12,0.13)',
  tickOff: '#e3dcca',

  // chips / misc
  chipOrangeBg: '#fbe7d6',
  chipOrangeText: '#b05512',
  soonBg: '#e9e2d2',
  lockedCardBg: '#f6f2e8',
  selectedCardBg: '#f5f8ff',
  navInactive: '#a8a499',
  homeIndicator: 'rgba(34,38,46,0.25)',
  white: '#ffffff',
} as const;

/** Linear gradient stop tuples (top→bottom or as noted). */
export const gradients = {
  screen: ['#f8f5ee', '#f0ebde'] as const,
  bluePrimary: ['#4a76f0', '#2f5fe0'] as const, // CTA buttons / your identity
  greenPlay: ['#57b471', '#3b9456'] as const, // match-start button ONLY
  blockInk: ['#2c323c', '#1d222a'] as const, // roadblocks
  sheet: ['#fbf8f1', '#f4efe2'] as const,
  blueAvatar: ['#6e96ff', '#2243a8'] as const, // 160deg mascot (you)
  orangeAvatar: ['#ff8a4d', '#cf520c'] as const, // 160deg mascot (rival)
  trayBlock: ['#2c323c', '#1d222a'] as const,
  trayBlockUnder: ['#6a7180', '#535a68'] as const,
} as const;

/** Radial piece gradients: circle at 32% 28%. */
export const pieceGradient = {
  blue: { stops: ['#6e96ff', '#2f5fe0', '#2243a8'], offsets: [0, 0.58, 1] },
  orange: { stops: ['#ffa566', '#e8590c', '#b54607'], offsets: [0, 0.58, 1] },
} as const;

export const fonts = {
  clashMedium: 'ClashDisplay-Medium',
  clashSemibold: 'ClashDisplay-Semibold',
  clashBold: 'ClashDisplay-Bold',
  satoshi: 'Satoshi-Regular',
  satoshiMedium: 'Satoshi-Medium',
  satoshiBold: 'Satoshi-Bold',
  satoshiBlack: 'Satoshi-Black',
  satoshiItalic: 'Satoshi-Italic',
} as const;

export const radii = {
  card: 18,
  board: 22,
  cell: 9,
  botCard: 16,
  button: 18,
  well: 14,
  segOuter: 14,
  segInner: 11,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#22262e',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  board: {
    shadowColor: '#22262e',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bluePrimary: {
    shadowColor: '#2f5fe0',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  greenPlay: {
    shadowColor: '#3b9456',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  blueSelection: {
    shadowColor: '#2f5fe0',
    shadowOpacity: 0.15,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  placedBlock: {
    shadowColor: '#22262e',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  sheet: {
    shadowColor: '#22262e',
    shadowOpacity: 0.38,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: -16 },
    elevation: 20,
  },
} as const;
