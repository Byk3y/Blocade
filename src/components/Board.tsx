import { useEffect, useRef } from 'react';
import { Pressable, View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Grad } from './Grad';
import { Piece } from './Piece';
import { AnimatedPiece } from './AnimatedPiece';
import { colors, radii, s, gradients, shadows } from '../constants/theme';
import { Cell, PieceColor } from '../constants/game-data';
import { Pos } from '../engine';

export type BlockSpec = {
  /** design-pixel rect in board-grid coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  variant: 'ink' | 'ghost' | 'ghost-bad' | 'floating';
  ownerColor?: PieceColor;
  rotate?: number;
  /** stable identity (e.g. `h3-2`) so only a newly-placed wall mounts/animates */
  key?: string;
};

const blockColors = {
  blue: gradients.blockBlue,
  green: gradients.blockGreen,
  orange: gradients.blockOrange,
} as const;

const blockChrome = {
  blue: {
    borderColor: 'rgba(34,67,168,0.75)',
    borderTopColor: 'rgba(173,194,255,0.95)',
    shadowColor: '#2f5fe0',
  },
  green: {
    borderColor: 'rgba(81,127,52,0.75)',
    borderTopColor: 'rgba(213,242,157,0.95)',
    shadowColor: '#78ad4e',
  },
  orange: {
    borderColor: 'rgba(181,70,7,0.75)',
    borderTopColor: 'rgba(255,186,137,0.95)',
    shadowColor: '#e8590c',
  },
} as const;

/** Window-space frame of the inner cell grid (top-left of cell 0,0). */
export type GridFrame = { x: number; y: number };

/** A pawn for the animated layer: its board cell and identity color. */
export type PieceSpec = { pos: Pos; color: PieceColor };

/**
 * The N×N board. Geometry is given in design pixels (cell/gap) and scaled with s().
 * `blocks` overlays roadblocks, drag ghosts, and the floating in-hand block.
 * `onCellPress` makes cells tappable; `overlay` renders on top of everything
 * (used for the wall-placement slot grid on the Game screen).
 *
 * Game-feel: when `animatePieces` is set, pawns render in an absolute spring
 * layer (and the in-flow pawns are suppressed); `animateBlocks` makes newly
 * placed walls drop-and-settle; `settle` drives a ~1px board shake on placement.
 * Result/tutorial boards omit these props and render exactly as before (static).
 */
