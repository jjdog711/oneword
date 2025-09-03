import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/services/supabase';
import { logger } from '@/lib/logger';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have access_token and refresh_token in the URL
        const accessToken = params.access_token as string;
        const refreshToken = params.refresh_token as string;
        
        if (accessToken && refreshToken) {
          // Set the session manually
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            logger.error('Session set error', { error });
            router.replace('/landing');
            return;
          }
        } else {
          // Try to get the current session
          const { error } = await supabase.auth.getSession();
          
          if (error) {
            logger.error('Auth callback error', { error });
            router.replace('/landing');
            return;
          }
        }

        // Success - AuthContext will handle navigation automatically
        logger.info('Auth callback completed successfully');
      } catch (error) {
        logger.error('Auth callback failed', { error });
        router.replace('/landing');
      }
    };

    handleAuthCallback();
  }, [router, params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#111" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
