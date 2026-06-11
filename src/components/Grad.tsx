import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

/** Map a CSS gradient angle (deg) to expo-linear-gradient start/end points. */
export function angleToPoints(deg: number) {
  const r = (deg * Math.PI) / 180;
  const x = Math.sin(r);
  const y = -Math.cos(r);
  return {
    start: { x: (1 - x) / 2, y: (1 - y) / 2 },
    end: { x: (1 + x) / 2, y: (1 + y) / 2 },
  };
}

type Props = {
  colors: readonly [string, string, ...string[]];
  angle?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
} & Omit<ComponentProps<typeof LinearGradient>, 'colors' | 'start' | 'end' | 'style'>;

/** LinearGradient that accepts a CSS-style angle (default 180deg = top→bottom). */
export function Grad({ colors, angle = 180, style, children, ...rest }: Props) {
  const { start, end } = angleToPoints(angle);
  return (
    <LinearGradient colors={colors} start={start} end={end} style={style} {...rest}>
      {children}
    </LinearGradient>
  );
}
