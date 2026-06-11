import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { View } from 'react-native';
import { pieceGradient } from '../constants/theme';
import { PieceColor } from '../constants/game-data';

/** A player pawn — radial-gradient sphere (circle at 32% 28%) with a soft drop shadow. */
export function Piece({ size, color }: { size: number; color: PieceColor }) {
  const g = pieceGradient[color];
  const id = `piece-${color}`;
  return (
    <View
      style={{
        width: size,
        height: size,
        shadowColor: '#22262e',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="32%" cy="28%" r="78%">
            {g.stops.map((c, i) => (
              <Stop key={i} offset={g.offsets[i]} stopColor={c} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
