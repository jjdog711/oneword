import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

interface AuthStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export default function AuthStatus({ showDetails = false, compact = false }: AuthStatusProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (compact) {
    return (
      <View style={[styles.container, styles.compact]}>
        <View style={[styles.statusDot, isAuthenticated ? styles.authenticated : styles.unauthenticated]} />
        <Text style={styles.compactText}>
          {isAuthenticated ? 'Signed In' : 'Not Signed In'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.statusBadge, isAuthenticated ? styles.authenticated : styles.unauthenticated]}>
        <Text style={styles.statusText}>
          {isAuthenticated ? '✓ Signed In' : '⚠ Not Signed In'}
        </Text>
      </View>
      {showDetails && isAuthenticated && userEmail && (
        <Text style={styles.emailText}>{userEmail}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  authenticated: {
    backgroundColor: '#e8f5e8',
  },
  unauthenticated: {
    backgroundColor: '#ffe8e8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  compactText: {
    fontSize: 12,
    color: '#666',
  },
  emailText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});
