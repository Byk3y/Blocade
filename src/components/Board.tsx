import { useRef } from 'react';
import { Pressable, View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import { Grad } from './Grad';
import { Piece } from './Piece';
import { colors, radii, s, gradients, shadows } from '../constants/theme';
import { Cell } from '../constants/game-data';

export type BlockSpec = {
  /** design-pixel rect in board-grid coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  variant: 'ink' | 'ghost' | 'ghost-bad' | 'floating';
  rotate?: number;
};

/** Window-space frame of the inner cell grid (top-left of cell 0,0). */
export type GridFrame = { x: number; y: number };

/**
 * The N×N board. Geometry is given in design pixels (cell/gap) and scaled with s().
 * `blocks` overlays roadblocks, drag ghosts, and the floating in-hand block.
 * `onCellPress` makes cells tappable; `overlay` renders on top of everything
 * (used for the wall-placement slot grid on the Game screen).
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
}) {
  const cellPx = s(cell);
  const gapPx = s(gap);
  const grid = n * cellPx + (n - 1) * gapPx;
  const pieceSize = cellPx - s(6);
  const dotSize = s(8);
  const gridRef = useRef<View>(null);

  const measure = (_e: LayoutChangeEvent) => {
    gridRef.current?.measureInWindow((x, y) => onMeasureGrid?.({ x, y }));
  };

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
                    {c.piece && <Piece size={pieceSize} color={c.piece} />}
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
                key={i}
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
          return (
            <Grad
              key={i}
              colors={gradients.blockInk}
              angle={180}
              pointerEvents="none"
              style={{
                ...common,
                transform: b.rotate ? [{ rotate: `${b.rotate}deg` }] : undefined,
                ...(b.variant === 'floating'
                  ? {
                      shadowColor: '#22262e',
                      shadowOpacity: 0.45,
                      shadowRadius: 22,
                      shadowOffset: { width: 0, height: 14 },
                      elevation: 12,
                    }
                  : shadows.placedBlock),
              }}
            />
          );
        })}

        {overlay}
      </View>
    </View>
  );
}
