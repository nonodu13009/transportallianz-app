"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { isAdmin } from "./admin";
import { logLogin, logLogout, heartbeat } from "./logger";
import { useRouter } from "next/navigation";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  admin: boolean;
  sessionId: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  admin: false,
  sessionId: null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAdmin(isAdmin(u?.email));
      setLoading(false);

      if (u && !sessionId) {
        try {
          const sid = await logLogin(u.email || "unknown", u.uid);
          setSessionId(sid);
        } catch (e) {
          console.error("Log login failed:", e);
        }
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat every 60s
  useEffect(() => {
    if (sessionId) {
      heartbeatRef.current = setInterval(() => heartbeat(sessionId), 60_000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sessionId]);

  const logout = async () => {
    if (sessionId && user) {
      await logLogout(sessionId, user.email || "unknown", user.uid);
    }
    setSessionId(null);
    await signOut(auth);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, admin, sessionId, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
