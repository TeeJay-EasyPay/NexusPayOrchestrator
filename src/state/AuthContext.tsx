import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";
import { writeAuditLog } from "../services/auditLog";

const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD;

// During Expo development, always start from the login screen after a terminal reload.
// Production builds can keep normal persistent sessions.
const FORCE_LOGIN_ON_DEV_RELOAD = __DEV__;

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  demoAccessEnabled: boolean;
  enableDemoAccess: () => Promise<string | null>;
  disableDemoAccess: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function upsertProfile(session: Session | null) {
  if (!session?.user) return;

  await supabase.from("profiles").upsert({
    id: session.user.id,
    email: session.user.email,
    updated_at: new Date().toISOString(),
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAccessEnabled, setDemoAccessEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initialiseSecureEntry() {
      if (!isSupabaseConfigured) {
        console.error(getSupabaseConfigError());

        if (isMounted) {
          setSession(null);
          setDemoAccessEnabled(false);
          setLoading(false);
        }

        return;
      }

      const {
        data: { session: existingSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.warn("Unable to load existing Supabase session", error.message);
      }

      if (FORCE_LOGIN_ON_DEV_RELOAD && existingSession) {
        await supabase.auth.signOut();

        if (isMounted) {
          setSession(null);
          setDemoAccessEnabled(false);
          setLoading(false);
        }

        return;
      }

      if (isMounted) {
        setSession(existingSession ?? null);
        setDemoAccessEnabled(existingSession?.user?.email === DEMO_EMAIL);
        setLoading(false);
      }

      await upsertProfile(existingSession ?? null);
    }

    initialiseSecureEntry();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setDemoAccessEnabled(nextSession?.user?.email === DEMO_EMAIL);
      await upsertProfile(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function enableDemoAccess() {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      return "Demo access is not configured. Add EXPO_PUBLIC_DEMO_EMAIL and EXPO_PUBLIC_DEMO_PASSWORD to your .env file.";
    }

    const error = await signIn(DEMO_EMAIL, DEMO_PASSWORD);

    if (error) {
      setDemoAccessEnabled(false);
      return error;
    }

    setDemoAccessEnabled(true);

    await writeAuditLog({
      eventType: "LOGIN",
      metadata: {
        email: DEMO_EMAIL,
        mode: "DEMO_PLATFORM_ACCESS",
      },
    });

    return null;
  }

  function disableDemoAccess() {
    setDemoAccessEnabled(false);
  }

  async function signIn(email: string, password: string) {
    try {
      if (!isSupabaseConfigured) {
        return getSupabaseConfigError();
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return error.message;
      }

      setSession(data.session);
      setDemoAccessEnabled(normalizedEmail === DEMO_EMAIL);

      await upsertProfile(data.session);

      await writeAuditLog({
        eventType: "LOGIN",
        metadata: {
          email: normalizedEmail,
        },
      });

      return null;
    } catch (error) {
      console.error("Sign in failed", error);
      return "Unable to reach Supabase. Check your internet connection and Supabase URL.";
    }
  }

  async function signUp(email: string, password: string) {
    try {
      if (!isSupabaseConfigured) {
        return getSupabaseConfigError();
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRedirectTo = Linking.createURL("/account-created");

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        return error.message;
      }

      if (data.session) {
        setSession(data.session);
        setDemoAccessEnabled(normalizedEmail === DEMO_EMAIL);
        await upsertProfile(data.session);
      }

      await writeAuditLog({
        eventType: "SIGNUP",
        metadata: {
          email: normalizedEmail,
          emailRedirectTo,
          session_created: Boolean(data.session),
        },
      });

      return null;
    } catch (error) {
      console.error("Sign up failed", error);
      return "Unable to reach Supabase. Check your internet connection and Supabase configuration.";
    }
  }

  async function signOut() {
    setDemoAccessEnabled(false);
    setSession(null);
    await supabase.auth.signOut();
  }

  const value = useMemo(
    () => ({
      session,
      loading,
      demoAccessEnabled,
      enableDemoAccess,
      disableDemoAccess,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, demoAccessEnabled]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
