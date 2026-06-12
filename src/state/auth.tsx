import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** still resolving the initial session/profile */
  loading: boolean;
  /** true once we have a cloud identity; false means we're running offline */
  online: boolean;
  refreshProfile: () => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  /** record a finished match server-side; returns the updated profile (or null offline) */
  recordResult: (won: boolean, ratingDelta: number, botName?: string) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function fetchProfile(id: string): Promise<Profile | null> {
  // one retry covers the rare race where the signup trigger hasn't committed yet
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (data) return data;
    if (error && attempt === 1) {
      console.warn('[auth] profile fetch failed:', error.message);
      return null;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const user = session?.user ?? null;

  // Guards so only the most recent profile load wins, and never applies after
  // unmount. loadSeq is bumped on every load AND on sign-out, so an in-flight
  // fetch can't clobber a newer result or a sign-out's null.
  const loadSeq = useRef(0);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const loadProfile = useCallback(async (id: string) => {
    const seq = ++loadSeq.current;
    const next = await fetchProfile(id);
    if (mounted.current && seq === loadSeq.current) setProfile(next);
  }, []);

  useEffect(() => {
    // onAuthStateChange is the single source of truth for session + profile:
    // it fires INITIAL_SESSION on subscribe (existing session) and SIGNED_IN
    // after anonymous sign-in, so we never fetch the profile twice.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) loadProfile(next.user.id);
      else {
        loadSeq.current++;
        setProfile(null);
      }
    });

    // Ensure a session exists (frictionless anonymous identity). Degrades to
    // offline if anonymous sign-in isn't enabled in the project.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.warn('[auth] anonymous sign-in unavailable:', error.message);
      }
      if (mounted.current) setLoading(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // refresh the auth token only while the app is foregrounded (RN best practice)
  useEffect(() => {
    const apply = (s: string) => {
      if (s === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    apply(AppState.currentState); // seed from the real launch state, not 'active'
    const sub = AppState.addEventListener('change', apply);
    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const setUsername = useCallback(
    async (name: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .update({ username: name })
        .eq('id', user.id)
        .select()
        .single();
      if (error) console.warn('[auth] setUsername failed:', error.message);
      if (data) setProfile(data);
    },
    [user],
  );

  const recordResult = useCallback(
    async (won: boolean, ratingDelta: number, botName?: string): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('record_match_result', {
        p_won: won,
        p_rating_delta: ratingDelta,
        p_bot_name: botName,
      });
      if (error) {
        console.warn('[auth] recordResult failed:', error.message);
        return null;
      }
      if (data) setProfile(data);
      return data;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        online: !!session,
        refreshProfile,
        setUsername,
        recordResult,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
