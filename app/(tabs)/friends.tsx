import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app';
import { useAuth } from '@/contexts/AuthContext';
import SignInPrompt from '@/components/SignInPrompt';
import GuestBanner from '@/components/GuestBanner';
import { createUserFriendlyError } from '@/lib/errors';
import { getConversations, ConversationPreview } from '@/services/dm';
import { getFriends as getFriendsFromSupabase, getFriendRequests as getFriendRequestsFromSupabase, getSentFriendRequests as getSentFriendRequestsFromSupabase, searchUsers as searchUsersFromSupabase } from '@/services/supabase';
import { logger } from '@/lib/logger';
import { MessageCircle, Users, UserPlus, UserCheck, UserX, Clock } from 'lucide-react-native';
import { WordRowData } from '@/types';

export default function FriendsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const me = useAppStore(s => s.me);
  const friendsPublicWords = useAppStore(s => s.friendsPublicWords);
  const currentUserPublicWord = useAppStore(s => s.currentUserPublicWord);
  const loadFriendsPublicWords = useAppStore(s => s.loadFriendsPublicWords);
  const loadCurrentUserPublicWord = useAppStore(s => s.loadCurrentUserPublicWord);
  const loadCurrentUserProfile = useAppStore(s => s.loadCurrentUserProfile);
  const addPublicWord = useAppStore(s => s.addPublicWord);
  const deletePublicWord = useAppStore(s => s.deletePublicWord);
  const isGuestMode = useAppStore(s => s.isGuestMode);
  const setGuestMode = useAppStore(s => s.setGuestMode);
  const acceptFriendRequest = useAppStore(s => s.acceptFriendRequest);
  const declineFriendRequest = useAppStore(s => s.declineFriendRequest);
  const removeFriend = useAppStore(s => s.removeFriend);
  const sendFriendRequest = useAppStore(s => s.sendFriendRequest);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'words' | 'messages' | 'friends'>('words');
  
  // Words state
  const [refreshing, setRefreshing] = useState(false);
  const [myWord, setMyWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wordRows, setWordRows] = useState<WordRowData[]>([]);
  
  // Messages state
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesRefreshing, setMessagesRefreshing] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsRefreshing, setFriendsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const loadWordsData = useCallback(async () => {
    try {
      await Promise.all([
        loadFriendsPublicWords(),
        loadCurrentUserPublicWord()
      ]);
    } catch (error) {
      console.error('Failed to load words data:', error);
      logger.error('Failed to load words data', { error });
      // Don't show alert here as it might be called frequently
    }
  }, [loadFriendsPublicWords, loadCurrentUserPublicWord]);

  const loadMessagesData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setMessagesLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      logger.error('Failed to load conversations', { error });
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    } finally {
      setMessagesLoading(false);
    }
  }, [isAuthenticated]);

  const loadFriendsData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setFriendsLoading(true);
      const [friendsData, requestsData, sentRequestsData] = await Promise.all([
        getFriendsFromSupabase(),
        getFriendRequestsFromSupabase(),
        getSentFriendRequestsFromSupabase()
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
      setSentFriendRequests(sentRequestsData);
    } catch (error) {
      logger.error('Failed to load friends data', { error });
    } finally {
      setFriendsLoading(false);
    }
  }, [isAuthenticated]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || !isAuthenticated) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      const results = await searchUsersFromSupabase(query);
      setSearchResults(results);
    } catch (error) {
      logger.error('Failed to search users', { error });
    } finally {
      setSearching(false);
    }
  }, [isAuthenticated]);

  // Load user profile when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentUserProfile();
      setGuestMode(false);
    }
  }, [isAuthenticated, loadCurrentUserProfile, setGuestMode]);

  // Load data when authenticated and tab changes
  useEffect(() => {
    if (isAuthenticated) {
      switch (activeTab) {
        case 'words':
          loadWordsData();
          break;
        case 'messages':
          loadMessagesData();
          break;
        case 'friends':
          loadFriendsData();
          break;
      }
    }
  }, [isAuthenticated, activeTab, loadWordsData, loadMessagesData, loadFriendsData]);

  // Search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  // Reload word rows when profile is loaded
  useEffect(() => {
    if (me.id) {
      console.log('Profile loaded, updating word rows with username:', me.name);
    }
  }, [me.id, me.name]);

  // Process data into unified word rows
  useEffect(() => {
    if (activeTab !== 'words') return; // Only process word rows when showing words
    
    const processWordRows = (): WordRowData[] => {
      console.log('Processing word rows:', {
        currentUserPublicWord,
        friendsPublicWords: friendsPublicWords.length,
        friendsData: friendsPublicWords
      });
      
      const rows: WordRowData[] = [];
      
      // Add current user first
      console.log('Current user debug:', { me });
      
      const currentUsername = me.username || me.name;
      
      if (currentUserPublicWord && currentUserPublicWord.text) {
        rows.push({
          id: 'current-user',
          username: currentUsername,
          isCurrentUser: true,
          hasWordToday: true,
          word: currentUserPublicWord.text,
                      time: currentUserPublicWord.createdAt ? formatTime(typeof currentUserPublicWord.createdAt === 'number' ? new Date(currentUserPublicWord.createdAt).toISOString() : currentUserPublicWord.createdAt.toString()) : '',
          wordId: currentUserPublicWord.id,
          userId: me.id,
        });
      } else {
        // Current user hasn't posted - add input row
        rows.push({
          id: 'current-user-input',
          username: currentUsername,
          isCurrentUser: true,
          hasWordToday: false,
          isInputRow: true,
          userId: me.id,
        });
      }

      // Add friends' words
      friendsPublicWords.forEach((friendWord, index) => {
        console.log('Processing friend word:', friendWord);
        if (friendWord.friend_id !== me.id && friendWord.text) { // Don't duplicate current user
          rows.push({
            id: `friend-${friendWord.friend_id || index}`,
            username: friendWord.friend_name || 'Unknown',
            isCurrentUser: false,
            hasWordToday: friendWord.isToday,
            word: friendWord.text,
            time: friendWord.isToday && friendWord.created_at ? formatTime(friendWord.created_at) : undefined,
            lastWord: !friendWord.isToday ? friendWord.text : undefined,
            lastDate: !friendWord.isToday && friendWord.created_at ? formatDate(friendWord.created_at) : undefined,
            userId: friendWord.sender_id,
          });
        }
      });

      console.log('Final processed rows:', rows);
      return rows;
    };

    setWordRows(processWordRows());
  }, [currentUserPublicWord, friendsPublicWords, me, activeTab]);

  const onRefresh = async () => {
    switch (activeTab) {
      case 'words':
        setRefreshing(true);
        await loadWordsData();
        setRefreshing(false);
        break;
      case 'messages':
        setMessagesRefreshing(true);
        await loadMessagesData();
        setMessagesRefreshing(false);
        break;
      case 'friends':
        setFriendsRefreshing(true);
        await loadFriendsData();
        setFriendsRefreshing(false);
        break;
    }
  };

  const handleSubmitMyWord = async () => {
    if (!myWord.trim() || isSubmitting) return;
    
    Alert.alert(
      'Confirm Your Word',
      `Are you sure you want to submit "${myWord.trim()}" as your word for today? You won't be able to change it or add another word today.`,
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
              await loadWordsData();
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
      'Are you sure you want to delete your word for today? You will not be able to add a new word to replace it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePublicWord(wordId);
              await loadWordsData();
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

  const formatTime = (dateString: string): string => {
    try {
      if (!dateString) {
        return '';
      }
      
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string for formatTime:', dateString);
        return '';
      }
      
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error, 'dateString:', dateString);
      return '';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) {
        return '';
      }
      
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return '';
      }
      
      // Use a more reliable timezone conversion
      const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
      const easternOffset = -5; // EST is UTC-5
      const easternDate = new Date(utcDate.getTime() + (easternOffset * 3600000));
      
      const month = (easternDate.getMonth() + 1).toString().padStart(2, '0');
      const day = easternDate.getDate().toString().padStart(2, '0');
      const year = easternDate.getFullYear().toString().slice(-2);
      return `${month}-${day}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'dateString:', dateString);
      return '';
    }
  };

  const formatHeaderDate = (): string => {
    const date = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${dayName} ${month}/${day}/${year}`;
  };

  const renderWordRow = ({ item }: { item: WordRowData }) => {
    if (item.isInputRow) {
      return (
        <View style={styles.wordRow}>
          <Text style={[styles.username, styles.currentUserText]}>
            {item.username?.toLowerCase() || 'unknown'}
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.wordInput}
              value={myWord}
              onChangeText={setMyWord}
              placeholder="type your word"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
              onSubmitEditing={handleSubmitMyWord}
            />
          </View>
          <Pressable
            style={[styles.submitButton, (!myWord.trim() || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmitMyWord}
            disabled={!myWord.trim() || isSubmitting}
          >
            <Text style={styles.submitButtonText}>send</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        style={styles.wordRow}
        onLongPress={() => {
          if (item.isCurrentUser && item.hasWordToday && item.wordId) {
            handleDeleteWord(item.wordId);
          }
        }}
        onPress={() => {
          console.log('Navigation debug:', {
            itemId: item.id,
            itemUserId: item.userId,
            username: item.username,
            isCurrentUser: item.isCurrentUser
          });
          
          if (item.userId) {
            router.push({
              pathname: '/user-history',
              params: {
                userId: item.userId,
                username: item.username
              }
            });
          }
        }}
      >
        <Text style={[
          styles.username,
          item.isCurrentUser && styles.currentUserText
        ]}>
          {item.username?.toLowerCase() || 'unknown'}
        </Text>
        
        {item.hasWordToday ? (
          <>
            <Text style={[
              styles.word,
              item.isCurrentUser && styles.currentUserText
            ]}>
              {item.word?.toLowerCase() || ''}
            </Text>
            <Text style={[
              styles.time,
              item.isCurrentUser && styles.currentUserText
            ]}>
              {item.time}
            </Text>
          </>
        ) : (
          <>
            <Text style={[
              styles.noWord,
              item.isCurrentUser && styles.currentUserText
            ]}>
              no word yet
            </Text>
            <Text style={[
              styles.lastWord,
              item.isCurrentUser && styles.currentUserText
            ]}>
              {item.lastWord ? `${item.lastWord?.toLowerCase() || ''} ${item.lastDate || ''}` : '--'}
            </Text>
          </>
        )}
      </Pressable>
    );
  };

  const renderMessageRow = ({ item }: { item: ConversationPreview }) => (
    <Pressable
      style={styles.messageRow}
      onPress={() => {
        router.push({
          pathname: '/chat/[conversationId]',
          params: { conversationId: item.id }
        });
      }}
    >
      <View style={styles.messageContent}>
        <Text style={styles.messageUsername}>{item.friend_name}</Text>
        <Text style={styles.messagePreview}>
          {item.last_message ? item.last_message.content : 'No messages yet'}
        </Text>
      </View>
      <View style={styles.messageMeta}>
        <Text style={styles.messageTime}>
          {item.last_message ? formatTime(item.last_message.created_at) : ''}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderFriendRow = ({ item }: { item: any }) => (
    <View style={styles.friendRow}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name || item.username}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>
      <Pressable
        style={styles.removeFriendButton}
        onPress={() => {
          Alert.alert(
            'Remove Friend',
            `Are you sure you want to remove ${item.name || item.username}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await removeFriend(item.id);
                    await loadFriendsData();
                  } catch (error) {
                    console.error('Failed to remove friend:', error);
                    const appError = createUserFriendlyError(error);
                    Alert.alert('Error', appError.userMessage);
                  }
                }
              }
            ]
          );
        }}
      >
        <UserX size={16} color="#FF3B30" />
      </Pressable>
    </View>
  );

  const renderFriendRequestRow = ({ item }: { item: any }) => (
    <View style={styles.friendRequestRow}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {item.requester_profile?.name || item.requester_profile?.username || 'Unknown User'}
        </Text>
        <Text style={styles.friendUsername}>
          @{item.requester_profile?.username || 'unknown'}
        </Text>
        <Text style={styles.requestTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={styles.acceptButton}
          onPress={async () => {
            try {
              await acceptFriendRequest(item.id);
              await loadFriendsData();
            } catch (error) {
              console.error('Failed to accept friend request:', error);
              const appError = createUserFriendlyError(error);
              Alert.alert('Error', appError.userMessage);
            }
          }}
        >
          <UserCheck size={16} color="#fff" />
        </Pressable>
        <Pressable
          style={styles.declineButton}
          onPress={async () => {
            try {
              await declineFriendRequest(item.id);
              await loadFriendsData();
            } catch (error) {
              console.error('Failed to decline friend request:', error);
              const appError = createUserFriendlyError(error);
              Alert.alert('Error', appError.userMessage);
            }
          }}
        >
          <UserX size={16} color="#FF3B30" />
        </Pressable>
      </View>
    </View>
  );

  const renderSentFriendRequestRow = ({ item }: { item: any }) => (
    <View style={styles.friendRequestRow}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {item.addressee_profile?.name || item.addressee_profile?.username || 'Unknown User'}
        </Text>
        <Text style={styles.friendUsername}>
          @{item.addressee_profile?.username || 'unknown'}
        </Text>
        <Text style={styles.requestTime}>
          sent {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <View style={styles.pendingIndicator}>
          <Clock size={16} color="#999" />
        </View>
      </View>
    </View>
  );

  const renderSearchResultRow = ({ item }: { item: any }) => (
    <View style={styles.searchResultRow}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name || item.username}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>
      <Pressable
        style={styles.addFriendButton}
        onPress={async () => {
          try {
            await sendFriendRequest(item.id);
            Alert.alert('Success', 'Friend request sent!');
            setSearchQuery('');
            setSearchResults([]);
          } catch (error) {
            console.error('Failed to send friend request:', error);
            const appError = createUserFriendlyError(error);
            Alert.alert('Error', appError.userMessage);
          }
        }}
      >
        <UserPlus size={16} color="#fff" />
      </Pressable>
    </View>
  );

  const renderWordsContent = () => (
    <>
      {/* Date - only show for words */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatHeaderDate()}</Text>
      </View>

      {/* Words List */}
      <FlatList
        data={wordRows}
        keyExtractor={(item) => item.id}
        renderItem={renderWordRow}
        style={styles.contentList}
        contentContainerStyle={styles.contentContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Users size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No friends yet</Text>
            <Text style={styles.emptyStateSubtext}>Add friends to see their words!</Text>
          </View>
        }
      />
    </>
  );

  const renderMessagesContent = () => (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderMessageRow}
      style={styles.contentList}
      contentContainerStyle={styles.contentContent}
      refreshControl={
        <RefreshControl 
          refreshing={messagesRefreshing} 
          onRefresh={onRefresh} 
        />
      }
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <MessageCircle size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No conversations yet</Text>
          <Text style={styles.emptyStateSubtext}>Start a conversation with a friend!</Text>
        </View>
      }
    />
  );

  const renderFriendsContent = () => (
    <>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="search users by username..."
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Search Results */}
      {searchQuery.trim() && (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>search results</Text>
          {searching ? (
            <ActivityIndicator size="small" color="#333" style={styles.searchLoading} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResultRow}
              style={styles.searchList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>no users found</Text>
              }
            />
          )}
        </View>
      )}

      {/* Friend Requests */}
      {(friendRequests.length > 0 || sentFriendRequests.length > 0) && (
        <View style={styles.requestsSection}>
          {/* Received Friend Requests */}
          {friendRequests.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>friend requests</Text>
                {friendRequests.length > 1 && (
                  <Pressable
                    style={styles.acceptAllButton}
                    onPress={async () => {
                      Alert.alert(
                        'Accept All Requests',
                        `Accept all ${friendRequests.length} friend requests?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Accept All',
                            style: 'default',
                            onPress: async () => {
                              try {
                                for (const request of friendRequests) {
                                  await acceptFriendRequest(request.id);
                                }
                                await loadFriendsData();
                                Alert.alert('Success', 'All friend requests accepted!');
                              } catch (error) {
                                console.error('Failed to accept all requests:', error);
                                const appError = createUserFriendlyError(error);
                                Alert.alert('Error', appError.userMessage);
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.acceptAllText}>accept all</Text>
                  </Pressable>
                )}
              </View>
              <FlatList
                data={friendRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderFriendRequestRow}
                style={styles.requestsList}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          {/* Sent Friend Requests */}
          {sentFriendRequests.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>sent requests</Text>
              </View>
              <FlatList
                data={sentFriendRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderSentFriendRequestRow}
                style={styles.requestsList}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      )}

      {/* Friends List */}
      <View style={styles.friendsSection}>
        <Text style={styles.sectionTitle}>friends</Text>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriendRow}
          style={styles.friendsList}
          contentContainerStyle={styles.contentContent}
          refreshControl={
            <RefreshControl 
              refreshing={friendsRefreshing} 
              onRefresh={onRefresh} 
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No friends yet</Text>
              <Text style={styles.emptyStateSubtext}>Search for users to add as friends!</Text>
            </View>
          }
        />
      </View>
    </>
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
        title="Welcome to OneWord"
        subtitle="Sign in to start sharing words with friends"
        showGuestOption={true}
        compact={false}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Guest Banner */}
      {isGuestMode && (
        <GuestBanner onSignIn={() => router.push('/landing')} />
      )}

      {/* App Identity */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>ONEWORD</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'words' && styles.activeTab]}
          onPress={() => setActiveTab('words')}
        >
          <Users size={16} color={activeTab === 'words' ? '#333' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'words' && styles.activeTabText]}>
            Words
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <MessageCircle size={16} color={activeTab === 'messages' ? '#333' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <UserPlus size={16} color={activeTab === 'friends' ? '#333' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'words' && renderWordsContent()}
        {activeTab === 'messages' && renderMessagesContent()}
        {activeTab === 'friends' && renderFriendsContent()}
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    textTransform: 'lowercase',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  dateHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
    textTransform: 'lowercase',
    fontWeight: '300',
  },
  contentList: {
    flex: 1,
  },
  contentContent: {
    paddingHorizontal: 20,
  },
  // Word row styles
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  username: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  currentUserText: {
    fontWeight: '500',
  },
  word: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  time: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  noWord: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  lastWord: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  wordInput: {
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
  submitButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  // Message row styles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageContent: {
    flex: 1,
  },
  messageUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  messageMeta: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Friends styles
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textTransform: 'lowercase',
    color: '#333',
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchLoading: {
    paddingVertical: 20,
  },
  searchList: {
    maxHeight: 200,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    textTransform: 'lowercase',
  },
  requestsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  requestsList: {
    maxHeight: 200,
  },
  friendsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  friendsList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    textTransform: 'lowercase',
    marginBottom: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#34C759',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  addFriendButton: {
    backgroundColor: '#333',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFriendButton: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  // Empty state styles
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptAllButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  acceptAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textTransform: 'lowercase',
  },
  pendingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
