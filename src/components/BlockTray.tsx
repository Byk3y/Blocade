import { GestureResponderHandlers, Text, View } from 'react-native';
import { Grad } from './Grad';
import { colors, fonts, radii, s, gradients, shadows } from '../constants/theme';

/**
 * The block tray directly under the board: a label + two wells (horizontal and
 * vertical). Drag a well's block onto the board to place a roadblock; a quick
 * tap arms tap-to-place mode instead. Both are driven by one PanResponder per
 * well supplied through `panHandlersFor`.
 */
export function BlockTray({
  remaining,
  active = null,
  hint,
  accent = colors.blue,
  panHandlersFor,
}: {
  remaining: number;
  active?: 'h' | 'v' | null;
  hint: string;
  /** selection colour — blue for you, orange for player 2 in pass & play */
  accent?: string;
  /** tap/drag handlers for each well */
  panHandlersFor?: (o: 'h' | 'v') => GestureResponderHandlers | undefined;
}) {
  const empty = remaining <= 0;
  return (
    <View
      style={{
        width: s(370),
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: radii.card,
        paddingVertical: s(10),
        paddingHorizontal: s(14),
        ...shadows.card,
      }}>
      <View style={{ flex: 1, minWidth: 0, gap: s(3) }}>
        <Text
          style={{
            fontFamily: fonts.satoshiBold,
            fontSize: s(9.5),
            letterSpacing: 1.5,
            color: colors.label,
          }}>
          {empty ? 'NO BLOCKS LEFT' : `BLOCKS · ${remaining} LEFT`}
        </Text>
        <Text style={{ fontFamily: fonts.satoshi, fontSize: s(11), color: colors.textSecondary }}>
          {hint}
        </Text>
      </View>

      {/* horizontal well */}
      <Well active={active === 'h'} accent={accent} dim={empty} panHandlers={panHandlersFor?.('h')}>
        <Grad
          colors={gradients.trayBlockUnder}
          angle={180}
          pointerEvents="none"
          style={{ position: 'absolute', left: s(13), top: s(34), width: s(54), height: s(10), borderRadius: s(5) }}
        />
        <Grad
          colors={gradients.trayBlock}
          angle={180}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: s(8),
            top: s(22),
            width: s(60),
            height: s(11),
            borderRadius: s(6),
            shadowColor: '#22262e',
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        />
      </Well>

      {/* vertical well */}
      <Well active={active === 'v'} accent={accent} dim={empty} panHandlers={panHandlersFor?.('v')}>
        <Grad
          colors={gradients.trayBlockUnder}
          angle={90}
          pointerEvents="none"
          style={{ position: 'absolute', left: s(42), top: s(7), width: s(10), height: s(48), borderRadius: s(5) }}
        />
        <Grad
          colors={gradients.trayBlock}
          angle={90}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: s(28),
            top: s(5),
            width: s(11),
            height: s(52),
            borderRadius: s(6),
            shadowColor: '#22262e',
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        />
      </Well>
    </View>
  );
}

function Well({
  children,
  active,
  accent,
  dim,
  panHandlers,
}: {
  children: React.ReactNode;
  active: boolean;
  accent: string;
  dim: boolean;
  panHandlers?: GestureResponderHandlers;
}) {
  return (
    <View
      {...panHandlers}
      style={{
        width: s(78),
        height: s(62),
        borderRadius: radii.well,
        backgroundColor: active ? colors.selectedCardBg : colors.insetWell,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? accent : colors.surfaceBorder,
        opacity: dim ? 0.45 : 1,
        ...(active
          ? {
              shadowColor: accent,
              shadowOpacity: 0.25,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 5,
            }
          : null),
      }}>
      {children}
    </View>
  );
}
