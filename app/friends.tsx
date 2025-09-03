import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app';
import { supabase } from '@/services/supabase';
import { ArrowLeft, UserPlus, Search, Users, Check, X } from 'lucide-react-native';
import { createUserFriendlyError } from '@/lib/errors';

export default function FriendsScreen() {
  const router = useRouter();
  const friends = useAppStore(s => s.friends);
  const friendRequests = useAppStore(s => s.friendRequests);
  const getFriendRequests = useAppStore(s => s.getFriendRequests);
  const acceptFriendRequest = useAppStore(s => s.acceptFriendRequest);
  const declineFriendRequest = useAppStore(s => s.declineFriendRequest);
  const addFriendById = useAppStore(s => s.addFriendById);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{id: string; display_name: string; username: string}>>([]);
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await getFriendRequests();
      await loadSuggestions();
    } catch (error) {
      console.error('Failed to load friends data:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .limit(20);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadSuggestions();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleAddFriendByUsername = async () => {
    if (!usernameInput.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      await addFriendById(usernameInput.trim());
      setUsernameInput('');
      Alert.alert('Success', 'Friend request sent!');
      await loadData();
    } catch (error) {
      console.error('Failed to add friend:', error);
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      await loadData();
    } catch (error) {
      console.error('Failed to accept request:', error);
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      await loadData();
    } catch (error) {
      console.error('Failed to decline request:', error);
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    }
  };

  const renderFriendRequest = ({ item }: { item: any }) => (
    <View style={styles.requestItem}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.requester_name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.requestContent}>
        <Text style={styles.requestName}>{item.requester_name}</Text>
        <Text style={styles.requestUsername}>@{item.requester_username}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable 
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <Check size={16} color="#fff" />
        </Pressable>
        <Pressable 
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item.id)}
        >
          <X size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  const renderSuggestion = ({ item }: { item: {id: string; display_name: string; username: string} }) => (
    <View style={styles.suggestionItem}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.display_name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.display_name}</Text>
        <Text style={styles.suggestionUsername}>@{item.username}</Text>
      </View>
      <Pressable 
        style={styles.addButton}
        onPress={() => handleAddFriendByUsername()}
      >
        <UserPlus size={16} color="#007AFF" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#007AFF" />
        </Pressable>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Add Friend Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserPlus size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Add Friend</Text>
          </View>
          
          <View style={styles.addFriendContainer}>
            <TextInput
              style={styles.usernameInput}
              value={usernameInput}
              onChangeText={setUsernameInput}
              placeholder="Enter username to add friend"
              maxLength={30}
            />
            <Pressable
              style={[styles.addButton, isLoading && styles.addButtonDisabled]}
              onPress={handleAddFriendByUsername}
              disabled={isLoading}
            >
              <Text style={styles.addButtonText}>
                {isLoading ? 'Adding...' : 'Add'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Search size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Search Users</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or username"
              onSubmitEditing={handleSearch}
            />
            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Search size={20} color="#007AFF" />
            </Pressable>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              {suggestions.map((suggestion, index) => (
                <View key={index} style={styles.suggestionItem}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(suggestion.display_name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionName}>{suggestion.display_name}</Text>
                    <Text style={styles.suggestionUsername}>@{suggestion.username}</Text>
                  </View>
                  <Pressable 
                    style={styles.addButton}
                    onPress={() => handleAddFriendByUsername()}
                  >
                    <UserPlus size={16} color="#007AFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Friend Requests Section */}
        {friendRequests.received.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Friend Requests</Text>
            </View>
            
            {friendRequests.received.map((request, index) => (
              <View key={index} style={styles.requestItem}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(request.sender_profile?.display_name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestContent}>
                  <Text style={styles.requestName}>{request.sender_profile?.display_name}</Text>
                  <Text style={styles.requestUsername}>@{request.sender_profile?.username}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable 
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.id)}
                  >
                    <Check size={16} color="#fff" />
                  </Pressable>
                  <Pressable 
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(request.id)}
                  >
                    <X size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friends List Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Your Friends ({friends.length})</Text>
          </View>
          
          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No friends yet</Text>
              <Text style={styles.emptyStateSubtext}>Add friends to start connecting</Text>
            </View>
          ) : (
            friends.map((friend, index) => (
              <View key={index} style={styles.friendItem}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(friend.friend_profile?.display_name || 'F').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.friendContent}>
                  <Text style={styles.friendName}>{friend.friend_profile?.display_name}</Text>
                  <Text style={styles.friendUsername}>@{friend.friend_profile?.username}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginLeft: 8,
  },
  addFriendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usernameInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  searchButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  suggestionUsername: {
    fontSize: 14,
    color: '#666',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  requestContent: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  friendContent: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
