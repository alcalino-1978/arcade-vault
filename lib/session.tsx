"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface SessionUser {
  name: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  loginAsGuest: () => void;
  signOut: () => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function userFromSession(session: Session | null): SessionUser | null {
  if (!session) return null;
  const displayName = session.user.user_metadata?.display_name as
    | string
    | undefined;
  return { name: displayName ?? session.user.email ?? "" };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const loginAsGuest = useCallback(() => {
    // Invitado: sin sesión de Supabase, estado equivalente a "sin usuario".
  }, []);

  const signOut = useCallback(async () => {
    if (session) {
      await supabase.auth.signOut();
    }
  }, [session, supabase]);

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
    ): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase],
  );

  const user = userFromSession(session);

  return (
    <SessionContext.Provider
      value={{ user, loginAsGuest, signOut, signUpWithPassword, signInWithPassword }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de un SessionProvider");
  }
  return ctx;
}
