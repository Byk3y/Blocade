import { useCallback, useRef, useState } from 'react';
import { Animated, GestureResponderHandlers, PanResponder } from 'react-native';
import { GameState, Orientation, Wall, canPlaceWall } from '../engine';
import { P } from '../constants/game-data';
import { s } from '../constants/theme';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface DragState {
  o: Orientation;
  wall: Wall;
  valid: boolean;
}

/**
 * Drag-to-place roadblock gesture, factored out of the Game screen so the
 * tutorial can reuse the exact same interaction (a tap arms nothing here — the
 * tutorial teaches drag — but a quick tap still routes to `onTapWell`).
 *
 * The Game screen can adopt this hook later; for now it owns its own copy so
 * this stays a pure addition with zero churn to live gameplay.
 */
export function useWallDrag({
  enabled,
  getState,
  placeWall,
  onTapWell,
  beforeDrag,
}: {
  /** read live: are we allowed to start a drag right now? */
  enabled: () => boolean;
  getState: () => GameState;
  /** commit a snapped wall; return true if it landed */
  placeWall: (wall: Wall) => boolean;
  /** a quick tap (no drag) on a well */
  onTapWell: (o: Orientation) => void;
  /** called once when a real drag begins (leave any armed mode) */
  beforeDrag?: () => void;
}) {
  const cellPx = s(34);
  const gapPx = s(6);
  const pitch = s(P);
  const gridSize = 9 * cellPx + 8 * gapPx;
  const dragLift = s(60);

  const [drag, setDrag] = useState<DragState | null>(null);
  const floatXY = useRef(new Animated.ValueXY()).current;
  const gridFrame = useRef<{ x: number; y: number } | null>(null);

  // PanResponder closures are created once — read live values through a ref.
  const live = useRef({ enabled, getState, placeWall, onTapWell, beforeDrag });
  live.current = { enabled, getState, placeWall, onTapWell, beforeDrag };

  const blockDims = (o: Orientation) =>
    o === 'h' ? { w: s(74), h: s(12) } : { w: s(12), h: s(74) };

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
      let dragging = false;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.enabled(),
        onPanResponderGrant: () => {
          dragging = false;
        },
        onPanResponderMove: (_e, g) => {
          if (!dragging && Math.abs(g.dx) + Math.abs(g.dy) < 5) return;
          if (!dragging) {
            dragging = true;
            live.current.beforeDrag?.();
          }
          const { w, h } = blockDims(o);
          const aimX = g.moveX;
          const aimY = g.moveY - dragLift;
          floatXY.setValue({ x: aimX - w / 2, y: aimY - h / 2 });
          const wall = snapWall(aimX, aimY, o);
          const valid = wall ? canPlaceWall(live.current.getState(), wall).ok : false;
          setDrag((d) => {
            if (d && wall && d.wall.r === wall.r && d.wall.c === wall.c && d.valid === valid) return d;
            return { o, wall: wall ?? { r: -1, c: -1, o }, valid };
          });
        },
        onPanResponderRelease: (_e, g) => {
          if (!dragging) {
            live.current.onTapWell(o);
          } else {
            const wall = snapWall(g.moveX, g.moveY - dragLift, o);
            if (wall) live.current.placeWall(wall);
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

  const panHandlersFor = useCallback(
    (o: Orientation): GestureResponderHandlers | undefined => responders.current?.[o].panHandlers,
    [],
  );

  const setGridFrame = useCallback((f: { x: number; y: number }) => {
    gridFrame.current = f;
  }, []);

  return { drag, floatXY, panHandlersFor, setGridFrame };
}
