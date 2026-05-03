import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { router } from "expo-router";
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

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.error(getSupabaseConfigError());
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        await supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email,
          updated_at: new Date().toISOString(),
        });
      }

      if (session) {
        router.replace("/");
      } else {
        router.replace("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      if (!isSupabaseConfigured) {
        return getSupabaseConfigError();
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return error.message;
      }

      await writeAuditLog({
        eventType: "LOGIN",
        metadata: {
          email,
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

      const emailRedirectTo = Linking.createURL("account-created", {
        scheme: "nexuspayorchestrator",
      });

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        return error.message;
      }

      await writeAuditLog({
        eventType: "SIGNUP",
        metadata: {
          email,
          emailRedirectTo,
        },
      });

      return null;
    } catch (error) {
      console.error("Sign up failed", error);
      return "Unable to reach Supabase. Check your internet connection and Supabase configuration.";
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading]
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
