import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, s } from '../constants/theme';

type Tab = 'home' | 'rivals' | 'profile';

/**
 * 3-tab bottom bar — Home · Rivals · Profile. Shown on Home and Play Bots only,
 * never during a match. Icons are simple geometric marks per the design.
 */
export function BottomNav({
  active,
  bare = false,
}: {
  active: Tab;
  /** When true, renders only the tab row (no panel bg/border) — for embedding in the Play Bots sticky panel. */
  bare?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (tab: Tab) => {
    if (tab === active) return;
    if (tab === 'home') router.navigate('/');
    if (tab === 'rivals') router.navigate('/play-bots');
    // profile: not designed yet — stubbed (no-op)
  };

  const row = (
    <View style={{ flexDirection: 'row' }}>
      <TabItem label="Home" active={active === 'home'} onPress={() => go('home')}>
        <HomeIcon color={active === 'home' ? colors.blue : colors.navInactive} />
      </TabItem>
      <TabItem label="Rivals" active={active === 'rivals'} onPress={() => go('rivals')}>
        <RivalsIcon color={active === 'rivals' ? colors.blue : colors.navInactive} />
      </TabItem>
      <TabItem label="Profile" active={active === 'profile'} onPress={() => go('profile')}>
        <ProfileIcon color={active === 'profile' ? colors.blue : colors.navInactive} />
      </TabItem>
    </View>
  );

  if (bare) return row;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.surfaceBorder,
        backgroundColor: colors.panel,
        paddingTop: s(9),
        paddingHorizontal: s(10),
        paddingBottom: Math.max(insets.bottom, s(8)),
      }}>
      {row}
    </View>
  );
}

function TabItem({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', gap: s(4), minHeight: 44, justifyContent: 'center' }}>
      {children}
      <Text
        style={{
          fontFamily: active ? fonts.satoshiBlack : fonts.satoshiBold,
          fontSize: s(10),
          color: active ? colors.blue : colors.label,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={{ width: s(22), height: s(21) }}>
      <View
        style={{
          position: 'absolute',
          left: s(5),
          top: s(1),
          width: s(12),
          height: s(12),
          transform: [{ rotate: '45deg' }],
          borderRadius: s(3),
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: s(5),
          top: s(12),
          width: s(12),
          height: s(8),
          borderBottomLeftRadius: s(3),
          borderBottomRightRadius: s(3),
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function RivalsIcon({ color }: { color: string }) {
  return (
    <View style={{ width: s(24), height: s(21) }}>
      <View
        style={{
          position: 'absolute',
          left: s(1),
          top: s(5),
          width: s(9),
          height: s(9),
          borderRadius: s(9),
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: s(9),
          top: s(2),
          width: s(12),
          height: s(12),
          borderRadius: s(12),
          backgroundColor: color,
          borderWidth: 2.5,
          borderColor: colors.panel,
        }}
      />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={{ width: s(22), height: s(21) }}>
      <View
        style={{
          position: 'absolute',
          left: s(7),
          top: s(1),
          width: s(8),
          height: s(8),
          borderRadius: s(8),
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: s(4),
          top: s(11),
          width: s(14),
          height: s(8),
          borderTopLeftRadius: s(7),
          borderTopRightRadius: s(7),
          borderBottomLeftRadius: s(3),
          borderBottomRightRadius: s(3),
          backgroundColor: color,
        }}
      />
    </View>
  );
}
