import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View, Text, Pressable } from 'react-native';
import { useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Board, BlockSpec, GridFrame } from '@/components/Board';
import { useSettings } from '@/state/settings';
import { BlockTray } from '@/components/BlockTray';
import { PlayerCard } from '@/components/PlayerCard';
import { IconCircle } from '@/components/Buttons';
import { Grad } from '@/components/Grad';
import { colors, fonts, gradients, s } from '@/constants/theme';
import { Cell, P, PieceColor, botByName, makeTicks, wallRect } from '@/constants/game-data';
import { botPortraits } from '@/constants/bot-portraits';
import { GameState, Orientation, Pos, Wall, canPlaceWall, samePos } from '@/engine';
import { useGame } from '@/hooks/use-game';
import { setLastMatch } from '@/state/match-store';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function Game() {
  const params = useLocalSearchParams<{
    mode?: string;
    bot?: string;
    difficulty?: string;
    playerColor?: string;
    nonce?: string;
  }>();
  const mode = params.mode === 'local' ? 'local' : 'bot';
  const botName = mode === 'bot' ? (params.bot ?? 'Riko-9') : undefined;
  const playerColor: PieceColor | undefined =
    params.playerColor === 'green' || params.playerColor === 'orange' ? params.playerColor : undefined;
  const yourPieceColor = playerColor ?? 'blue';
  const rivalPieceColor: PieceColor = mode === 'bot' && yourPieceColor === 'orange' ? 'green' : 'orange';
  // key remounts the whole match on rematch (fresh nonce) or rival change
  return (
    <Match
      key={`${mode}-${botName ?? 'local'}-${playerColor ?? 'blue'}-${params.nonce ?? '0'}`}
      mode={mode}
      botName={botName}
      difficulty={params.difficulty}
      playerColor={yourPieceColor}
      rivalColor={rivalPieceColor}
    />
  );
}

