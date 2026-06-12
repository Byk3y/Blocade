import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot';
import { Grad } from '@/components/Grad';
import { Piece } from '@/components/Piece';
import { colors, fonts, s, shadows } from '@/constants/theme';
import { roster, featuredBot, Bot } from '@/constants/game-data';
import { botPortraits } from '@/constants/bot-portraits';

const DIFFICULTIES = ['Friendly', 'Intermediate', 'Advanced'] as const;
type PlayerChoice = 'green' | 'orange';

const ui = {
  tile: '#e8e0d1',
  tilePressed: '#ded4c2',
  tileSelected: '#f5f8ec',
  sheet: '#fbf8f1',
  control: '#fffdf8',
  controlPressed: '#f4efe3',
  stroke: '#d8cfbc',
  green: '#8fbc5b',
  text: colors.ink,
  muted: colors.textMuted,
};

function ratingFlag() {
  return (
    <View
      style={{
        width: s(16),
        height: s(11),
        borderRadius: s(1.5),
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(34,38,46,0.12)',
      }}>
      <View style={{ flex: 1, backgroundColor: '#b92732' }} />
      <View style={{ flex: 1, backgroundColor: '#ffffff' }} />
      <View style={{ flex: 1, backgroundColor: '#b92732' }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: s(7),
          height: s(6.5),
          backgroundColor: '#244b95',
        }}
      />
    </View>
  );
}

function Crown({ offset = 0 }: { offset?: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '50%',
        bottom: s(-8),
        width: s(20),
        height: s(17),
        marginLeft: s(-10 + offset),
        shadowColor: '#7d5d11',
        shadowOpacity: 0.3,
        shadowRadius: s(2),
        shadowOffset: { width: 0, height: s(1) },
      }}>
      <Svg width={s(20)} height={s(17)} viewBox="0 0 40 34">
        <Defs>
          <SvgLinearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffe36a" />
            <Stop offset="0.62" stopColor="#f3c73c" />
            <Stop offset="1" stopColor="#d7a728" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M4 12.5L12.7 20.3L20 5L27.3 20.3L36 12.5L32.8 30H7.2L4 12.5Z"
          fill="url(#crownGold)"
          stroke="#b8891c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <Path d="M9.5 25.5H30.5" stroke="#fff0a6" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      </Svg>
    </View>
  );
}

function SpeechTail() {
  return (
    <Svg
      width={s(22)}
      height={s(24)}
      viewBox="0 0 44 48"
      style={{ position: 'absolute', left: s(-17), bottom: s(10), zIndex: 3 }}>
      <Path
        d="M44 2C38.2 4.2 34.3 8.8 31.1 16.2C27.2 25.3 20.1 31.1 8 31.9C16.4 39.1 28.5 40.2 36.5 34.1C42.3 29.7 44.5 22.7 44 14.5V2Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function ChevronDown() {
  return (
    <View style={{ width: s(26), height: s(26), alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s(16)} height={s(10)} viewBox="0 0 32 20">
        <Path d="M4 4L16 16L28 4" fill="none" stroke={ui.muted} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function BotTile({ bot, selected, onPress }: { bot: Bot; selected: boolean; onPress: () => void }) {
  const crowns = bot.state === 'beaten' ? 2 : bot.crown ? 1 : 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: s(58),
        height: s(58),
        borderRadius: s(4),
        backgroundColor: selected ? ui.tileSelected : pressed ? ui.tilePressed : ui.tile,
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'visible',
        borderWidth: selected ? s(2.5) : 0,
        borderColor: selected ? ui.green : 'transparent',
      })}>
      <Mascot
        size={selected ? s(50) : s(53)}
        radius={s(3)}
        gradient={bot.avatar}
        eyes={bot.eyes}
        mouth={bot.eyes === 'round' ? 'smile' : 'flat'}
        crown={false}
        portrait={bot.portrait ? botPortraits[bot.portrait] : undefined}
        style={{ marginBottom: selected ? s(1) : s(3) }}
      />
      {crowns === 1 && <Crown />}
      {crowns >= 2 && (
        <>
          <Crown offset={-7} />
          <Crown offset={7} />
        </>
      )}
    </Pressable>
  );
}

function PieceChoice({
  color,
  active,
  onPress,
}: {
  color: PlayerChoice;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: s(44),
        height: s(44),
        borderRadius: s(7),
        backgroundColor: active ? '#eef5e5' : '#fffdf8',
        borderWidth: active ? s(2.5) : s(1.5),
        borderColor: active ? ui.green : ui.stroke,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        ...shadows.card,
      })}>
      <Piece size={s(27)} color={color} />
    </Pressable>
  );
}

