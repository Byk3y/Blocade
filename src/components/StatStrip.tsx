import { View, Text } from 'react-native';
import { colors, fonts, radii, s, shadows } from '../constants/theme';

export interface Stat {
  value: string;
  label: string;
  color?: string;
}

/** White card with N equal stat columns divided by 1px lines. */
export function StatStrip({
  stats,
  valueSize = 20,
  shadow = true,
}: {
  stats: Stat[];
  valueSize?: number;
  shadow?: boolean;
}) {
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: radii.card,
        paddingVertical: s(14),
        ...(shadow ? shadows.card : null),
      }}>
      {stats.map((st, i) => (
        <View key={i} style={{ flex: 1, flexDirection: 'row' }}>
          {i > 0 && <View style={{ width: 1, backgroundColor: colors.divider }} />}
          <View style={{ flex: 1, alignItems: 'center', gap: s(3) }}>
            <Text
              style={{
                fontFamily: fonts.clashSemibold,
                fontSize: s(valueSize),
                color: st.color ?? colors.ink,
              }}>
              {st.value}
            </Text>
            <Text
              style={{
                fontFamily: fonts.satoshiBold,
                fontSize: s(9.5),
                letterSpacing: 0,
                color: colors.label,
              }}>
              {st.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
