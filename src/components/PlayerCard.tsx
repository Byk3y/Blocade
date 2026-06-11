import { View, Text } from 'react-native';
import { Mascot } from './Mascot';
import { Ticks } from './Ticks';
import { colors, fonts, radii, s, shadows } from '../constants/theme';
import { EyeStyle } from '../constants/game-data';

/** A player status card (used for both you and the rival on the Game screen). */
export function PlayerCard({
  name,
  rating,
  subline,
  avatar,
  eyes = 'round',
  mouth = 'smile',
  active = false,
  accent = 'blue',
  chip,
  ticks,
}: {
  name: string;
  rating: number;
  subline: string;
  avatar: readonly [string, string, ...string[]];
  eyes?: EyeStyle;
  mouth?: 'smile' | 'flat';
  active?: boolean;
  /** identity colour for the active state + chip (blue = you, orange = rival) */
  accent?: 'blue' | 'orange';
  chip?: string;
  ticks: string[];
}) {
  const accentColor = accent === 'blue' ? colors.blue : colors.rivalOrange;
  const activeBorder = accent === 'blue' ? 'rgba(47,95,224,0.5)' : 'rgba(232,89,12,0.5)';
  const activeShadow =
    accent === 'blue'
      ? shadows.blueSelection
      : { ...shadows.blueSelection, shadowColor: colors.rivalOrange };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: active ? activeBorder : colors.surfaceBorder,
        borderRadius: radii.card,
        paddingVertical: s(10),
        paddingHorizontal: s(14),
        ...(active ? activeShadow : shadows.card),
      }}>
      <Mascot size={s(42)} radius={s(14)} gradient={avatar} eyes={eyes} mouth={mouth} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
          <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(14.5), color: colors.ink }}>{name}</Text>
          {rating > 0 && (
            <Text style={{ fontFamily: fonts.satoshiMedium, fontSize: s(11.5), color: colors.textMuted }}>
              {rating}
            </Text>
          )}
          {chip && (
            <View
              style={{
                backgroundColor: accentColor,
                borderRadius: radii.pill,
                paddingVertical: s(4),
                paddingHorizontal: s(9),
              }}>
              <Text
                style={{
                  fontFamily: fonts.satoshiBlack,
                  fontSize: s(9),
                  letterSpacing: 1.2,
                  color: colors.white,
                }}>
                {chip}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{ fontFamily: fonts.satoshi, fontSize: s(11), color: colors.textMuted, marginTop: s(3) }}>
          {subline}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: s(5) }}>
        <Text
          style={{
            fontFamily: fonts.satoshiBold,
            fontSize: s(9.5),
            letterSpacing: 1.5,
            color: colors.label,
          }}>
          BLOCKS
        </Text>
        <Ticks values={ticks} />
      </View>
    </View>
  );
}
