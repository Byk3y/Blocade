import { View, Text } from 'react-native';
import { colors, fonts, radii, s, shadows } from '../constants/theme';

/**
 * Pebble's speech bubble — a paper card with a small tail pointing up toward
 * his avatar in the player card above. This is where the tutorial's personality
 * lives; the coach line stays plain and instructional below the board.
 */
export function SpeechBubble({ text }: { text: string }) {
  return (
    <View style={{ marginHorizontal: s(16), marginTop: s(8) }}>
      {/* tail */}
      <View
        style={{
          position: 'absolute',
          left: s(28),
          top: s(-5),
          width: s(12),
          height: s(12),
          backgroundColor: colors.surface,
          borderLeftWidth: 1,
          borderTopWidth: 1,
          borderColor: colors.surfaceBorder,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: radii.card,
          paddingVertical: s(11),
          paddingHorizontal: s(15),
          ...shadows.card,
        }}>
        <Text
          style={{
            fontFamily: fonts.satoshiMedium,
            fontSize: s(13),
            lineHeight: s(19),
            color: colors.inkSoft,
          }}>
          {text}
        </Text>
      </View>
    </View>
  );
}
