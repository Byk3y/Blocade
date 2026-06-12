import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Game-feel preferences (haptics / sound / mute) plus an effective reduce-motion
 * flag. Device-local, like {@link hasSeenTutorial} — these are tactile
 * preferences, not progression worth a server round-trip.
 *
 * Two consumers:
 *  - React components read the live values via {@link useSettings} (to gate
 *    Reanimated motion behind reduce-motion).
 *  - The imperative, non-React feel module reads a plain snapshot via
 *    {@link getFeelSettings} so it never has to touch React context.
 */
export interface FeelSettings {
  /** master switch — silences haptics AND sound */
  muted: boolean;
  haptics: boolean;
  sound: boolean;
  /** effective: user override (if set) OR the OS "reduce motion" setting */
  reduceMotion: boolean;
}

interface StoredPrefs {
  muted: boolean;
  haptics: boolean;
  sound: boolean;
  /** user's explicit override; null = follow the OS */
  reduceMotion: boolean | null;
}

// v2: v1 persisted sound:false (the old default) on first launch and it stuck;
// bumping the key gives everyone the current defaults (sound on) cleanly.
const KEY = 'blocade.v2.feel';

// Sound is now wired (Kenney Impact SFX); haptics + motion + sound all live.
const DEFAULTS: StoredPrefs = {
  muted: false,
  haptics: true,
  sound: true,
  reduceMotion: null,
};

// Module singleton kept in sync by the provider so the imperative feel module
// (src/lib/feel.ts) can read live settings without importing React context.
let snapshot: FeelSettings = {
  muted: DEFAULTS.muted,
  haptics: DEFAULTS.haptics,
  sound: DEFAULTS.sound,
  reduceMotion: false,
};

/** Live settings snapshot for non-React callers (the feel module). */
export function getFeelSettings(): FeelSettings {
  return snapshot;
}

interface SettingsValue extends FeelSettings {
  setMuted: (v: boolean) => void;
  setHaptics: (v: boolean) => void;
  setSound: (v: boolean) => void;
  /** null = follow OS reduce-motion */
  setReduceMotionOverride: (v: boolean | null) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(DEFAULTS);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const mounted = useRef(true);
  // don't persist until we've read storage, or the initial DEFAULTS write would
  // clobber the user's saved prefs before hydration finishes.
  const hydrated = useRef(false);
  useEffect(() => () => void (mounted.current = false), []);

  // hydrate stored prefs (best-effort, like tutorial-seen)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw && mounted.current) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {
        // keep defaults
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  // track OS reduce-motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted.current) setSystemReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => sub.remove();
  }, []);

  const reduceMotion = prefs.reduceMotion ?? systemReduceMotion;

  // publish the live snapshot (so the imperative feel module reads current
  // values immediately), but only write to disk once hydration has run.
  useEffect(() => {
    snapshot = {
      muted: prefs.muted,
      haptics: prefs.haptics,
      sound: prefs.sound,
      reduceMotion,
    };
    if (hydrated.current) AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, reduceMotion]);

  const patch = useCallback((p: Partial<StoredPrefs>) => setPrefs((cur) => ({ ...cur, ...p })), []);

  const value = useMemo<SettingsValue>(
    () => ({
      muted: prefs.muted,
      haptics: prefs.haptics,
      sound: prefs.sound,
      reduceMotion,
      setMuted: (v) => patch({ muted: v }),
      setHaptics: (v) => patch({ haptics: v }),
      setSound: (v) => patch({ sound: v }),
      setReduceMotionOverride: (v) => patch({ reduceMotion: v }),
    }),
    [prefs, reduceMotion, patch],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
