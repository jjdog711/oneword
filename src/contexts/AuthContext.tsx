import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/store/app';
import { logger } from '@/lib/logger';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const loadCurrentUserProfile = useAppStore(s => s.loadCurrentUserProfile);
  const clearUserData = useAppStore(s => s.clearUserData);
  const setGuestMode = useAppStore(s => s.setGuestMode);

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Session check error', { error });
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      if (session?.user) {
        setIsAuthenticated(true);
        setUser(session.user);
        // Load user profile into store
        await loadCurrentUserProfile();
        setGuestMode(false);
        logger.info('User authenticated', { userId: session.user.id });
      } else {
        setIsAuthenticated(false);
        setUser(null);
        clearUserData();
        logger.info('No authenticated user found');
      }
    } catch (error) {
      logger.error('Auth check failed', { error });
      setIsAuthenticated(false);
      setUser(null);
      clearUserData();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auth state changes
  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('Auth state changed', { event, hasSession: !!session });
        
        if (session?.user) {
          setIsAuthenticated(true);
          setUser(session.user);
          await loadCurrentUserProfile();
          setGuestMode(false);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          clearUserData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inAuthCallback = segments[0] === 'auth';
    const inChat = segments[0] === 'chat';
    const inUserHistory = segments[0] === 'user-history';
    const inSettings = segments[0] === 'settings';
    const inFriends = segments[0] === 'friends';

    if (isAuthenticated && !inAuthGroup && !inAuthCallback && !inChat && !inUserHistory && !inSettings && !inFriends) {
      // User is authenticated but not in any protected route - redirect to global tab
      router.replace('/(tabs)/global');
    } else if (!isAuthenticated && (inAuthGroup || inChat || inUserHistory || inSettings || inFriends)) {
      // User is not authenticated but trying to access protected routes - redirect to landing
      router.replace('/landing');
    }
  }, [isAuthenticated, isLoading, segments]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      clearUserData();
      router.replace('/landing');
    } catch (error) {
      logger.error('Sign out failed', { error });
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
