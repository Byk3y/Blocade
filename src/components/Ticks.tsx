import { View } from 'react-native';
import { s } from '../constants/theme';

/** The 10 roadblock ticks (filled = remaining). */
export function Ticks({ values }: { values: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: s(3) }}>
      {values.map((bg, i) => (
        <View key={i} style={{ width: s(9), height: s(14), borderRadius: s(3), backgroundColor: bg }} />
      ))}
    </View>
  );
}
