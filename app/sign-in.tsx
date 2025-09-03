import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { createUserFriendlyError } from '@/lib/errors';

export default function SignInScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setIsLoading(true);
    setAuthMethod(isSignUp ? 'signup' : 'signin');
    
    try {
      console.log('Attempting auth:', { isSignUp, email: email.trim() });
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: displayName.trim(),
            }
          }
        });
        
        console.log('Sign up result:', { data, error });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
          Alert.alert('Success', 'Please check your email to verify your account');
        } else if (data.session) {
          // User was created and signed in immediately
          // AuthContext will handle navigation automatically
          console.log('User created and signed in successfully');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        
        console.log('Sign in result:', { data, error });
        
        if (error) throw error;
        
        if (data.session) {
          // AuthContext will handle navigation automatically
          console.log('User signed in successfully');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthMethod('google');
    try {
      // Import the Google sign-in function
      const { signInWithGoogle } = await import('@/services/supabase');
      await signInWithGoogle();
      
      // AuthContext will handle navigation automatically
      console.log('Google sign-in initiated');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Brand Mark */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>ONEWORD</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            {isSignUp ? 'join the ritual' : 'return to your words'}
          </Text>
          
          <Text style={styles.subtitle}>
            {isSignUp 
              ? 'begin your daily practice of intentional language'
              : 'continue your journey of mindful expression'
            }
          </Text>

          {/* Social Auth */}
          <View style={styles.socialSection}>
            <Pressable
              style={[styles.socialButton, isLoading && authMethod === 'google' && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.socialButtonText}>
                {isLoading && authMethod === 'google' ? 'signing in...' : 'continue with google'}
              </Text>
            </Pressable>

            <View style={styles.dividerContainer}>
              <Text style={styles.dividerText}>or</Text>
            </View>
          </View>

          {/* Email Form */}
          <View style={styles.form}>
            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="display name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            )}
            
            <TextInput
              style={styles.input}
              placeholder="email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Pressable
              style={[styles.primaryButton, isLoading && authMethod !== 'google' && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading && authMethod !== 'google' 
                  ? (isSignUp ? 'creating account...' : 'signing in...') 
                  : (isSignUp ? 'create account' : 'sign in')
                }
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={toggleMode}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {isSignUp ? 'already have an account? sign in' : 'need an account? join us'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Back Button */}
        <View style={styles.footer}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>back</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  keyboardView: {
    flex: 1,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#333',
    textAlign: 'center',
    lineHeight: 39, // 1.4x line height
    marginBottom: 16,
    textTransform: 'lowercase',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22, // 1.4x line height
    marginBottom: 48,
    textTransform: 'lowercase',
  },
  socialSection: {
    marginBottom: 32,
  },
  socialButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  dividerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    textTransform: 'lowercase',
    minHeight: 56,
  },
  primaryButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 56,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
});
