import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Mail, 
  Globe,
  ArrowRight,
  User,
} from 'lucide-react-native';
import { signInWithGoogle } from '@/services/supabase';
import { logger } from '@/lib/logger';
import { createUserFriendlyError } from '@/lib/errors';

interface SignInPromptProps {
  title?: string;
  subtitle?: string;
  showGuestOption?: boolean;
  onGuestPress?: () => void;
  compact?: boolean;
}

export default function SignInPrompt({
  title = "Sign In Required",
  subtitle = "Please sign in to access this feature",
  showGuestOption = true,
  onGuestPress,
  compact = false,
}: SignInPromptProps) {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // The OAuth flow will handle the redirect
    } catch (error) {
      logger.error('Google sign in error', { error });
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    }
  };

  const handleEmailSignIn = () => {
    router.push('/');
  };

  const handleCreateAccount = () => {
    router.push('/?signup=true');
  };

  const handleGuestContinue = () => {
    if (onGuestPress) {
      onGuestPress();
    } else {
      Alert.alert(
        'Continue as Guest',
        'Some features will be limited. You can sign in later to access all features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => {
            // Stay on current screen but with limited functionality
          }}
        ]
      );
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTitle}>{title}</Text>
        <Text style={styles.compactSubtitle}>{subtitle}</Text>
        <View style={styles.compactButtons}>
          <Pressable style={styles.compactButton} onPress={handleEmailSignIn}>
            <Text style={styles.compactButtonText}>Sign In</Text>
          </Pressable>
          {showGuestOption && (
            <Pressable style={styles.compactSecondaryButton} onPress={handleGuestContinue}>
              <Text style={styles.compactSecondaryButtonText}>Continue as Guest</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.content}>
        <Pressable style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Globe size={20} color="#fff" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
          <ArrowRight size={20} color="#fff" />
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.emailButton} onPress={handleEmailSignIn}>
          <Mail size={20} color="#007AFF" />
          <Text style={styles.emailButtonText}>Sign In with Email</Text>
        </Pressable>

        <Pressable style={styles.createAccountButton} onPress={handleCreateAccount}>
          <User size={20} color="#007AFF" />
          <Text style={styles.createAccountButtonText}>Create Account</Text>
        </Pressable>

        {showGuestOption && (
          <Pressable style={styles.guestButton} onPress={handleGuestContinue}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e5e9',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    gap: 8,
  },
  emailButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    gap: 8,
  },
  createAccountButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    padding: 16,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#666',
    fontSize: 16,
  },
  // Compact styles
  compactContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  compactSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  compactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  compactButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  compactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  compactSecondaryButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  compactSecondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
