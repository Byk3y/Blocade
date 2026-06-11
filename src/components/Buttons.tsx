import { Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Grad } from './Grad';
import { colors, fonts, gradients, radii, s, shadows } from '../constants/theme';

/** Primary blue CTA — gradient, 56–58px tall. */
export function PrimaryButton({
  label,
  onPress,
  height = 58,
  fontSize = 16.5,
  style,
}: {
  label: string;
  onPress?: () => void;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={style}>
      {({ pressed }) => (
        <Grad
          colors={gradients.bluePrimary}
          style={{
            height: s(height),
            borderRadius: radii.button,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.25)',
            ...shadows.bluePrimary,
          }}>
          <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(fontSize), color: colors.white }}>
            {label}
          </Text>
        </Grad>
      )}
    </Pressable>
  );
}

/** Green match-start button — the only green element on any screen. */
export function PlayButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={style}>
      {({ pressed }) => (
        <Grad
          colors={gradients.greenPlay}
          style={{
            height: s(58),
            borderRadius: radii.button,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.3)',
            ...shadows.greenPlay,
          }}>
          <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(16.5), color: colors.white }}>
            {label}
          </Text>
        </Grad>
      )}
    </Pressable>
  );
}

/** Secondary white outlined button. */
export function SecondaryButton({
  label,
  onPress,
  height = 54,
  fontSize = 15,
  style,
}: {
  label: string;
  onPress?: () => void;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: s(height),
          borderRadius: radii.button,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: '#dcd4c2',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}>
      <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(fontSize), color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

/** Text-only tertiary button. */
export function TextButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { height: s(40), alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 },
        style,
      ]}>
      <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(13), color: colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

/** 38–40px round icon button on a card surface (back / reset / menu). */
export function IconCircle({
  size = 38,
  onPress,
  children,
  style,
}: {
  size?: number;
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: s(size),
          height: s(size),
          borderRadius: s(size),
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
