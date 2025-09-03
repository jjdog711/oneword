import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app';
import { supabase } from '@/services/supabase';
import { signInWithGoogle } from '@/services/supabase';
import { createUserFriendlyError } from '@/lib/errors';

export default function LandingScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [authMethod, setAuthMethod] = React.useState<string | null>(null);
  const setGuestMode = useAppStore(s => s.setGuestMode);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthMethod('google');
    try {
      await signInWithGoogle();
      // AuthContext will handle navigation automatically
    } catch (error) {
      console.error('Google sign-in failed:', error);
      const appError = createUserFriendlyError(error);
      // You might want to show an alert here
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const handleEmailSignIn = () => {
    router.push('/sign-in');
  };

  const handleGuestMode = async () => {
    setIsLoading(true);
    setAuthMethod('guest');
    try {
      // Set guest mode in store
      setGuestMode(true);
      // Navigate to global tab
      router.replace('/(tabs)/global');
    } catch (error) {
      console.error('Guest mode failed:', error);
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const handleTermsPress = () => {
    Linking.openURL('https://oneword.app/terms');
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://oneword.app/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Brand Mark */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandText}>ONEWORD</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <Text style={styles.heroText}>
          each word you choose excludes a thousand others.{'\n'}
          and in that absence, you're revealed.
        </Text>
        
        <Text style={styles.subheading}>
          one word a day.{'\n'}
          nothing else.{'\n'}
          who are you today?
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Pressable
          style={[styles.primaryButton, isLoading && authMethod === 'google' && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {isLoading && authMethod === 'google' ? 'signing in...' : 'continue with google'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, isLoading && authMethod === 'email' && styles.buttonDisabled]}
          onPress={handleEmailSignIn}
          disabled={isLoading}
          accessibilityLabel="Sign in with email"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>
            {isLoading && authMethod === 'email' ? 'signing in...' : 'sign in with email'}
          </Text>
        </Pressable>

        <View style={styles.dividerContainer}>
          <Text style={styles.dividerText}>or</Text>
        </View>

        <Pressable
          style={[styles.tertiaryButton, isLoading && authMethod === 'guest' && styles.buttonDisabled]}
          onPress={handleGuestMode}
          disabled={isLoading}
          accessibilityLabel="Continue as guest"
          accessibilityRole="button"
        >
          <Text style={styles.tertiaryButtonText}>
            {isLoading && authMethod === 'guest' ? 'entering...' : 'continue as guest'}
          </Text>
        </Pressable>
      </View>

      {/* Legal Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          by continuing, you agree to our{' '}
          <Text style={styles.linkText} onPress={handleTermsPress}>
            terms of service
          </Text>
          {' '}and{' '}
          <Text style={styles.linkText} onPress={handlePrivacyPress}>
            privacy policy
          </Text>
          .
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  brandContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#333',
    textAlign: 'center',
    lineHeight: 39, // 1.4x line height
    marginBottom: 32,
    textTransform: 'lowercase',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 25, // 1.4x line height
    textTransform: 'lowercase',
  },
  actionsContainer: {
    paddingVertical: 32,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 56, // Accessibility minimum
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 56, // Accessibility minimum
  },
  tertiaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 56, // Accessibility minimum
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '400',
    textTransform: 'lowercase',
    opacity: 0.8,
  },
  dividerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  footerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 17, // 1.4x line height
    textTransform: 'lowercase',
  },
  linkText: {
    color: '#333',
    textDecorationLine: 'underline',
  },
});
