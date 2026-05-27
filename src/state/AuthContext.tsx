import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    getSupabaseConfigError,
    isSupabaseConfigured,
    supabase,
} from "../lib/supabase";
import { writeAuditLog } from "../services/auditLog";
import {
    logStartupError,
    logStartupInfo,
    logStartupWarn,
} from "../services/startupLogger";

const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD;

const FORCE_LOGIN_ON_DEV_RELOAD = __DEV__;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

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

  try {
    await supabase.from("profiles").upsert({
      id: session.user.id,
      email: session.user.email,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    logStartupWarn({
      event: "profile-upsert-skipped",
      stage: "supabase-init",
      status: "fallback",
      details: {
        reason:
          error instanceof Error ? error.message : "Unable to persist profile during bootstrap",
      },
    });
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAccessEnabled, setDemoAccessEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let ignoreAuthEventsUntil = FORCE_LOGIN_ON_DEV_RELOAD ? Date.now() + 1200 : 0;

    async function initialiseSecureEntry() {
      logStartupInfo({
        event: "auth-bootstrap-start",
        stage: "app-bootstrap",
        status: "start",
      });

      try {
        if (!isSupabaseConfigured) {
          console.error(getSupabaseConfigError());
          logStartupWarn({
            event: "supabase-config-missing",
            stage: "supabase-init",
            status: "fallback",
            details: {
              message: getSupabaseConfigError(),
            },
          });

          if (isMounted) {
            setSession(null);
            setDemoAccessEnabled(false);
            setLoading(false);
          }

          return;
        }

        if (FORCE_LOGIN_ON_DEV_RELOAD) {
          logStartupInfo({
            event: "dev-reload-auth-reset",
            stage: "supabase-init",
            status: "success",
          });

          if (isMounted) {
            setSession(null);
            setDemoAccessEnabled(false);
            setLoading(false);
          }

          supabase.auth.signOut().catch((signOutError) => {
            console.warn("Dev reload sign-out failed", signOutError.message);
          });

          return;
        }

        const {
          data: { session: existingSession },
          error,
        } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          "Supabase session bootstrap"
        );

        if (error) {
          console.warn("Unable to load existing Supabase session", error.message);
          logStartupWarn({
            event: "supabase-session-warning",
            stage: "supabase-init",
            status: "fallback",
            details: {
              message: error.message,
            },
          });
        }

        if (isMounted) {
          setSession(existingSession ?? null);
          setDemoAccessEnabled(existingSession?.user?.email === DEMO_EMAIL);
          setLoading(false);
        }

        await upsertProfile(existingSession ?? null);

        logStartupInfo({
          event: "auth-bootstrap-complete",
          stage: "app-bootstrap",
          status: "success",
          details: {
            hasSession: Boolean(existingSession),
          },
        });
      } catch (error) {
        console.warn("Auth initialisation failed", error);
        logStartupError({
          event: "auth-bootstrap-failed",
          stage: "app-bootstrap",
          status: "failure",
          details: {
            reason: error instanceof Error ? error.message : "Unknown auth bootstrap failure",
          },
        });

        if (isMounted) {
          setSession(null);
          setDemoAccessEnabled(false);
          setLoading(false);
        }
      }
    }

    initialiseSecureEntry();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (FORCE_LOGIN_ON_DEV_RELOAD && Date.now() < ignoreAuthEventsUntil) {
        setLoading(false);
        return;
      }

      logStartupInfo({
        event: "auth-state-changed",
        stage: "supabase-init",
        status: "success",
        details: {
          hasSession: Boolean(nextSession),
        },
      });

      setSession(nextSession);
      setDemoAccessEnabled(nextSession?.user?.email === DEMO_EMAIL);
      setLoading(false);
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

  const value = {
    session,
    loading,
    demoAccessEnabled,
    enableDemoAccess,
    disableDemoAccess,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
