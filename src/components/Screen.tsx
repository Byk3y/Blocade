import { View, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grad } from './Grad';
import { gradients } from '../constants/theme';

/**
 * Screen shell: the paper gradient background + safe-area handling.
 * The device provides its own status bar and home indicator, so unlike the
 * mock we don't draw fake ones.
 */
export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children: React.ReactNode;
  edges?: ('top' | 'bottom')[];
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Grad colors={gradients.screen} style={{ flex: 1 }}>
      <View
        style={[
          {
            flex: 1,
            paddingTop: edges.includes('top') ? insets.top : 0,
            paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          },
          style,
        ]}>
        {children}
      </View>
    </Grad>
  );
}
