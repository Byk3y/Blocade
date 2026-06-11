import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot';
import { BotCard } from '@/components/BotCard';
import { BottomNav } from '@/components/BottomNav';
import { PlayButton, IconCircle } from '@/components/Buttons';
import { colors, fonts, radii, s, shadows } from '@/constants/theme';
import { roster, featuredBot, Bot } from '@/constants/game-data';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export default function PlayBots() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Bot>(
    roster[1].bots.find((b) => b.name === featuredBot.name) ?? roster[1].bots[0],
  );
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Intermediate');

  const sectionIndexFor = (bot: Bot) => roster.findIndex((r) => r.bots.some((b) => b.name === bot.name));

  const pick = (bot: Bot) => {
    setSelected(bot);
    const idx = sectionIndexFor(bot);
    setDifficulty(idx === 0 ? 'Beginner' : idx === 1 ? 'Intermediate' : 'Advanced');
  };

  const featured = {
    name: selected.name,
    rating: selected.rating,
    avatar: selected.avatar,
    eyes: selected.eyes,
    difficulty:
      sectionIndexFor(selected) === 0
        ? 'BEGINNER'
        : sectionIndexFor(selected) === 1
          ? 'INTERMEDIATE'
          : 'ADVANCED',
    taunt: selected.taunt,
    subline: `Rating ${selected.rating} · ${selected.styleLine}`,
  };

  return (
    <Screen>
      {/* header */}
      <View
        style={{
          height: s(52),
          paddingHorizontal: s(16),
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(12),
        }}>
        <IconCircle onPress={() => router.back()}>
          <Text style={{ fontSize: s(18), color: colors.inkSoft, marginTop: -2 }}>‹</Text>
        </IconCircle>
        <Text
          style={{
            fontFamily: fonts.clashSemibold,
            fontSize: s(22),
            letterSpacing: -0.3,
            color: colors.ink,
          }}>
          Play Bots
        </Text>
      </View>

      {/* featured rival */}
      <View
        style={{
          marginTop: s(6),
          marginHorizontal: s(20),
          marginBottom: s(14),
          flexDirection: 'row',
          gap: s(16),
          alignItems: 'center',
        }}>
        <Mascot
          size={s(92)}
          radius={s(26)}
          gradient={featured.avatar}
          eyes={featured.eyes}
          mouth={featured.eyes === 'round' ? 'smile' : 'flat'}
          ring={{
            shadowColor: featured.avatar[1],
            shadowOpacity: 0.3,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 14 },
            elevation: 10,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.3)',
          }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: s(7) }}>
          {/* speech bubble with rotated-square tail */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              borderRadius: s(14),
              paddingVertical: s(8),
              paddingHorizontal: s(12),
              ...shadows.card,
            }}>
            <View
              style={{
                position: 'absolute',
                left: s(-5),
                top: s(16),
                width: s(9),
                height: s(9),
                backgroundColor: colors.surface,
                borderLeftWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.surfaceBorder,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <Text style={{ fontFamily: fonts.satoshiItalic, fontSize: s(12.5), color: '#5d6068' }}>
              {featured.taunt}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
            <Text
              style={{
                fontFamily: fonts.clashSemibold,
                fontSize: s(24),
                letterSpacing: -0.3,
                color: colors.ink,
              }}>
              {featured.name}
            </Text>
            <View
              style={{
                backgroundColor: colors.chipOrangeBg,
                borderRadius: 99,
                paddingVertical: s(4),
                paddingHorizontal: s(9),
              }}>
              <Text
                style={{
                  fontFamily: fonts.satoshiBlack,
                  fontSize: s(9),
                  letterSpacing: 1.2,
                  color: colors.chipOrangeText,
                }}>
                {featured.difficulty}
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: fonts.satoshiMedium, fontSize: s(12), color: colors.textMuted }}>
            {featured.subline}
          </Text>
        </View>
      </View>

      {/* roster */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: s(16), gap: s(13), paddingBottom: s(16) }}
        showsVerticalScrollIndicator={false}>
        {roster.map((section) => (
          <View key={section.title} style={{ gap: s(8) }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingHorizontal: s(4),
              }}>
              <Text
                style={{
                  fontFamily: fonts.satoshiBlack,
                  fontSize: s(10),
                  letterSpacing: 2,
                  color: colors.label,
                }}>
                {section.title}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.satoshiBold,
                  fontSize: s(10),
                  color: section.beaten > 0 ? colors.brass : colors.label,
                }}>
                {section.tally}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: s(9) }}>
              {section.bots.map((bot) => (
                <BotCard
                  key={bot.name}
                  bot={
                    bot.state === 'locked'
                      ? bot
                      : { ...bot, state: bot.name === selected.name ? 'selected' : bot.state === 'selected' ? 'open' : bot.state }
                  }
                  onPress={() => pick(bot)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* sticky control panel */}
      <View
        style={{
          backgroundColor: colors.panel,
          borderTopWidth: 1,
          borderTopColor: colors.surfaceBorder,
          paddingTop: s(12),
          paddingHorizontal: s(16),
          paddingBottom: Math.max(insets.bottom, s(8)),
          gap: s(10),
          shadowColor: '#22262e',
          shadowOpacity: 0.09,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: -12 },
          elevation: 16,
        }}>
        {/* segmented difficulty control */}
        <View
          style={{
            flexDirection: 'row',
            gap: s(4),
            backgroundColor: 'rgba(34,38,46,0.06)',
            borderRadius: radii.segOuter,
            padding: s(3),
          }}>
          {DIFFICULTIES.map((d) => {
            const active = d === difficulty;
            return (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  height: s(38),
                  borderRadius: radii.segInner,
                  backgroundColor: active ? colors.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(active
                    ? {
                        shadowColor: '#22262e',
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 4,
                      }
                    : null),
                }}>
                <Text
                  style={{
                    fontFamily: fonts.satoshiBold,
                    fontSize: s(12),
                    color: active ? colors.white : colors.textSecondary,
                  }}>
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <PlayButton
          label={`Play ${selected.name}`}
          onPress={() =>
            router.navigate({
              pathname: '/game',
              params: { mode: 'bot', bot: selected.name, difficulty, nonce: String(Date.now()) },
            })
          }
        />

        <View style={{ marginTop: s(2) }}>
          <BottomNav active="rivals" bare />
        </View>
      </View>
    </Screen>
  );
}