export function Board({
  cells,
  n = 9,
  cell = 34,
  gap = 6,
  blocks = [],
  containerRadius = radii.board,
  padding = 8,
  card = true,
  emboss = true,
  cardShadow = true,
  dotColor = colors.blue,
  onCellPress,
  onMeasureGrid,
  overlay,
  style,
  animatePieces = false,
  pieces,
  animateBlocks = false,
  settle,
  reduceMotion = false,
}: {
  cells: Cell[];
  n?: number;
  cell?: number;
  gap?: number;
  blocks?: BlockSpec[];
  containerRadius?: number;
  padding?: number;
  card?: boolean;
  emboss?: boolean;
  cardShadow?: boolean;
  dotColor?: string;
  onCellPress?: (r: number, c: number) => void;
  /** reports the cell grid's window-space origin, for cross-component dragging */
  onMeasureGrid?: (frame: GridFrame) => void;
  overlay?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** render pawns in an animated spring layer instead of in-flow */
  animatePieces?: boolean;
  /** pawn positions/colors for the animated layer (required when animatePieces) */
  pieces?: (PieceSpec | null)[];
  /** play a drop-and-settle on newly mounted ink walls */
  animateBlocks?: boolean;
  /** shared value (~±1px) the host fires to "settle" the board on placement */
  settle?: SharedValue<number>;
  /** when true, pawns snap (no spring) — respects OS reduce-motion */
  reduceMotion?: boolean;
}) {
  const cellPx = s(cell);
  const gapPx = s(gap);
  const grid = n * cellPx + (n - 1) * gapPx;
  const pieceSize = cellPx - s(6);
  const dotSize = s(8);
  const dropPx = s(6);
  const gridRef = useRef<View>(null);

  const measure = (_e: LayoutChangeEvent) => {
    gridRef.current?.measureInWindow((x, y) => onMeasureGrid?.({ x, y }));
  };

  // settle: read the host's shared value (or a static fallback when absent)
  const fallbackSettle = useSharedValue(0);
  const settleSv = settle ?? fallbackSettle;
  const settleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settleSv.value }],
  }));

  return (
    <View
      style={[
        card && {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
        },
        { borderRadius: containerRadius, padding: s(padding) },
        card && cardShadow ? shadows.board : null,
        style,
      ]}>
      {/* settle moves the board CONTENTS, leaving the card's drop shadow still */}
      <Animated.View style={settleStyle}>
        <View
          ref={gridRef}
          onLayout={onMeasureGrid ? measure : undefined}
          style={{ width: grid, height: grid, position: 'relative' }}>
        {/* cells — explicit rows so 9 always fit per line (flexWrap mis-wraps on sub-pixel widths) */}
        <View style={{ gap: gapPx }}>
          {Array.from({ length: n }, (_, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: gapPx }}>
              {Array.from({ length: n }, (_, col) => {
                const c = cells[r * n + col];
                const cellStyle: ViewStyle = {
                  width: cellPx,
                  height: cellPx,
                  borderRadius: s(cell === 34 ? 9 : 8),
                  backgroundColor: c.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(emboss
                    ? {
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255,255,255,0.7)',
                        shadowColor: '#22262e',
                        shadowOpacity: 0.06,
                        shadowRadius: 2,
                        shadowOffset: { width: 0, height: 1 },
                      }
                    : null),
                };
                const inner = (
                  <>
                    {c.dot && (
                      <View
                        style={{
                          width: dotSize,
                          height: dotSize,
                          borderRadius: dotSize / 2,
                          backgroundColor: dotColor,
                        }}
                      />
                    )}
                    {/* in-flow pawn — suppressed when the animated layer is on */}
                    {!animatePieces && c.piece && <Piece size={pieceSize} color={c.piece} />}
                  </>
                );
                return onCellPress ? (
                  <Pressable key={col} style={cellStyle} onPress={() => onCellPress(r, col)}>
                    {inner}
                  </Pressable>
                ) : (
                  <View key={col} style={cellStyle}>
                    {inner}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* roadblocks & drag overlays */}
        {blocks.map((b, i) => {
          const key = b.key ?? String(i);
          const common: ViewStyle = {
            position: 'absolute',
            left: s(b.x),
            top: s(b.y),
            width: s(b.w),
            height: s(b.h),
            borderRadius: s(4),
          };
          if (b.variant === 'ghost' || b.variant === 'ghost-bad') {
            const bad = b.variant === 'ghost-bad';
            return (
              <View
                key={key}
                pointerEvents="none"
                style={{
                  ...common,
                  borderRadius: s(6),
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: bad ? 'rgba(232,89,12,0.7)' : 'rgba(34,38,46,0.6)',
                  backgroundColor: bad ? 'rgba(232,89,12,0.14)' : 'rgba(34,38,46,0.12)',
                }}
              />
            );
          }
          const ownerChrome = b.variant === 'ink' && b.ownerColor ? blockChrome[b.ownerColor] : null;
          const blockShadow = ownerChrome
            ? {
                ...shadows.placedBlock,
                shadowColor: ownerChrome.shadowColor,
                shadowOpacity: 0.46,
                shadowRadius: 11,
                elevation: 7,
              }
            : shadows.placedBlock;
          const gradColors =
            b.variant === 'ink' && b.ownerColor ? blockColors[b.ownerColor] : gradients.blockInk;
          const blockStyle: ViewStyle = {
            ...common,
            ...(ownerChrome
              ? {
                  borderWidth: 1,
                  borderColor: ownerChrome.borderColor,
                  borderTopColor: ownerChrome.borderTopColor,
                }
              : null),
            transform: b.rotate ? [{ rotate: `${b.rotate}deg` }] : undefined,
            ...(b.variant === 'floating'
              ? {
                  shadowColor: '#22262e',
                  shadowOpacity: 0.45,
                  shadowRadius: 22,
                  shadowOffset: { width: 0, height: 14 },
                  elevation: 12,
                }
              : blockShadow),
          };
          // newly placed ink wall: drop-and-settle on mount
          if (b.variant === 'ink' && animateBlocks) {
            return <InkBlock key={key} style={blockStyle} colors={gradColors} dropPx={dropPx} />;
          }
          return (
            <Grad key={key} colors={gradColors} angle={180} pointerEvents="none" style={blockStyle} />
          );
        })}

        {/* animated pawn layer — drawn above walls so a wall can't clip a pawn */}
        {animatePieces &&
          pieces?.map((p, i) =>
            p ? (
              <AnimatedPiece
                key={i}
                r={p.pos.r}
                c={p.pos.c}
                color={p.color}
                cellPx={cellPx}
                gapPx={gapPx}
                pieceSize={pieceSize}
                reduceMotion={reduceMotion}
              />
            ) : null,
          )}

          {overlay}
        </View>
      </Animated.View>
    </View>
  );
}

/** A placed roadblock that falls from a few px above with a small overshoot. */
function InkBlock({
  style,
  colors: gradColors,
  dropPx,
}: {
  style: ViewStyle;
  colors: readonly [string, string, ...string[]];
  dropPx: number;
}) {
  const ty = useSharedValue(-dropPx);
  const sc = useSharedValue(0.94);
  const op = useSharedValue(0.5);

  useEffect(() => {
    // a printed block presses DOWN into place — it settles up to full size,
    // it never inflates past it (no >1 overshoot; that reads as toy juice).
    ty.value = withSpring(0, { damping: 14, stiffness: 320, mass: 0.8 });
    sc.value = withSpring(1, { damping: 16, stiffness: 300, mass: 0.8 });
    op.value = withTiming(1, { duration: 120 });
  }, [ty, sc, op]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }, { scale: sc.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[style, aStyle]}>
      <Grad
        colors={gradColors}
        angle={180}
        style={{ width: '100%', height: '100%', borderRadius: style.borderRadius as number }}
      />
    </Animated.View>
  );
}
