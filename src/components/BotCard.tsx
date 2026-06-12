import { View, Text, Pressable } from 'react-native';
import { Mascot } from './Mascot';
import { colors, fonts, radii, s } from '../constants/theme';
import { Bot } from '../constants/game-data';
import { botPortraits } from '../constants/bot-portraits';

/** A roster bot card with open / selected / beaten / locked states. */
export function BotCard({ bot, onPress }: { bot: Bot; onPress?: () => void }) {
  const selected = bot.state === 'selected';
  const locked = bot.state === 'locked';
  const beaten = bot.state === 'beaten';

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: selected ? colors.selectedCardBg : locked ? colors.lockedCardBg : colors.surface,
        borderWidth: selected ? 1.5 : 1,
        borderStyle: locked ? 'dashed' : 'solid',
        borderColor: selected ? 'rgba(47,95,224,0.6)' : locked ? '#ddd5c2' : colors.surfaceBorder,
        borderRadius: radii.botCard,
        paddingTop: s(10),
        paddingBottom: s(9),
        paddingHorizontal: s(4),
        ...(selected
          ? {
              shadowColor: colors.blue,
              shadowOpacity: 0.16,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }
          : !locked
            ? {
                shadowColor: '#22262e',
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }
            : null),
      }}>
      <View style={{ alignItems: 'center', gap: s(5), opacity: locked ? 0.45 : 1 }}>
        <Mascot
          size={s(44)}
          radius={s(14)}
          gradient={bot.avatar}
          eyes={bot.eyes}
          mouth={bot.eyes === 'round' ? 'smile' : 'flat'}
          crown={bot.crown}
          portrait={bot.portrait ? botPortraits[bot.portrait] : undefined}
        />
        <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(11.5), lineHeight: s(12), color: colors.ink }}>
          {bot.name}
        </Text>
        <Text
          style={{
            fontFamily: fonts.satoshiMedium,
            fontSize: s(10),
            lineHeight: s(10.5),
            color: colors.label,
          }}>
          {bot.rating}
        </Text>
      </View>

      {beaten && (
        <View
          style={{
            position: 'absolute',
            top: s(-6),
            right: s(-5),
            width: s(19),
            height: s(19),
            borderRadius: s(19),
            backgroundColor: colors.brass,
            borderWidth: 2,
            borderColor: colors.bgTop,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: fonts.satoshiBlack, fontSize: s(10), color: colors.white, lineHeight: s(12) }}>
            ✓
          </Text>
        </View>
      )}

      {locked && (
        <View
          style={{
            position: 'absolute',
            top: s(-6),
            right: s(-5),
            width: s(19),
            height: s(19),
            borderRadius: s(19),
            backgroundColor: '#454b57',
            borderWidth: 2,
            borderColor: colors.bgTop,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {/* padlock: shackle + body */}
          <View
            style={{
              width: s(7),
              height: s(5),
              borderWidth: 1.5,
              borderBottomWidth: 0,
              borderColor: '#f1ead9',
              borderTopLeftRadius: s(4),
              borderTopRightRadius: s(4),
            }}
          />
          <View
            style={{
              width: s(9),
              height: s(6),
              borderRadius: 1.5,
              backgroundColor: '#f1ead9',
              marginTop: -1,
            }}
          />
        </View>
      )}
    </Pressable>
  );
}
