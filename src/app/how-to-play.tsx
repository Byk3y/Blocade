import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Board, BlockSpec } from '@/components/Board';
import { PrimaryButton } from '@/components/Buttons';
import { colors, fonts, s } from '@/constants/theme';
import { Cell, tutorialCells } from '@/constants/game-data';

/** 5×5 tutorial board variants. Design pitch: 30px cells, 5px gaps (P=35). */
function makeTutCells(opts: { dots?: [number, number][]; you?: [number, number]; opp?: [number, number] }): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      let bg: string = colors.boardCell;
      if (r === 0) bg = colors.goalBlue;
      if (r === 4) bg = colors.goalOrange;
      cells.push({
        bg,
        dot: opts.dots?.some((d) => d[0] === r && d[1] === c) ?? false,
        piece:
          opts.you && r === opts.you[0] && c === opts.you[1]
            ? 'blue'
            : opts.opp && r === opts.opp[0] && c === opts.opp[1]
              ? 'orange'
              : null,
      });
    }
  }
  return cells;
}

const STEPS: { title: string; body: string; cells: Cell[]; blocks: BlockSpec[] }[] = [
  {
    title: 'Race to the far side',
    body: 'Move one cell per turn. Reach any cell of the tinted row on the far side before your rival reaches yours.',
    cells: makeTutCells({ you: [3, 2], opp: [0, 2], dots: [[2, 2], [3, 1], [3, 3]] }),
    blocks: [],
  },
  {
    title: 'Wall them off',
    body: 'Drag a block between lanes to slow your rival down. Blocks span two cells — and you only get ten.',
    cells: tutorialCells,
    blocks: [
      { x: 35, y: 64, w: 65, h: 7, variant: 'ink' },
      { x: 70, y: 29, w: 65, h: 7, variant: 'ghost' },
    ],
  },
  {
    title: 'Jump when face-to-face',
    body: 'If your rival is directly in front of you, leap straight over them. Blocked behind? Step diagonally around instead.',
    cells: makeTutCells({ you: [3, 2], opp: [2, 2], dots: [[1, 2]] }),
    blocks: [],
  },
];

export default function HowToPlay() {
  const router = useRouter();
  const [step, setStep] = useState(1); // mock shows card 2

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else router.back();
  };

  const current = STEPS[step];

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
          How to play
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontFamily: fonts.satoshiBold, fontSize: s(13), color: colors.textMuted }}>
            Skip
          </Text>
        </Pressable>
      </View>

      {/* card */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: s(26),
          paddingHorizontal: s(28),
        }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: s(24),
            padding: s(18),
            shadowColor: '#22262e',
            shadowOpacity: 0.1,
            shadowRadius: 34,
            shadowOffset: { width: 0, height: 14 },
            elevation: 8,
          }}>
          <Board
            cells={current.cells}
            n={5}
            cell={30}
            gap={5}
            blocks={current.blocks}
            card={false}
            padding={0}
          />
        </View>

        <View style={{ alignItems: 'center', gap: s(9) }}>
          <Text
            style={{
              fontFamily: fonts.satoshiBlack,
              fontSize: s(10),
              letterSpacing: 2,
              color: colors.label,
            }}>
            STEP {step + 1} OF 3
          </Text>
          <Text
            style={{
              fontFamily: fonts.clashSemibold,
              fontSize: s(27),
              letterSpacing: -0.3,
              color: colors.ink,
            }}>
            {current.title}
          </Text>
          <Text
            style={{
              fontFamily: fonts.satoshi,
              fontSize: s(14),
              lineHeight: s(22),
              color: colors.textSecondary,
              textAlign: 'center',
              maxWidth: s(280),
            }}>
            {current.body}
          </Text>
        </View>

        {/* page dots — active is an 18×6 blue pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
          {STEPS.map((_, i) => (
            <Pressable key={i} onPress={() => setStep(i)} hitSlop={8}>
              <View
                style={{
                  width: i === step ? s(18) : s(6),
                  height: s(6),
                  borderRadius: s(3),
                  backgroundColor: i === step ? colors.blue : '#d8d2c2',
                }}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: s(20), paddingBottom: s(10) }}>
        <PrimaryButton label={step === STEPS.length - 1 ? 'Let’s play' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}
