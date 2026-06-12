import { Pressable } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, s } from '../constants/theme';

const TRACK_W = 50;
const TRACK_H = 30;
const KNOB = 24;
const PAD = (TRACK_H - KNOB) / 2;

/**
 * An iOS-style pill switch. Blue when on (blue = you), muted track when off —
 * never green (green is reserved for the match-start button). Pure and
 * presentational: the caller fires the click sound/haptic in onValueChange.
 */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const p = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: 160 }), [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.tickOff, colors.blue]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(p.value, [0, 1], [s(PAD), s(TRACK_W - KNOB - PAD)]) }],
  }));

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}>
      <Animated.View
        style={[
          {
            width: s(TRACK_W),
            height: s(TRACK_H),
            borderRadius: s(TRACK_H),
            justifyContent: 'center',
          },
          trackStyle,
        ]}>
        <Animated.View
          style={[
            {
              width: s(KNOB),
              height: s(KNOB),
              borderRadius: s(KNOB),
              backgroundColor: colors.white,
              shadowColor: '#22262e',
              shadowOpacity: 0.2,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
