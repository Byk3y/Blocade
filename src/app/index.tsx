import { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useAuth } from '@/state/auth';
import { hasSeenTutorial } from '@/state/tutorial-seen';
import { Screen } from '@/components/Screen';
import { Grad } from '@/components/Grad';
import { Mascot } from '@/components/Mascot';
import { StatStrip } from '@/components/StatStrip';
import { BottomNav } from '@/components/BottomNav';
import { PrimaryButton, SecondaryButton, IconCircle } from '@/components/Buttons';
import { colors, fonts, gradients, s } from '@/constants/theme';
import { pieceGradient } from '@/constants/theme';

export default function Home() {
  const router = useRouter();
  const { loading, profile } = useAuth();
  const checkedFirstLaunch = useRef(false);

  // Live profile with sensible defaults while it loads / when offline.
  const username = profile?.username ?? 'Player';
  const rating = profile?.rating ?? 1000;
  const wins = profile?.wins ?? 0;
  const streak = profile?.streak ?? 0;

  // First launch: once the app has settled (silent anon sign-in done), present
  // the guided first match over Home. Runs at most once per app session.
  useEffect(() => {
    if (loading || checkedFirstLaunch.current) return;
    checkedFirstLaunch.current = true;
    let cancelled = false;
    hasSeenTutorial().then((seen) => {
      if (!cancelled && !seen) router.navigate('/how-to-play');
    });
    return () => {
      cancelled = true;
    };
  }, [loading, router]);

  return (
    <Screen>
      {/* profile row */}
      <View
        style={{
          marginTop: s(8),
          marginHorizontal: s(20),
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(12),
        }}>
        <Mascot size={s(44)} radius={s(15)} gradient={gradients.blueAvatar} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.satoshiBold, fontSize: s(15), color: colors.ink }}>
            {username}
          </Text>
          <Text
            style={{ fontFamily: fonts.satoshi, fontSize: s(12), color: colors.textMuted, marginTop: 1 }}>
            Rating {rating}
          </Text>
        </View>
        <IconCircle size={40} onPress={() => router.navigate('/settings')}>
          <Text style={{ fontSize: s(16), color: colors.inkSoft }}>⋯</Text>
        </IconCircle>
      </View>

      {/* hero */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: s(22),
          paddingHorizontal: s(28),
        }}>
        <BrandMark />
        <View style={{ alignItems: 'center', gap: s(8) }}>
          <Text
            style={{
              fontFamily: fonts.clashSemibold,
              fontSize: s(44),
              letterSpacing: 0,
              lineHeight: s(44),
              color: colors.ink,
            }}>
            BLOCADE
          </Text>
          <Text
            style={{
              fontFamily: fonts.satoshiMedium,
              fontSize: s(14),
              letterSpacing: 0,
              color: colors.textSecondary,
            }}>
            Race across. Block everything.
          </Text>
        </View>
        <StatStrip
          stats={[
            { value: String(wins), label: 'WINS' },
            { value: String(streak), label: 'STREAK' },
            { value: String(rating), label: 'RATING' },
          ]}
        />
      </View>

      {/* CTAs */}
      <View style={{ paddingHorizontal: s(20), gap: s(10) }}>
        <PrimaryButton label="Play Bots" onPress={() => router.navigate('/play-bots')} />
        <SecondaryButton
          label="Pass & Play"
          onPress={() =>
            router.navigate({
              pathname: '/game',
              params: { mode: 'local', nonce: String(Date.now()) },
            })
          }
        />
        <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(2) }}>
          {['Online', 'Puzzle', 'Ranked'].map((m) => (
            <SoonChip key={m} label={m} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: s(14) }}>
        <BottomNav active="home" />
      </View>
    </Screen>
  );
}

/** 120px brand mark: white card with a 3×3 mini-board, one ink block, two pieces. */
function BrandMark() {
  const cell = s(26);
  const gap = s(7);
  return (
    <View
      style={{
        width: s(120),
        height: s(120),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: s(26),
        padding: s(14),
        shadowColor: '#22262e',
        shadowOpacity: 0.1,
        shadowRadius: 34,
        shadowOffset: { width: 0, height: 14 },
        elevation: 8,
      }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: cell * 3 + gap * 2 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: s(7),
              backgroundColor: colors.boardCell,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {i === 2 && <MiniPiece size={cell - s(6)} color="orange" />}
            {i === 6 && <MiniPiece size={cell - s(6)} color="blue" />}
          </View>
        ))}
      </View>
      {/* ink block between rows 1 and 2, spanning two cells */}
      <Grad
        colors={gradients.blockInk}
        style={{
          position: 'absolute',
          left: s(13),
          top: s(44),
          width: s(59),
          height: s(7),
          borderRadius: s(4),
          shadowColor: '#22262e',
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      />
    </View>
  );
}

function MiniPiece({ size, color }: { size: number; color: 'blue' | 'orange' }) {
  const g = pieceGradient[color];
  const id = `brand-${color}`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="32%" cy="28%" r="78%">
          {g.stops.map((c, i) => (
            <Stop key={i} offset={g.offsets[i]} stopColor={c} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

function SoonChip({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
        height: s(42),
        borderRadius: s(14),
        backgroundColor: 'rgba(34,38,46,0.045)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s(6),
      }}>
      <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(12), color: colors.disabledText }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: colors.soonBg,
          borderRadius: 99,
          paddingVertical: s(3),
          paddingHorizontal: s(7),
        }}>
        <Text
          style={{
            fontFamily: fonts.satoshiBold,
            fontSize: s(8.5),
            letterSpacing: 0,
            color: colors.textMuted,
          }}>
          SOON
        </Text>
      </View>
    </View>
  );
}
