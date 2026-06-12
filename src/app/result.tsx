import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grad } from '@/components/Grad';
import { Board } from '@/components/Board';
import { Mascot } from '@/components/Mascot';
import { StatStrip } from '@/components/StatStrip';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/Buttons';
import { colors, fonts, gradients, s } from '@/constants/theme';
import { Cell, PieceColor, board, botByName, wallRect, walls as demoWalls } from '@/constants/game-data';
import { GameState, PlayerId, WALLS_PER_PLAYER, routeDist, samePos } from '@/engine';
import { getLastMatch } from '@/state/match-store';

/**
 * Match result — a sheet over the dimmed final board.
 * Reads the real final position/stats from the match store; falls back to the
 * design's demo data when opened without a finished match (deep link).
 */
export default function Result() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    outcome?: string;
    mode?: string;
    bot?: string;
    difficulty?: string;
  }>();

  const match = getLastMatch();
  const playerColor: PieceColor = match?.playerColor ?? 'blue';
  const rivalColor: PieceColor = match?.rivalColor ?? 'orange';
  const local = (match?.mode ?? params.mode) === 'local';
  const winner: PlayerId = match?.winner ?? (params.outcome === 'defeat' || params.outcome === 'p2' ? 1 : 0);
  const win = winner === 0; // "win" = blue side won
  const bot = botByName(match?.botName ?? params.bot ?? undefined);
  const botName = bot?.name ?? 'Riko-9';

  // ---- stats from the real final state -------------------------------------
  const finalState = match?.finalState;
  const turns = finalState?.moveCounts[winner] ?? (win ? 23 : 27);
  const blocksUsed = finalState
    ? WALLS_PER_PLAYER - finalState.players[winner].wallsLeft
    : win
      ? 6
      : 10;
  // how far the loser still was from their goal
  const margin = finalState ? Math.max(1, routeDist(finalState, (1 - winner) as PlayerId)) : 4;

  const title = local
    ? win
      ? 'Blue wins'
      : 'Orange wins'
    : win
      ? margin >= 4
        ? 'Clean escape'
        : 'You win'
      : 'Walled in';

  const subline = local
    ? `Player ${winner + 1} reached the far side in ${turns} turns.`
    : win
      ? `You won in ${turns} turns — ${botName} was still ${margin} moves away.`
      : `${botName} reached the far side first — you lost by ${margin} moves.`;

  const stats = local
    ? [
        { value: String(turns), label: 'TURNS' },
        { value: String(blocksUsed), label: 'BLOCKS USED' },
        {
          value: `+${margin}`,
          label: 'MARGIN',
          color: win ? colors.blue : colors.rivalOrange,
        },
      ]
    : win
      ? [
          { value: String(turns), label: 'TURNS' },
          { value: String(blocksUsed), label: 'BLOCKS USED' },
          { value: `+${margin}`, label: 'ROUTE LEAD', color: colors.blue },
        ]
      : [
          { value: String(turns), label: 'TURNS' },
          { value: String(blocksUsed), label: 'BLOCKS USED' },
          { value: '−12', label: 'RATING', color: colors.rivalOrange },
        ];

  const celebrate = local || win;

  const avatarGradient = local
    ? win
      ? gradients.blueAvatar
      : gradients.orangeAvatar
    : win
      ? gradients.blueAvatar
      : ((bot?.avatar ?? gradients.orangeAvatar) as readonly [string, string]);

  const rematch = () =>
    router.replace({
      pathname: '/game',
      params: {
        mode: local ? 'local' : 'bot',
        bot: match?.botName ?? params.bot ?? '',
        difficulty: match?.difficulty ?? params.difficulty ?? '',
        nonce: String(Date.now()),
      },
    });

  return (
    <Grad colors={gradients.screen} style={{ flex: 1 }}>
      {/* dimmed final board behind the sheet */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + s(74),
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: win ? 0.55 : 0.5,
        }}>
        <Board
          cells={finalState ? finalCells(finalState) : win ? board.victory : board.defeat}
          blocks={
            finalState
              ? finalState.walls.map((w) => ({
                  ...wallRect(w),
                  variant: 'ink' as const,
                  ownerColor: w.owner === 0 ? playerColor : rivalColor,
                }))
              : demoWalls.map((w) => ({
                  ...w,
                  variant: 'ink' as const,
                }))
          }
          emboss={false}
          cardShadow={false}
        />
      </View>

      {/* scrim */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: celebrate ? 'rgba(34,38,46,0.42)' : 'rgba(34,38,46,0.5)',
        }}
      />

      {/* sparse confetti — winners only */}
      {celebrate && (
        <>
          <Confetti x={70} y={120} size={8} color={colors.blue} rotate={20} />
          <Confetti x={300} y={96} size={7} color={colors.rivalOrange} rotate={-15} />
          <Confetti x={200} y={70} size={6} color={colors.brass} round />
          <Confetti x={120} y={60} size={6} color={colors.rivalOrange} rotate={40} />
          <Confetti x={330} y={170} size={6} color={colors.blue} round />
          <Confetti x={48} y={200} size={7} color={colors.brass} rotate={-30} />
        </>
      )}

      {/* result sheet */}
      <Grad
        colors={gradients.sheet}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: s(30),
          borderTopRightRadius: s(30),
          paddingTop: s(30),
          paddingHorizontal: s(24),
          paddingBottom: Math.max(insets.bottom, s(18)),
          alignItems: 'center',
          gap: s(18),
          shadowColor: '#22262e',
          shadowOpacity: celebrate ? 0.35 : 0.4,
          shadowRadius: 50,
          shadowOffset: { width: 0, height: -16 },
          elevation: 24,
        }}>
        {/* winner avatar: brass double ring on a win, neutral on a loss */}
        <View
          style={{
            borderRadius: s(24) + 6,
            borderWidth: 2,
            borderColor: celebrate ? colors.brass : '#d8d2c2',
            padding: 2,
          }}>
          <View style={{ borderRadius: s(24) + 4, borderWidth: 4, borderColor: colors.sheetTop }}>
            <Mascot
              size={s(78)}
              radius={s(24)}
              gradient={avatarGradient}
              eyes={!local && !win ? (bot?.eyes ?? 'round') : 'round'}
              mouth={celebrate ? 'smile' : 'flat'}
              ring={{
                shadowColor: win ? colors.blue : '#cf520c',
                shadowOpacity: win ? 0.35 : 0.3,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 14 },
                elevation: 10,
              }}
            />
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: s(6) }}>
          <Text
            style={{
              fontFamily: fonts.clashBold,
              fontSize: s(38),
              letterSpacing: 0,
              lineHeight: s(40),
              color: colors.ink,
            }}>
            {title}
          </Text>
          <Text
            style={{
              fontFamily: fonts.satoshi,
              fontSize: s(13.5),
              color: colors.textSecondary,
              textAlign: 'center',
            }}>
            {subline}
          </Text>
        </View>

        <StatStrip valueSize={19} shadow={false} stats={stats} />

        <View style={{ width: '100%', gap: s(9) }}>
          <PrimaryButton
            label={celebrate ? 'Run it back' : 'Rematch'}
            height={56}
            fontSize={16}
            onPress={rematch}
          />
          <SecondaryButton
            label={local ? 'Play Bots instead' : 'Choose another rival'}
            height={52}
            fontSize={14.5}
            onPress={() => router.dismissTo('/play-bots')}
          />
          <TextButton label="Back to Home" onPress={() => router.dismissTo('/')} />
        </View>
      </Grad>
    </Grad>
  );
}

/** Final position → cell model (no dots). */
function finalCells(state: GameState): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let bg: string = colors.boardCell;
      if (r === 0) bg = colors.goalBlue;
      if (r === 8) bg = colors.goalOrange;
      const here = { r, c };
      cells.push({
        bg,
        dot: false,
        piece: samePos(state.players[0].pos, here)
          ? 'blue'
          : samePos(state.players[1].pos, here)
            ? 'orange'
            : null,
      });
    }
  }
  return cells;
}

function Confetti({
  x,
  y,
  size,
  color,
  rotate = 0,
  round = false,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  rotate?: number;
  round?: boolean;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: s(x),
        top: s(y),
        width: s(size),
        height: s(size),
        borderRadius: round ? s(size) : 2,
        backgroundColor: color,
        transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
      }}
    />
  );
}
