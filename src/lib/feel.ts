import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getFeelSettings } from '@/state/settings';

/**
 * The centralized "feel" layer: pairs HAPTICS + SOUND for each game action so
 * every action feels the same every time, and so themes can later swap the
 * sound set in one place. Motion (Reanimated springs / entering / board settle)
 * lives in components because it is shared-value driven; this module owns only
 * the imperative, fire-and-forget half.
 *
 * Called from src/hooks/use-game.ts at the points where actions commit.
 */
export type FeelEvent = 'move' | 'wallPlaced' | 'wallIllegal' | 'win' | 'loss' | 'uiTap';

/**
 * Sound sources (Kenney CC0 packs, converted to wav in src/assets/sounds/; raw
 * packs live in the gitignored audio-source/). move=Interface select_001,
 * wall=Impact impactWood_medium, illegal=Impact impactSoft_medium,
 * win=Music-Jingles Pizzicato, uiTap=UI Audio switch. Swap any by overwriting
 * the wav of the same name.
 */
const SOUND_SOURCES: Partial<Record<FeelEvent, number>> = {
  move: require('../assets/sounds/move.wav'),
  wallPlaced: require('../assets/sounds/wall.wav'),
  wallIllegal: require('../assets/sounds/illegal.wav'),
  win: require('../assets/sounds/win.wav'),
  loss: require('../assets/sounds/loss.wav'),
  uiTap: require('../assets/sounds/toggle.wav'),
};

let players: Partial<Record<FeelEvent, AudioPlayer>> | null = null;

function ensurePlayers() {
  if (players) return;
  players = {};
  // play through the iOS silent switch — SFX shouldn't depend on ringer state
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  for (const key of Object.keys(SOUND_SOURCES) as FeelEvent[]) {
    try {
      players[key] = createAudioPlayer(SOUND_SOURCES[key]!);
    } catch {
      // a bad/missing asset must never break gameplay
    }
  }
}

function haptic(event: FeelEvent) {
  switch (event) {
    case 'move':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'wallPlaced':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'wallIllegal':
      // a single firm "thunk", not the heavy 3-pulse Error — a soft "no"
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    case 'win':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'loss':
      // a downbeat double-pulse — not the rewarding Success buzz
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'uiTap':
      // light selection tick for toggles/switches in the UI
      return Haptics.selectionAsync();
  }
}

/** Fire the haptic + sound paired with a game action, respecting user settings. */
export function feel(event: FeelEvent) {
  const s = getFeelSettings();
  if (s.muted) return;

  if (s.haptics) {
    // Haptics calls are promises; we don't await and we swallow rejections
    // (e.g. unsupported hardware) so they can never affect game flow.
    haptic(event)?.catch(() => {});
  }

  if (s.sound && SOUND_SOURCES[event]) {
    ensurePlayers();
    const p = players?.[event];
    if (p) {
      p.seekTo(0).catch(() => {}); // rewind so rapid repeats retrigger
      try {
        p.play();
      } catch {
        // a playback hiccup must never affect game flow
      }
    }
  }
}
