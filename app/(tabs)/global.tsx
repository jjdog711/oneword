import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { useAppStore } from '@/store/app';
import { useAuth } from '@/contexts/AuthContext';
import SignInPrompt from '@/components/SignInPrompt';
import { Plus } from 'lucide-react-native';
import { createUserFriendlyError } from '@/lib/errors';

export default function GlobalScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const publicWords = useAppStore(s => s.publicWords);
  const currentUserPublicWord = useAppStore(s => s.currentUserPublicWord);
  const loadPublicWords = useAppStore(s => s.loadPublicWords);
  const loadCurrentUserPublicWord = useAppStore(s => s.loadCurrentUserPublicWord);
  const addPublicWord = useAppStore(s => s.addPublicWord);
  const deletePublicWord = useAppStore(s => s.deletePublicWord);
  
  const [refreshing, setRefreshing] = useState(false);
  const [myWord, setMyWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topWords, setTopWords] = useState<{ text: string; count: number }[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadGlobalData();
    }
  }, [isAuthenticated]);

  // Update topWords when publicWords changes
  useEffect(() => {
    if (publicWords.length > 0) {
      // Sort by popularity (count) and take top 10
      const sortedWords = [...publicWords]
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 10);
      setTopWords(sortedWords);
    } else {
      setTopWords([]);
    }
  }, [publicWords]);

  const loadGlobalData = async () => {
    try {
      await Promise.all([
        loadPublicWords(),
        loadCurrentUserPublicWord()
      ]);
      
      // Get the updated data from the store after loading
      const updatedPublicWords = useAppStore.getState().publicWords;
      
      // Sort by popularity (count) and take top 10
      const sortedWords = [...updatedPublicWords]
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 10);
      setTopWords(sortedWords);
    } catch (error) {
      console.error('Failed to load global data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGlobalData();
    setRefreshing(false);
  };

  const handleSubmitMyWord = async () => {
    if (!myWord.trim() || isSubmitting) return;
    
    Alert.alert(
      'Confirm Your Word',
      `Are you sure you want to submit "${myWord.trim()}" as your global word for today? You won't be able to change it or add another word today.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Word',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await addPublicWord(myWord.trim());
              setMyWord('');
              await loadGlobalData();
            } catch (error) {
              console.error('Failed to submit word:', error);
              const appError = createUserFriendlyError(error);
              Alert.alert('Cannot Submit Word', appError.userMessage);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteWord = async (wordId: string) => {
    Alert.alert(
      'Delete Your Word',
      'Are you sure you want to delete your global word for today? You will not be able to add a new word to replace it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePublicWord(wordId);
              await loadGlobalData();
            } catch (error) {
              console.error('Failed to delete word:', error);
              const appError = createUserFriendlyError(error);
              Alert.alert('Cannot Delete Word', appError.userMessage);
            }
          }
        }
      ]
    );
  };

  const renderWordItem = ({ item, index }: { item: { text: string; count: number }; index: number }) => (
    <View style={styles.wordRow}>
      <View style={styles.rankContainer}>
        <Text style={styles.rank}>{index + 1}</Text>
      </View>
      <View style={styles.wordContent}>
        <Text style={styles.wordText}>{item.text?.toLowerCase() || ''}</Text>
      </View>
      <View style={styles.statsContainer}>
        <Text style={styles.popularityScore}>{item.count || 0}</Text>
      </View>
    </View>
  );

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="Global Word Feed"
        subtitle="Sign in to see and share words with the world"
        showGuestOption={true}
        compact={false}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* App Identity */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>ONEWORD</Text>
      </View>

      {/* Section Label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>global word feed</Text>
      </View>

      {/* Add Word Section */}
      {!currentUserPublicWord && (
        <View style={styles.addWordSection}>
          <View style={styles.addWordContainer}>
            <TextInput
              style={styles.wordInput}
              value={myWord}
              onChangeText={setMyWord}
              placeholder="share your word with the world"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
              onSubmitEditing={handleSubmitMyWord}
            />
            <Pressable
              style={[styles.addButton, (!myWord.trim() || isSubmitting) && styles.addButtonDisabled]}
              onPress={handleSubmitMyWord}
              disabled={!myWord.trim() || isSubmitting}
            >
              <Plus size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Current User's Word */}
      {currentUserPublicWord && (
        <View style={styles.currentUserSection}>
          <Text style={styles.currentUserLabel}>your word today</Text>
          <View style={styles.currentUserWord}>
            <Text style={styles.currentUserWordText}>{currentUserPublicWord.text?.toLowerCase() || ''}</Text>
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteWord(currentUserPublicWord.id)}
            >
              <Text style={styles.deleteButtonText}>delete</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Words List */}
      <FlatList
        data={topWords}
        renderItem={renderWordItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.contentList}
        contentContainerStyle={styles.contentContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No words yet</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to share a word!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  appHeader: {
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
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    textTransform: 'lowercase',
  },
  addWordSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  addWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
    textTransform: 'lowercase',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  currentUserSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  currentUserLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  currentUserWord: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  currentUserWordText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  contentList: {
    flex: 1,
  },
  contentContent: {
    paddingHorizontal: 20,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 30,
  },
  rank: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
    marginBottom: 2,
  },
  wordContent: {
    flex: 1,
  },
  wordText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  statsContainer: {
    alignItems: 'center',
    marginLeft: 16,
  },
  popularityScore: {
    fontSize: 12,
    fontWeight: '400',
    color: '#007AFF',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
});
