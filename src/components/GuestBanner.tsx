import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

interface GuestBannerProps {
  onSignIn?: () => void;
}

export default function GuestBanner({ onSignIn }: GuestBannerProps) {
  const router = useRouter();

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      router.push('/landing');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        you're in guest mode — sign in to save your words.
      </Text>
      <Pressable
        style={styles.signInButton}
        onPress={handleSignIn}
        accessibilityLabel="Sign in to save your words"
        accessibilityRole="button"
      >
        <Text style={styles.signInText}>sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  signInText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
});
