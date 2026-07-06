import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** Session restored from device storage */
  authReady: boolean;
  /** Profile row still loading after sign-in */
  profileLoading: boolean;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      return;
    }
    const result = await ensureProfile(supabase, user);
    if (result.error) setError(result.error);
    setProfile(result.profile);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    refreshProfile().finally(() => {
      if (!cancelled) setProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when user id changes only
  }, [session?.user?.id, refreshProfile]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      authReady,
      profileLoading,
      loading: !authReady,
      error,
      refreshProfile,
      signOut,
    }),
    [session, profile, authReady, profileLoading, error, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
