import { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('giq_token'));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('giq_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('giq_token', newToken);
    localStorage.setItem('giq_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('giq_token');
    localStorage.removeItem('giq_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
