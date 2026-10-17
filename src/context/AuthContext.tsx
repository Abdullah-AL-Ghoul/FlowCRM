import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, AuthSession, SignUpResult } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, workspaceName: string) => Promise<SignUpResult>;
  enterDemoMode: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    authService.getInitialSession().then(initSession => {
      if (isMounted) {
        setSession(initSession);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const newSession = await authService.signIn(email, password);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, workspaceName: string): Promise<SignUpResult> => {
    setLoading(true);
    try {
      const result = await authService.signUp(email, password, fullName, workspaceName);
      if (result.session) {
        setSession(result.session);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const enterDemoMode = async () => {
    setLoading(true);
    try {
      const newSession = await authService.enterDemoMode();
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const updatePassword = async (password: string) => {
    await authService.updatePassword(password);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isSupabaseConfigured,
        signIn,
        signUp,
        enterDemoMode,
        resetPassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