export default function PlayBots() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Bot>(
    roster[1].bots.find((b) => b.name === featuredBot.name) ?? roster[1].bots[0],
  );
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Friendly');
  const [playerColor, setPlayerColor] = useState<PlayerChoice>('green');

  const sectionIndexFor = (bot: Bot) => roster.findIndex((r) => r.bots.some((b) => b.name === bot.name));

  const pick = (bot: Bot) => {
    setSelected(bot);
    const idx = sectionIndexFor(bot);
    setDifficulty(idx <= 0 ? 'Friendly' : idx === 1 ? 'Intermediate' : 'Advanced');
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: s(58),
            paddingHorizontal: s(20),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({
              position: 'absolute',
              left: s(20),
              width: s(34),
              height: s(34),
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
            })}>
            <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(42), lineHeight: s(42), color: ui.muted }}>
              ‹
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fonts.clashBold,
              fontSize: s(30),
              color: ui.text,
            }}>
            Play Bots
          </Text>
        </View>

        <View style={{ paddingTop: s(10), paddingHorizontal: s(16), paddingBottom: s(14) }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Mascot
              size={s(64)}
              radius={s(4)}
              gradient={selected.avatar}
              eyes={selected.eyes}
              mouth={selected.eyes === 'round' ? 'smile' : 'flat'}
              style={{ marginRight: s(-1), zIndex: 1 }}
            />
            <View
              style={{
                flex: 1,
                minHeight: s(46),
                marginBottom: s(4),
                marginLeft: s(14),
                backgroundColor: '#ffffff',
                borderRadius: s(14),
                paddingVertical: s(7),
                paddingHorizontal: s(13),
                justifyContent: 'center',
                zIndex: 2,
                ...shadows.card,
              }}>
              <SpeechTail />
              <Text
                style={{
                  fontFamily: fonts.satoshiMedium,
                  fontSize: s(16.5),
                  lineHeight: s(21),
                  color: '#333331',
                }}>
                {selected.taunt.replace(/[“”]/g, '')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(9), marginTop: s(12) }}>
            <Text style={{ fontFamily: fonts.clashBold, fontSize: s(24), color: ui.text }}>{selected.name}</Text>
            <Text style={{ fontFamily: fonts.satoshiMedium, fontSize: s(20), color: ui.muted }}>
              {selected.rating}
            </Text>
            {ratingFlag()}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: s(16),
            paddingBottom: s(162),
            gap: s(29),
          }}
          showsVerticalScrollIndicator={false}>
          {roster.map((section, index) => (
            <View key={section.title} style={{ gap: s(15) }}>
              <Text
                style={{
                  fontFamily: fonts.clashSemibold,
                  fontSize: s(22),
                  color: colors.textSecondary,
                }}>
                {section.title === 'ADVANCED & MASTER' ? 'Advanced' : section.title[0] + section.title.slice(1).toLowerCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: s(17), rowGap: s(23) }}>
                {section.bots.map((bot) => (
                  <BotTile key={bot.name} bot={bot} selected={bot.name === selected.name} onPress={() => pick(bot)} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: ui.sheet,
            borderTopLeftRadius: s(14),
            borderTopRightRadius: s(14),
            paddingTop: s(16),
            paddingHorizontal: s(14),
            paddingBottom: Math.max(insets.bottom, s(12)),
            gap: s(13),
            shadowColor: '#22262e',
            shadowOpacity: 0.12,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: -12 },
            elevation: 22,
            borderTopWidth: 1,
            borderTopColor: colors.surfaceBorder,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
            <Pressable
              onPress={() =>
                setDifficulty((current) => {
                  const next = (DIFFICULTIES.indexOf(current) + 1) % DIFFICULTIES.length;
                  return DIFFICULTIES[next];
                })
              }
              style={({ pressed }) => ({
                flex: 1,
                height: s(48),
                borderRadius: s(10),
                backgroundColor: pressed ? ui.controlPressed : ui.control,
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
                paddingHorizontal: s(15),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.8 : 1,
                shadowColor: '#000000',
                shadowOpacity: 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
              })}>
              <Text style={{ fontFamily: fonts.satoshiBlack, fontSize: s(17.5), color: ui.text }}>
                {difficulty}
              </Text>
              <ChevronDown />
            </Pressable>

            <View style={{ flexDirection: 'row', gap: s(7) }}>
              <PieceChoice color="green" active={playerColor === 'green'} onPress={() => setPlayerColor('green')} />
              <PieceChoice color="orange" active={playerColor === 'orange'} onPress={() => setPlayerColor('orange')} />
            </View>
          </View>

          <Pressable
            onPress={() =>
              router.navigate({
                pathname: '/game',
                params: {
                  mode: 'bot',
                  bot: selected.name,
                  difficulty,
                  playerColor,
                  nonce: String(Date.now()),
                },
              })
            }>
            {({ pressed }) => (
              <Grad
                colors={['#9aca5f', '#78ad4e']}
                style={{
                  height: s(58),
                  borderRadius: s(9),
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.88 : 1,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.26)',
                  shadowColor: '#000000',
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                }}>
                <Text style={{ fontFamily: fonts.clashBold, fontSize: s(28), color: '#ffffff' }}>Play</Text>
              </Grad>
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
