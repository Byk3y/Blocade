import { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Piece } from './Piece';
import { PieceColor } from '../constants/game-data';

// Crisp slide with a hair of settle — a pawn that boings reads as toy-like.
const SPRING = { damping: 18, stiffness: 180, mass: 0.9 } as const;
// A jump (≥2 cells) covers double the distance; an eased glide arrives settled
// instead of whipping across at spring velocity.
const JUMP = { duration: 260, easing: Easing.out(Easing.cubic) } as const;

/**
 * A pawn that spring-slides between cells. Lives in an absolutely-positioned
 * layer inside the Board's grid container, so its coordinates are grid-local
 * (no window-frame math). Animates only on subsequent (r,c) changes — never on
 * first mount or rematch (so pieces appear in place), and snaps when
 * reduce-motion is on.
 */
export function AnimatedPiece({
  r,
  c,
  color,
  cellPx,
  gapPx,
  pieceSize,
  reduceMotion,
}: {
  r: number;
  c: number;
  color: PieceColor;
  cellPx: number;
  gapPx: number;
  pieceSize: number;
  reduceMotion: boolean;
}) {
  const pitch = cellPx + gapPx;
  const tx = useSharedValue(c * pitch);
  const ty = useSharedValue(r * pitch);
  const first = useRef(true);
  const prev = useRef({ r, c });

  useEffect(() => {
    const x = c * pitch;
    const y = r * pitch;
    if (first.current || reduceMotion) {
      tx.value = x;
      ty.value = y;
      first.current = false;
    } else {
      const jump = Math.abs(r - prev.current.r) + Math.abs(c - prev.current.c) >= 2;
      if (jump) {
        tx.value = withTiming(x, JUMP);
        ty.value = withTiming(y, JUMP);
      } else {
        tx.value = withSpring(x, SPRING);
        ty.value = withSpring(y, SPRING);
      }
    }
    prev.current = { r, c };
  }, [r, c, pitch, reduceMotion, tx, ty]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: cellPx,
          height: cellPx,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Piece size={pieceSize} color={color} />
    </Animated.View>
  );
}
