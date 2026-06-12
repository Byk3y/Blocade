import { useEffect, useMemo } from 'react';
import { Animated, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Board, BlockSpec } from '@/components/Board';
import { BlockTray } from '@/components/BlockTray';
import { PlayerCard } from '@/components/PlayerCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PrimaryButton } from '@/components/Buttons';
import { Grad } from '@/components/Grad';
import { colors, fonts, gradients, s } from '@/constants/theme';
import { Cell, botByName, makeTicks, wallRect } from '@/constants/game-data';
import { GameState, Pos, samePos } from '@/engine';
import { useTutorial } from '@/hooks/use-tutorial';
import { useWallDrag } from '@/hooks/use-wall-drag';
import { markTutorialSeen } from '@/state/tutorial-seen';

export default function HowToPlay() {
  const router = useRouter();
  const pebble = botByName('Pebble');
  const tut = useTutorial();
  const { state, glow, wallPhase, won, busy } = tut;

  const drag = useWallDrag({
    enabled: () => tut.wallPhase,
    getState: () => tut.state,
    placeWall: tut.placeWall,
    onTapWell: tut.onTapWell,
  });

  const cells = useMemo(() => buildCells(state, glow), [state, glow]);

  const blocks = useMemo<BlockSpec[]>(() => {
    const out: BlockSpec[] = state.walls.map((w) => ({ ...wallRect(w), variant: 'ink' }));
    if (tut.targetWall && !drag.drag) {
      out.push({ ...wallRect(tut.targetWall), variant: 'ghost' });
    }
    if (drag.drag && drag.drag.wall.r >= 0) {
      out.push({ ...wallRect(drag.drag.wall), variant: drag.drag.valid ? 'ghost' : 'ghost-bad' });
    }
    return out;
  }, [state.walls, tut.targetWall, drag.drag]);

  // Mark seen no matter HOW the screen is dismissed — Skip, finishing, or a
  // swipe-down on the iOS modal (which never calls leave()). Without this, a
  // swipe-dismiss would leave the flag unwritten and re-show the tutorial on
  // every launch.
  useEffect(() => () => void markTutorialSeen(), []);

  // Dismiss back to wherever it was opened from (Home on first launch, the live
  // match via the in-game ⋯).
  const leave = () => {
    markTutorialSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* header */}
      <View
        style={{
          height: s(52),
          paddingHorizontal: s(20),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text
          style={{
            fontFamily: fonts.clashSemibold,
            fontSize: s(22),
            letterSpacing: -0.3,
            color: colors.ink,
          }}>
          Learn to play
        </Text>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(13), color: colors.textMuted }}>
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Pebble */}
      <View style={{ marginHorizontal: s(16) }}>
        <PlayerCard
          name={pebble?.name ?? 'Pebble'}
          rating={pebble?.rating ?? 320}
          subline={busy ? 'Taking his turn…' : 'Racing you to the bottom row'}
          avatar={(pebble?.avatar ?? gradients.orangeAvatar) as readonly [string, string]}
          eyes={pebble?.eyes ?? 'round'}
          mouth="smile"
          accent="orange"
          active={busy && !won}
          ticks={makeTicks(state.players[1].wallsLeft, colors.rivalOrange)}
        />
      </View>

      <SpeechBubble text={tut.bubble} />

      {/* board + tray + coach */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(10) }}>
        <Board
          cells={cells}
          blocks={blocks}
          dotColor={colors.blue}
          onCellPress={tut.tapCell}
          onMeasureGrid={drag.setGridFrame}
        />
        <BlockTray
          remaining={state.players[0].wallsLeft}
          active={drag.drag ? drag.drag.o : null}
          accent={colors.blue}
          hint={
            wallPhase
              ? drag.drag
                ? 'Drop it on the lane below Pebble'
                : 'Drag the flat block onto the board'
              : 'You’ll place blocks in a moment'
          }
          panHandlersFor={drag.panHandlersFor}
        />
        <Text
          numberOfLines={2}
          style={{
            fontFamily: fonts.satoshiMedium,
            fontSize: s(12.5),
            lineHeight: s(18),
            textAlign: 'center',
            maxWidth: s(320),
            color: tut.isNudge ? colors.rivalOrange : colors.textSecondary,
          }}>
          {tut.coach}
        </Text>
      </View>

      {/* you + progress */}
      <View style={{ marginHorizontal: s(16), marginBottom: s(8) }}>
        <PlayerCard
          name="You"
          rating={1210}
          subline="First to the far side wins"
          avatar={gradients.blueAvatar}
          active={!busy && !won}
          ticks={makeTicks(state.players[0].wallsLeft, colors.blue)}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'center',
          alignItems: 'center',
          gap: s(6),
          marginBottom: s(10),
        }}>
        {Array.from({ length: tut.beatCount }, (_, i) => (
          <View
            key={i}
            style={{
              width: i === tut.beatIndex ? s(18) : s(6),
              height: s(6),
              borderRadius: s(3),
              backgroundColor: i <= tut.beatIndex ? colors.blue : '#d8d2c2',
            }}
          />
        ))}
      </View>

      {/* the block being dragged — follows the finger above everything */}
      {drag.drag && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: [
              { translateX: drag.floatXY.x },
              { translateY: drag.floatXY.y },
              { rotate: '-3deg' },
            ],
          }}>
          <Grad
            colors={gradients.blockInk}
            angle={drag.drag.o === 'h' ? 180 : 90}
            style={{
              width: drag.drag.o === 'h' ? s(74) : s(12),
              height: drag.drag.o === 'h' ? s(12) : s(74),
              borderRadius: s(6),
              opacity: 0.96,
              shadowColor: '#22262e',
              shadowOpacity: 0.45,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 14 },
              elevation: 14,
            }}
          />
        </Animated.View>
      )}

      {/* victory card */}
      {won && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(34,38,46,0.18)',
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: s(28),
              borderTopRightRadius: s(28),
              paddingHorizontal: s(24),
              paddingTop: s(26),
              paddingBottom: s(28),
              gap: s(8),
              ...{
                shadowColor: '#22262e',
                shadowOpacity: 0.38,
                shadowRadius: 50,
                shadowOffset: { width: 0, height: -16 },
                elevation: 20,
              },
            }}>
            <Text
              style={{
                fontFamily: fonts.satoshiBlack,
                fontSize: s(10),
                letterSpacing: 2,
                color: colors.label,
              }}>
              TUTORIAL COMPLETE
            </Text>
            <Text
              style={{
                fontFamily: fonts.clashSemibold,
                fontSize: s(28),
                letterSpacing: -0.3,
                color: colors.ink,
              }}>
              You beat Pebble!
            </Text>
            <Text
              style={{
                fontFamily: fonts.satoshi,
                fontSize: s(14),
                lineHeight: s(21),
                color: colors.textSecondary,
                marginBottom: s(8),
              }}>
              That’s the whole game: race across, leap when you’re cornered, and wall off your rival.
              The real opponents won’t go so easy.
            </Text>
            <PrimaryButton label="Start playing" onPress={leave} />
          </View>
        </View>
      )}
    </Screen>
  );
}

/** Project tutorial state onto the design's cell model, with glow targets. */
function buildCells(state: GameState, glow: Pos[]): Cell[] {
  const p0 = state.players[0].pos;
  const p1 = state.players[1].pos;
  const cells: Cell[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let bg: string = colors.boardCell;
      if (r === 0) bg = colors.goalBlue;
      if (r === 8) bg = colors.goalOrange;
      const here = { r, c };
      cells.push({
        bg,
        dot: glow.some((g) => samePos(g, here)),
        piece: samePos(p0, here) ? 'blue' : samePos(p1, here) ? 'orange' : null,
      });
    }
  }
  return cells;
}
