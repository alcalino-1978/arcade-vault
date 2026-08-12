"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface SessionUser {
  name: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  loginAsGuest: () => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const login = useCallback((nextUser: SessionUser) => {
    setUser(nextUser);
  }, []);

  const loginAsGuest = useCallback(() => {
    setUser(null);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, login, loginAsGuest, signOut }}>
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
