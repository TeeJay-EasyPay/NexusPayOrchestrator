import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
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

const FORCE_LOGIN_ON_DEV_RELOAD = process.env.EXPO_PUBLIC_FORCE_LOGIN_ON_DEV_RELOAD === "true";
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

export type StartupAuthPhase = "bootstrapping" | "unauthenticated" | "authenticated" | "locked";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  startupPhase: StartupAuthPhase;
  resetInProgress: boolean;
  sessionValidated: boolean;
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

async function clearStaleRestoredSession(reason: string) {
  try {
    await withTimeout(
      supabase.auth.signOut({ scope: "local" }),
      AUTH_BOOTSTRAP_TIMEOUT_MS,
      "Stale Supabase session cleanup"
    );

    logStartupInfo({
      event: "supabase-stale-session-cleared",
      stage: "supabase-init",
      status: "success",
      details: {
        reason,
      },
    });
  } catch (signOutError) {
    logStartupWarn({
      event: "supabase-stale-session-clear-warning",
      stage: "supabase-init",
      status: "fallback",
      details: {
        reason,
        cleanupError:
          signOutError instanceof Error ? signOutError.message : "Unknown stale session cleanup issue",
      },
    });
  }
}

async function validateRestoredSession(existingSession: Session | null): Promise<Session | null> {
  if (!existingSession) {
    return null;
  }

  logStartupInfo({
    event: "supabase-user-validation-start",
    stage: "supabase-init",
    status: "start",
    details: {
      restoredSessionPresent: true,
    },
  });

  try {
    const {
      data: { user },
      error,
    } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_BOOTSTRAP_TIMEOUT_MS,
      "Supabase user bootstrap validation"
    );

    if (error || !user?.id) {
      const reason = error?.message ?? "No authenticated Supabase user returned";

      logStartupWarn({
        event: "supabase-user-validation-failed",
        stage: "supabase-init",
        status: "fallback",
        details: {
          reason,
          restoredSessionPresent: true,
          userValidated: false,
        },
      });

      await clearStaleRestoredSession(reason);
      return null;
    }

    if (existingSession.user?.id && user.id !== existingSession.user.id) {
      const reason = "Restored Supabase session user does not match validated user";

      logStartupWarn({
        event: "supabase-user-validation-mismatch",
        stage: "supabase-init",
        status: "fallback",
        details: {
          reason,
          restoredSessionPresent: true,
          userValidated: false,
        },
      });

      await clearStaleRestoredSession(reason);
      return null;
    }

    logStartupInfo({
      event: "supabase-user-validation-success",
      stage: "supabase-init",
      status: "success",
      details: {
        restoredSessionPresent: true,
        userValidated: true,
      },
    });

    return existingSession;
  } catch (validationError) {
    const reason =
      validationError instanceof Error
        ? validationError.message
        : "Unknown Supabase user validation failure";

    logStartupWarn({
      event: "supabase-user-validation-failed",
      stage: "supabase-init",
      status: "fallback",
      details: {
        reason,
        restoredSessionPresent: true,
        userValidated: false,
      },
    });

    await clearStaleRestoredSession(reason);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupPhase, setStartupPhase] = useState<StartupAuthPhase>("bootstrapping");
  const [resetInProgress, setResetInProgress] = useState(false);
  const [sessionValidated, setSessionValidated] = useState(false);
  const [demoAccessEnabled, setDemoAccessEnabled] = useState(false);
  const resetInProgressRef = useRef(false);
  const sessionValidatedRef = useRef(false);
  const staleSessionGuardUntilRef = useRef(0);
  const authBootstrapInProgressRef = useRef(true);

  function updateResetInProgress(next: boolean) {
    resetInProgressRef.current = next;
    setResetInProgress(next);
  }

  useEffect(() => {
    sessionValidatedRef.current = sessionValidated;
  }, [sessionValidated]);

  useEffect(() => {
    let isMounted = true;

    async function initialiseSecureEntry() {
      authBootstrapInProgressRef.current = true;

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
            setSessionValidated(true);
            setStartupPhase("unauthenticated");
            setLoading(false);
          }

          return;
        }

        if (FORCE_LOGIN_ON_DEV_RELOAD) {
          updateResetInProgress(true);

          logStartupInfo({
            event: "dev-reload-auth-reset",
            stage: "supabase-init",
            status: "success",
            details: {
              resetInProgress: true,
            },
          });

          try {
            await withTimeout(
              supabase.auth.signOut(),
              AUTH_BOOTSTRAP_TIMEOUT_MS,
              "Dev auth reset sign-out"
            );
          } catch (signOutError) {
            console.warn(
              "Dev reload sign-out failed",
              signOutError instanceof Error ? signOutError.message : signOutError
            );
            logStartupWarn({
              event: "dev-reload-auth-reset-warning",
              stage: "supabase-init",
              status: "fallback",
              details: {
                reason: signOutError instanceof Error ? signOutError.message : "Unknown sign-out issue",
              },
            });
          }

          staleSessionGuardUntilRef.current = Date.now() + 1200;

          if (isMounted) {
            setSession(null);
            setDemoAccessEnabled(false);
            setSessionValidated(true);
            setStartupPhase("unauthenticated");
            setLoading(false);
          }

          updateResetInProgress(false);

          logStartupInfo({
            event: "auth-bootstrap-complete",
            stage: "app-bootstrap",
            status: "success",
            details: {
              resetInProgress: false,
              sessionValidated: true,
              finalAuthPhase: "unauthenticated",
            },
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
          const validatedSession = await validateRestoredSession(existingSession ?? null);
          const finalAuthPhase: StartupAuthPhase = validatedSession
            ? "authenticated"
            : "unauthenticated";

          setSession(validatedSession);
          setDemoAccessEnabled(validatedSession?.user?.email === DEMO_EMAIL);
          setSessionValidated(true);
          setStartupPhase(finalAuthPhase);
          setLoading(false);

          await upsertProfile(validatedSession);

          logStartupInfo({
            event: "auth-bootstrap-complete",
            stage: "app-bootstrap",
            status: "success",
            details: {
              restoredSessionPresent: Boolean(existingSession),
              hasSession: Boolean(validatedSession),
              sessionValidated: true,
              userValidated: Boolean(validatedSession),
              finalAuthPhase,
            },
          });
        }
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
          setSessionValidated(true);
          setStartupPhase("unauthenticated");
          setLoading(false);
        }

        updateResetInProgress(false);
      } finally {
        authBootstrapInProgressRef.current = false;
      }
    }

    initialiseSecureEntry();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (authBootstrapInProgressRef.current) {
        logStartupInfo({
          event: "auth-state-suppressed-during-bootstrap",
          stage: "supabase-init",
          status: "start",
          details: {
            hasSession: Boolean(nextSession),
            sessionValidated: sessionValidatedRef.current,
          },
        });

        return;
      }

      if (resetInProgressRef.current && nextSession) {
        logStartupWarn({
          event: "auth-state-suppressed-during-reset",
          stage: "supabase-init",
          status: "fallback",
          details: {
            resetInProgress: true,
            hasSession: true,
            sessionValidated: sessionValidatedRef.current,
          },
        });

        return;
      }

      if (Date.now() < staleSessionGuardUntilRef.current && nextSession) {
        logStartupWarn({
          event: "auth-state-suppressed-stale-session",
          stage: "supabase-init",
          status: "fallback",
          details: {
            resetInProgress: resetInProgressRef.current,
            hasSession: true,
            sessionValidated: sessionValidatedRef.current,
          },
        });

        return;
      }

      const nextPhase: StartupAuthPhase = nextSession ? "authenticated" : "unauthenticated";

      logStartupInfo({
        event: "auth-state-changed",
        stage: "supabase-init",
        status: "success",
        details: {
          hasSession: Boolean(nextSession),
          resetInProgress: resetInProgressRef.current,
          sessionValidated: true,
          finalAuthPhase: nextPhase,
        },
      });

      setSession(nextSession);
      setDemoAccessEnabled(nextSession?.user?.email === DEMO_EMAIL);
      setSessionValidated(true);
      setStartupPhase(nextPhase);
      setLoading(false);

      if (nextSession) {
        await upsertProfile(nextSession);
      }
    });

    return () => {
      isMounted = false;
      resetInProgressRef.current = false;
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
      setSessionValidated(true);
      setStartupPhase("authenticated");
      setLoading(false);

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
        setSessionValidated(true);
        setStartupPhase("authenticated");
        setLoading(false);
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
    updateResetInProgress(false);
    staleSessionGuardUntilRef.current = 0;
    setDemoAccessEnabled(false);
    setSession(null);
    setSessionValidated(true);
    setStartupPhase("unauthenticated");
    setLoading(false);
    await supabase.auth.signOut();
  }

  const value = {
    session,
    loading,
    startupPhase,
    resetInProgress,
    sessionValidated,
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
