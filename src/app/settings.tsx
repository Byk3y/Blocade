import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Screen } from '@/components/Screen';
import { IconCircle } from '@/components/Buttons';
import { Toggle } from '@/components/Toggle';
import { colors, fonts, radii, s, shadows } from '@/constants/theme';
import { useSettings } from '@/state/settings';
import { feel } from '@/lib/feel';

export default function Settings() {
  const router = useRouter();
  const { sound, haptics, reduceMotion, setSound, setHaptics, setReduceMotionOverride } =
    useSettings();

  // every toggle gives the same tactile confirmation, through the feel layer
  // (which itself respects the sound/haptics the user is changing)
  const change = (fn: (v: boolean) => void) => (v: boolean) => {
    feel('uiTap');
    fn(v);
  };

  const version = Constants.expoConfig?.version;

  return (
    <Screen edges={['top', 'bottom']}>
      {/* header */}
      <View
        style={{
          height: s(50),
          paddingHorizontal: s(16),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <IconCircle onPress={() => router.back()}>
          <Text style={{ fontSize: s(18), color: colors.inkSoft, marginTop: -2 }}>‹</Text>
        </IconCircle>
        <Text style={{ fontFamily: fonts.clashSemibold, fontSize: s(22), color: colors.ink }}>
          Settings
        </Text>
        {/* spacer to keep the title centred */}
        <View style={{ width: s(40) }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: s(20), paddingTop: s(18) }}>
        <Text
          style={{
            fontFamily: fonts.satoshiBold,
            fontSize: s(11),
            letterSpacing: 1.4,
            color: colors.textSecondary,
            marginBottom: s(10),
            marginLeft: s(4),
          }}>
          FEEL
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingHorizontal: s(16),
            ...shadows.card,
          }}>
          <SettingRow
            label="Sound"
            sub="Taps, thocks, and the win flourish."
            value={sound}
            onValueChange={change(setSound)}
          />
          <Divider />
          <SettingRow
            label="Haptics"
            sub="Vibration on moves and walls."
            value={haptics}
            onValueChange={change(setHaptics)}
          />
          <Divider />
          <SettingRow
            label="Reduce Motion"
            sub="Pieces snap instead of sliding."
            value={reduceMotion}
            onValueChange={change(setReduceMotionOverride)}
          />
        </View>
      </View>

      {version ? (
        <Text
          style={{
            fontFamily: fonts.satoshi,
            fontSize: s(11),
            color: colors.label,
            textAlign: 'center',
            marginBottom: s(14),
          }}>
          Blocade {version}
        </Text>
      ) : null}
    </Screen>
  );
}

function SettingRow({
  label,
  sub,
  value,
  onValueChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: s(15),
        gap: s(12),
      }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(15.5), color: colors.ink }}>
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.satoshi,
            fontSize: s(12),
            color: colors.textMuted,
            marginTop: s(2),
          }}>
          {sub}
        </Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}
