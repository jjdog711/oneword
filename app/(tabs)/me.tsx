import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app';
import { useAuth } from '@/contexts/AuthContext';
import SignInPrompt from '@/components/SignInPrompt';
import SettingsDropdown from '@/components/SettingsDropdown';
import { BookText, Settings } from 'lucide-react-native';
import { createUserFriendlyError } from '@/lib/errors';

interface JournalEntry {
  id: string;
  word: string;
  reflections?: string;
  date_local: string;
  created_at: string;
}

export default function MeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Journal state
  const journalEntries = useAppStore(s => s.journalEntries);
  const todaysEntry = useAppStore(s => s.todaysJournalEntry());
  const addJournalEntry = useAppStore(s => s.addJournalEntry);
  const loadJournalEntries = useAppStore(s => s.loadJournalEntries);
  const deleteJournalEntry = useAppStore(s => s.deleteJournalEntry);
  const updateJournalEntry = useAppStore(s => s.updateJournalEntry);
  const loadCurrentUserProfile = useAppStore(s => s.loadCurrentUserProfile);
  const me = useAppStore(s => s.me);
  
  const [todayWord, setTodayWord] = useState('');
  const [reflections, setReflections] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Settings dropdown state
  const [settingsDropdownVisible, setSettingsDropdownVisible] = useState(false);

  // Load user profile when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentUserProfile();
    }
  }, [isAuthenticated, loadCurrentUserProfile]);

  // Load journal entries when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadJournalEntries();
    }
  }, [isAuthenticated, loadJournalEntries]);

  const handleSubmitEntry = async () => {
    if (!todayWord.trim() || isSubmitting) return;
    
    Alert.alert(
      'Confirm Journal Entry',
      `Are you sure you want to add "${todayWord.trim()}" to your journal? You can edit this entry until the end of today.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Entry',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await addJournalEntry(todayWord.trim(), reflections.trim() || undefined);
              setTodayWord('');
              setReflections('');
            } catch (error) {
              console.error('Failed to submit journal entry:', error);
              const appError = createUserFriendlyError(error);
              Alert.alert('Cannot Add Entry', appError.userMessage);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadJournalEntries();
    } catch (error) {
      console.error('Failed to refresh journal entries:', error);
    } finally {
      setRefreshing(false);
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

  const renderJournalEntry = ({ item }: { item: JournalEntry }) => (
    <View style={styles.journalRow}>
      <View style={styles.journalContent}>
        <Text style={styles.journalWord}>{item.word.toLowerCase()}</Text>
        {item.reflections && (
          <Text style={styles.journalReflections}>{item.reflections}</Text>
        )}
      </View>
      <Text style={styles.journalDate}>{formatDate(item.date_local || item.created_at)}</Text>
    </View>
  );

  const renderTodaySection = () => (
    <View style={styles.todaySection}>
      <Text style={styles.sectionTitle}>today's entry</Text>
      {todaysEntry ? (
        <View style={styles.todayEntryCard}>
          <View style={styles.todayEntryHeader}>
            <Text style={styles.todayWord}>{todaysEntry.word.toLowerCase()}</Text>
            <View style={styles.todayEntryActions}>
              <Pressable
                style={styles.editButton}
                onPress={() => {
                  setTodayWord(todaysEntry.word);
                  setReflections(todaysEntry.reflections || '');
                  deleteJournalEntry(todaysEntry.id);
                }}
              >
                <Text style={styles.editButtonText}>edit</Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Journal Entry',
                    'Are you sure you want to delete your journal entry for today? You will not be able to add a new entry to replace it.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteJournalEntry(todaysEntry.id);
                          } catch (error) {
                            console.error('Failed to delete journal entry:', error);
                            const appError = createUserFriendlyError(error);
                            Alert.alert('Cannot Delete Entry', appError.userMessage);
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </Pressable>
            </View>
          </View>
          {todaysEntry.reflections && (
            <Text style={styles.todayReflections}>{todaysEntry.reflections}</Text>
          )}
        </View>
      ) : (
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>add your word for today:</Text>
          <TextInput
            style={styles.wordInput}
            value={todayWord}
            onChangeText={setTodayWord}
            placeholder="type your word"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
            editable={!isSubmitting}
          />
          <Text style={styles.inputLabel}>reflections (optional):</Text>
          <TextInput
            style={styles.reflectionsInput}
            value={reflections}
            onChangeText={setReflections}
            placeholder="any thoughts or reflections..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            maxLength={200}
            editable={!isSubmitting}
          />
          <Pressable
            style={[styles.submitButton, (!todayWord.trim() || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmitEntry}
            disabled={!todayWord.trim() || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'adding...' : 'add entry'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderJournalHistory = () => (
    <View style={styles.historySection}>
      <Text style={styles.sectionTitle}>journal history</Text>
      <FlatList
        data={journalEntries.filter(entry => entry.id !== todaysEntry?.id) as any}
        keyExtractor={(item) => item.id}
        renderItem={renderJournalEntry}
        style={styles.journalList}
        contentContainerStyle={styles.journalContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BookText size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>no journal entries yet</Text>
            <Text style={styles.emptyStateSubtext}>start writing to see your history!</Text>
          </View>
        }
      />
    </View>
  );

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>loading...</Text>
      </View>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="Journal"
        subtitle="Sign in to view your journal"
        showGuestOption={false}
        compact={false}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* App Identity */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>ONEWORD</Text>
        <Pressable 
          style={styles.settingsButton} 
          onPress={() => setSettingsDropdownVisible(true)}
        >
          <Settings size={24} color="#333" />
        </Pressable>
      </View>

      {/* Journal Content */}
      <View style={styles.journalContainer}>
        {renderTodaySection()}
        {renderJournalHistory()}
      </View>

      {/* Settings Dropdown */}
      <SettingsDropdown
        visible={settingsDropdownVisible}
        onClose={() => setSettingsDropdownVisible(false)}
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
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  settingsButton: {
    padding: 8,
  },
  journalContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  todaySection: {
    marginBottom: 24,
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    textTransform: 'lowercase',
    marginBottom: 12,
  },
  todayEntryCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  todayEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  todayWord: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'lowercase',
    flex: 1,
  },
  todayReflections: {
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
    lineHeight: 20,
  },
  todayEntryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'lowercase',
  },
  wordInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textTransform: 'lowercase',
    color: '#333',
  },
  reflectionsInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textTransform: 'lowercase',
    color: '#333',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  journalList: {
    flex: 1,
  },
  journalContent: {
    paddingBottom: 20,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  journalRowContent: {
    flex: 1,
  },
  journalWord: {
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
    marginBottom: 4,
  },
  journalReflections: {
    fontSize: 12,
    color: '#666',
    textTransform: 'lowercase',
    lineHeight: 16,
  },
  journalDate: {
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
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
    textTransform: 'lowercase',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textTransform: 'lowercase',
  },
});