function Match({
  mode,
  botName,
  difficulty,
  playerColor,
  rivalColor,
}: {
  mode: 'bot' | 'local';
  botName?: string;
  difficulty?: string;
  playerColor: PieceColor;
  rivalColor: PieceColor;
}) {
  const router = useRouter();
  const bot = botByName(botName);

  const onGameOver = useCallback(
    (final: GameState) => {
      setLastMatch({
        mode,
        botName,
        difficulty,
        playerColor,
        rivalColor,
        winner: final.winner!,
        finalState: final,
      });
      const outcome =
        mode === 'local' ? (final.winner === 0 ? 'p1' : 'p2') : final.winner === 0 ? 'victory' : 'defeat';
      router.replace({
        pathname: '/result',
        params: { outcome, mode, bot: botName ?? '', difficulty: difficulty ?? '' },
      });
    },
    [mode, botName, difficulty, playerColor, rivalColor, router],
  );

  const game = useGame({ mode, bot, difficulty, onGameOver });
  const { state, ui, feedback, botThinking, humanTurn, legalTargets } = game;

  // ---- drag-and-drop roadblock placement -----------------------------------
  const cellPx = s(34);
  const gapPx = s(6);
  const pitch = s(P); // 40 = cell + gap
  const gridSize = 9 * cellPx + 8 * gapPx;

  const [drag, setDrag] = useState<{ o: Orientation; wall: Wall; valid: boolean } | null>(null);
  const floatXY = useRef(new Animated.ValueXY()).current;
  const gridFrame = useRef<GridFrame | null>(null);

  // PanResponder closures are created once, so read live values through a ref
  const live = useRef({ humanTurn, state, game });
  live.current = { humanTurn, state, game };

  const blockDims = (o: Orientation) =>
    o === 'h' ? { w: s(74), h: s(12) } : { w: s(12), h: s(74) };

  // lift the aim point above the fingertip so the thumb never covers the block
  const dragLift = s(60);

  /** window pointer → nearest wall anchor (r,c). Both orientations share the math. */
  const snapWall = useCallback(
    (pageX: number, pageY: number, o: Orientation): Wall | null => {
      const f = gridFrame.current;
      if (!f) return null;
      const px = pageX - f.x;
      const py = pageY - f.y;
      if (px < -pitch || px > gridSize + pitch || py < -pitch || py > gridSize + pitch) return null;
      const c = clamp(Math.round((px - cellPx - gapPx / 2) / pitch), 0, 7);
      const r = clamp(Math.round((py - cellPx - gapPx / 2) / pitch), 0, 7);
      return { r, c, o };
    },
    [pitch, gridSize, cellPx, gapPx],
  );

  const makeResponder = useCallback(
    (o: Orientation) => {
      let dragging = false; // per-gesture: has the finger moved enough to be a drag?
      return PanResponder.create({
        onStartShouldSetPanResponder: () =>
          live.current.humanTurn && live.current.state.winner === null,
        onPanResponderGrant: () => {
          dragging = false;
        },
        onPanResponderMove: (_e, g) => {
          if (!dragging && Math.abs(g.dx) + Math.abs(g.dy) < 5) return; // still might be a tap
          if (!dragging) {
            dragging = true;
            live.current.game.resetMode(); // leave tap-to-place mode if it was armed
          }
          const { w, h } = blockDims(o);
          const aimX = g.moveX;
          const aimY = g.moveY - dragLift; // interact a finger's height above the touch
          floatXY.setValue({ x: aimX - w / 2, y: aimY - h / 2 });
          const wall = snapWall(aimX, aimY, o);
          const valid = wall ? canPlaceWall(live.current.state, wall).ok : false;
          setDrag((d) => {
            if (d && wall && d.wall.r === wall.r && d.wall.c === wall.c && d.valid === valid) {
              return d;
            }
            return { o, wall: wall ?? { r: -1, c: -1, o }, valid };
          });
        },
        onPanResponderRelease: (_e, g) => {
          if (!dragging) {
            live.current.game.pickWall(o); // it was a tap → arm tap-to-place
          } else {
            const wall = snapWall(g.moveX, g.moveY - dragLift, o);
            // placeWall already surfaces the specific rejection reason
            // (e.g. "That roadblock blocks every route") via doAction, so we
            // must not overwrite it here with a generic message.
            if (wall) live.current.game.placeWall(wall);
          }
          dragging = false;
          setDrag(null);
        },
        onPanResponderTerminate: () => {
          dragging = false;
          setDrag(null);
        },
      });
    },
    [snapWall, floatXY],
  );

  const responders = useRef<Record<Orientation, ReturnType<typeof PanResponder.create>> | null>(null);
  if (!responders.current) {
    responders.current = { h: makeResponder('h'), v: makeResponder('v') };
  }

  // ---- game feel -----------------------------------------------------------
  const { reduceMotion } = useSettings();
  // a ~1px board "settle" when any wall lands (human or bot)
  const settle = useSharedValue(0);
  const prevWallCount = useRef(state.walls.length);
  useEffect(() => {
    const count = state.walls.length;
    if (count > prevWallCount.current && !reduceMotion) {
      // press DOWN under the wall's weight, then a smaller rebound up to rest —
      // asymmetric recoil reads heavier than a symmetric bounce
      settle.value = withSequence(
        withTiming(s(1.2), { duration: 55 }),
        withTiming(-s(0.6), { duration: 45 }),
        withSpring(0, { damping: 13, stiffness: 380 }),
      );
    }
    prevWallCount.current = count;
  }, [state.walls.length, reduceMotion, settle]);

  const yourPieceColor = playerColor;
  const rivalPieceColor = rivalColor;
  const colorValue = (color: PieceColor) =>
    color === 'green' ? colors.playerGreen : color === 'blue' ? colors.blue : colors.rivalOrange;
  const activeBlockColor: PieceColor = mode === 'local' && state.turn === 1 ? rivalPieceColor : yourPieceColor;
  const blockGradient =
    activeBlockColor === 'green'
      ? gradients.blockGreen
      : activeBlockColor === 'orange'
        ? gradients.blockOrange
        : gradients.blockBlue;
  const turnColor = state.turn === 0 ? yourPieceColor : rivalPieceColor;
  const showDots = humanTurn && ui.kind === 'move' && state.winner === null && !drag;

  const cells = useMemo(
    () => buildCells(state, showDots ? legalTargets : [], yourPieceColor, rivalPieceColor),
    [state, showDots, legalTargets, yourPieceColor, rivalPieceColor],
  );

  const blocks = useMemo<BlockSpec[]>(() => {
    const placed: BlockSpec[] = state.walls.map((w) => ({
      ...wallRect(w),
      variant: 'ink',
      ownerColor: w.owner === 0 ? yourPieceColor : rivalPieceColor,
      // stable identity so only a newly-placed wall mounts → drop-animates
      key: `${w.o}${w.r}-${w.c}`,
    }));
    // live drag snap preview (green/neutral when legal, orange when not)
    if (drag && drag.wall.r >= 0) {
      placed.push({ ...wallRect(drag.wall), variant: drag.valid ? 'ghost' : 'ghost-bad' });
    } else if (ui.kind === 'wall' && ui.preview) {
      const ghost = wallRect(ui.preview);
      placed.push({ ...ghost, variant: 'ghost' });
      // the in-hand block hovering above its snap target, like the mock
      placed.push({
        x: ghost.x + (ui.preview.o === 'h' ? 14 : -15),
        y: ghost.y + (ui.preview.o === 'h' ? -15 : 14),
        w: ghost.w - (ui.preview.o === 'h' ? 8 : 0),
        h: ghost.h - (ui.preview.o === 'h' ? 0 : 8),
        variant: 'floating',
        rotate: -3,
      });
    }
    return placed;
  }, [state.walls, ui, drag]);

  // 8×8 grid of tap targets centred on wall intersections, only in wall mode
  const slotOverlay =
    ui.kind === 'wall' ? (
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {Array.from({ length: 64 }, (_, i) => {
          const r = Math.floor(i / 8);
          const c = i % 8;
          return (
            <Pressable
              key={i}
              onPress={() => game.tapSlot(r, c)}
              style={{
                position: 'absolute',
                left: s(c * P + 17),
                top: s(r * P + 17),
                width: s(P),
                height: s(P),
              }}
            />
          );
        })}
      </View>
    ) : undefined;

  // ---- copy ----------------------------------------------------------------

  const statusDefault =
    ui.kind === 'wall'
      ? ui.preview
        ? 'Tap the block again to place it — or aim at another lane'
        : `Tap between tiles to aim the ${ui.o === 'h' ? 'horizontal' : 'vertical'} roadblock`
      : state.winner !== null
        ? state.winner === 0
          ? mode === 'local'
            ? 'Blue reached the far side!'
            : 'You reached the far side!'
          : mode === 'local'
            ? 'Orange reached the far side!'
            : `${bot?.name ?? 'They'} reached the far side`
        : humanTurn
          ? 'Tap a marked cell to move — or pick a block below'
          : `${bot?.name ?? 'Rival'} is thinking…`;

  const status = feedback?.text ?? statusDefault;
  const statusColor =
    feedback?.tone === 'good'
      ? colors.blue
      : feedback?.tone === 'bad'
        ? colors.rivalOrange
        : colors.textSecondary;

  const oppCard =
    mode === 'local'
      ? {
          name: 'Player 2',
          rating: undefined,
          subline: state.turn === 1 && state.winner === null ? 'Your move — pass the phone' : 'Racing to the bottom row',
          avatar: gradients.orangeAvatar,
          eyes: 'round' as const,
          portrait: undefined,
        }
      : {
          name: bot?.name ?? 'Rival',
          rating: bot?.rating,
          subline:
            state.winner === 1
              ? 'Made it across'
              : botThinking
                ? 'Thinking…'
                : (bot?.styleLine ?? 'Ready'),
          avatar: (bot?.avatar ?? gradients.orangeAvatar) as readonly [string, string],
          eyes: bot?.eyes ?? ('round' as const),
          portrait: bot?.portrait ? botPortraits[bot.portrait] : undefined,
        };

  const yourName = mode === 'local' ? 'Player 1' : 'You';
  const yourSubline =
    state.winner === 0
      ? 'Made it across'
      : ui.kind === 'wall'
        ? 'Placing a roadblock'
        : 'First to the far side wins';

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
        <Text
          style={{
            fontFamily: fonts.satoshiBlack,
            fontSize: s(13.5),
            letterSpacing: 0,
            color: colors.ink,
          }}>
          BLOCADE
        </Text>
        <IconCircle onPress={() => router.navigate('/how-to-play')}>
          <Text style={{ fontSize: s(17), color: colors.inkSoft }}>⋯</Text>
        </IconCircle>
      </View>

      {/* rival / player 2 card */}
      <View style={{ marginTop: s(8), marginHorizontal: s(16) }}>
        <PlayerCard
          name={oppCard.name}
          rating={oppCard.rating ?? 0}
          subline={oppCard.subline}
          avatar={oppCard.avatar}
          portrait={oppCard.portrait}
          eyes={oppCard.eyes}
          mouth="flat"
          accent="orange"
          active={mode === 'local' && state.turn === 1 && state.winner === null}
          chip={mode === 'local' && state.turn === 1 && state.winner === null ? 'YOUR MOVE' : undefined}
          ticks={makeTicks(state.players[1].wallsLeft, colors.rivalOrange)}
        />
      </View>

      {/* board + tray + status */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(10) }}>
        <Board
          cells={cells}
          blocks={blocks}
          dotColor={colorValue(turnColor)}
          onCellPress={game.tapCell}
          onMeasureGrid={(f) => (gridFrame.current = f)}
          overlay={slotOverlay}
          animatePieces
          pieces={[
            { pos: state.players[0].pos, color: yourPieceColor },
            { pos: state.players[1].pos, color: rivalPieceColor },
          ]}
          animateBlocks={!reduceMotion}
          settle={settle}
          reduceMotion={reduceMotion}
        />
        <BlockTray
          remaining={state.players[mode === 'local' ? state.turn : 0].wallsLeft}
          active={drag ? drag.o : ui.kind === 'wall' ? ui.o : null}
          accent={mode === 'local' && state.turn === 1 ? colors.rivalOrange : colorValue(yourPieceColor)}
          blockColor={activeBlockColor}
          hint={
            drag
              ? 'Drop it on a lane between tiles'
              : ui.kind === 'wall'
                ? 'Tap the well again to cancel'
                : 'Drag a block onto the board'
          }
          panHandlersFor={(o) => (humanTurn ? responders.current?.[o].panHandlers : undefined)}
        />
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.satoshiMedium, fontSize: s(12), color: statusColor }}>
          {status}
        </Text>
      </View>

      {/* your card */}
      <View style={{ marginHorizontal: s(16), marginBottom: s(10) }}>
        <PlayerCard
          name={yourName}
          rating={mode === 'bot' ? 1210 : 0}
          subline={yourSubline}
          avatar={gradients.blueAvatar}
          accent={yourPieceColor}
          active={state.turn === 0 && state.winner === null}
          chip={state.turn === 0 && state.winner === null ? 'YOUR MOVE' : undefined}
          ticks={makeTicks(state.players[0].wallsLeft, colorValue(yourPieceColor))}
        />
      </View>

      {/* the block being dragged — follows the finger above everything */}
      {drag && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: [
              { translateX: floatXY.x },
              { translateY: floatXY.y },
              { rotate: '-3deg' },
            ],
          }}>
          <Grad
            colors={blockGradient}
            angle={drag.o === 'h' ? 180 : 90}
            style={{
              width: drag.o === 'h' ? s(74) : s(12),
              height: drag.o === 'h' ? s(12) : s(74),
              borderRadius: s(6),
              opacity: 0.96,
              borderWidth: 1,
              borderColor: colorValue(activeBlockColor),
              borderTopColor: 'rgba(255,255,255,0.58)',
              shadowColor: colorValue(activeBlockColor),
              shadowOpacity: 0.48,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 14 },
              elevation: 14,
            }}
          />
        </Animated.View>
      )}
    </Screen>
  );
}

/** Project engine state onto the design's cell model. */
function buildCells(
  state: GameState,
  dots: Pos[],
  playerOneColor: PieceColor = 'blue',
  playerTwoColor: PieceColor = 'orange',
): Cell[] {
  const cells: Cell[] = [];
  const p0 = state.players[0].pos;
  const p1 = state.players[1].pos;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let bg: string = colors.boardCell;
      if (r === 0) bg = colors.goalBlue;
      if (r === 8) bg = colors.goalOrange;
      const here = { r, c };
      cells.push({
        bg,
        dot: dots.some((d) => samePos(d, here)),
        piece: samePos(p0, here) ? playerOneColor : samePos(p1, here) ? playerTwoColor : null,
      });
    }
  }
  return cells;
}
