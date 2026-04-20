import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseConfigError } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  authError: string | null;
  debugLog: string[];
  isReady: boolean;
  session: Session | null;
  user: User | null;
};

const SessionContext = createContext<SessionContextValue>({
  authError: null,
  debugLog: [],
  isReady: false,
  session: null,
  user: null,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(getSupabaseConfigError());

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function bootstrap() {
      const {
        data: { session: initialSession },
        error: sessionError,
      } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setAuthError(sessionError.message);
        setIsReady(true);
        return;
      }

      setSession(initialSession);
      setAuthError(null);
      setIsReady(true);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        authError,
        debugLog: [
          `isReady=${String(isReady)}`,
          `hasSession=${String(Boolean(session))}`,
          `hasUser=${String(Boolean(session?.user))}`,
          `authError=${authError ?? '(none)'}`,
        ],
        isReady,
        session,
        user: session?.user ?? null,
      }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
