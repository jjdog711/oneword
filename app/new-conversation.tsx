import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  UserPlus,
  MessageCircle,
} from 'lucide-react-native';
import { useAppStore } from '@/store/app';
import { getOrCreateConversation } from '@/services/dm';
import { logger } from '@/lib/logger';
import { createUserFriendlyError } from '@/lib/errors';
import { supabase } from '@/services/supabase';
import SignInPrompt from '@/components/SignInPrompt';

export default function NewConversationScreen() {
  const router = useRouter();
  const connections = useAppStore(s => s.connectionsForMe());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Filter connections based on search query
  const filteredConnections = connections.filter(connection => 
    connection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Start conversation
  const handleStartConversation = async (connection: any) => {
    try {
      setLoading(true);
      const conversationId = await getOrCreateConversation(connection.id);
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      logger.error('Failed to start conversation', { error });
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="New Conversation"
        subtitle="Sign in to start messaging with friends"
        showGuestOption={false}
        compact={false}
      />
    );
  }

  // Render connection item
  const renderConnection = ({ item }: { item: any }) => (
    <Pressable 
      style={styles.connectionItem}
      onPress={() => handleStartConversation(item)}
      disabled={loading}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionName}>{item.name}</Text>
        <Text style={styles.connectionSubtitle}>Tap to start messaging</Text>
      </View>
      
      <MessageCircle size={20} color="#007AFF" />
    </Pressable>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UserPlus size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No friends found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No friends match "${searchQuery}"`
          : 'Add friends to start conversations'
        }
      </Text>
      {!searchQuery && (
        <Pressable 
          style={styles.addFriendsButton}
          onPress={() => router.push('/friends')}
        >
          <Text style={styles.addFriendsButtonText}>Add Friends</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#007AFF" />
        </Pressable>
        <Text style={styles.title}>New Conversation</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search friends..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Connections List */}
      <FlatList
        data={filteredConnections}
        keyExtractor={(item) => item.id}
        renderItem={renderConnection}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredConnections.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Starting conversation...</Text>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  connectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFriendsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFriendsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});
