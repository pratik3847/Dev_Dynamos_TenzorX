import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  getMe,
  login as apiLogin,
  signup as apiSignup,
  SignupPayload,
  TokenResponse,
  UserResponse,
} from "@/lib/api";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  loading: boolean;
  signUp: (data: SignupPayload) => Promise<TokenResponse>;
  signIn: (email: string, password: string) => Promise<TokenResponse>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "healthcare_token";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    getMe(stored)
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (data: SignupPayload) => {
    const res = await apiSignup(data);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const signIn = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
