import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore } from '@/store/app';
import { getPublicWordsByUser } from '@/services/supabase';
import { handleAsyncError } from '@/lib/errors';

interface PublicWord {
  id: string;
  text: string;
  date_local: string;
  created_at: string;
}

export default function UserHistoryScreen() {
  const { userId, username } = useLocalSearchParams<{ userId: string; username: string }>();
  const [publicWords, setPublicWords] = useState<PublicWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('UserHistory params:', { userId, username });

  useEffect(() => {
    loadUserHistory();
  }, [userId, username]);

  const loadUserHistory = async () => {
    console.log('UserHistory loadUserHistory called with:', { userId, username });
    
    if (!userId && !username) {
      setError('No user identifier provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prefer userId over username for more reliable lookup
      const userIdentifier = userId || username!;
      console.log('Using user identifier:', userIdentifier);
      
      const words = await handleAsyncError(
        () => getPublicWordsByUser(userIdentifier),
        'loadUserHistory'
      );
      setPublicWords(words || []);
    } catch (err) {
      setError('Failed to load user history');
      console.error('Error loading user history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'unknown date';
    }
    
    const date = new Date(dateString);
    
    // Check if the date is valid (not NaN and not the Unix epoch)
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      return 'unknown date';
    }
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${day}-${year}`;
  };

  const renderWordItem = ({ item }: { item: PublicWord }) => (
    <View style={styles.wordRow}>
      <Text style={styles.wordText}>{item.text.toLowerCase()}</Text>
      <Text style={styles.dateText}>
        {formatDate(item.date_local || item.created_at)}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>no public words yet.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>ONEWORD</Text>
        </View>
        <View style={styles.userHeader}>
          <Text style={styles.username}>{username?.toLowerCase() || 'user'}</Text>
          <Text style={styles.historyLabel}>user history</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>ONEWORD</Text>
        </View>
        <View style={styles.userHeader}>
          <Text style={styles.username}>{username?.toLowerCase() || 'user'}</Text>
          <Text style={styles.historyLabel}>user history</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>ONEWORD</Text>
      </View>

      {/* User Header */}
      <View style={styles.userHeader}>
        <Text style={styles.username}>{username?.toLowerCase() || 'user'}</Text>
        <Text style={styles.historyLabel}>user history</Text>
      </View>

      {/* Words List */}
      <FlatList
        data={publicWords}
        keyExtractor={(item) => item.id}
        renderItem={renderWordItem}
        style={styles.wordsList}
        contentContainerStyle={styles.wordsContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  userHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  username: {
    fontSize: 18,
    fontWeight: '400',
    color: '#333',
    textTransform: 'lowercase',
    marginBottom: 4,
  },
  historyLabel: {
    fontSize: 14,
    color: '#999',
    textTransform: 'lowercase',
    fontWeight: '300',
  },
  wordsList: {
    flex: 1,
  },
  wordsContent: {
    paddingHorizontal: 20,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  wordText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textTransform: 'lowercase',
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
