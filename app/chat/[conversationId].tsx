import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  getMessages, 
  sendMessage, 
  markMessagesAsRead,
  deleteMessage,
  Message,
} from '@/services/dm';
import { logger } from '@/lib/logger';
import { createUserFriendlyError } from '@/lib/errors';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import SignInPrompt from '@/components/SignInPrompt';
import ChatHeader from '@/components/ChatHeader';
import DateGroup from '@/components/DateGroup';
import InputSection from '@/components/InputSection';

interface User {
  id: string;
  name: string;
  username: string;
}

interface DateGroupData {
  date: string;
  messages: Message[];
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList<DateGroupData>>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // UI State
  const [inputState, setInputState] = useState<'typing' | 'confirming'>('typing');
  const [messageText, setMessageText] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [sending, setSending] = useState(false);
  
  // Data State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friend, setFriend] = useState<User | null>(null);

  // Load current user data when authenticated
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!isAuthenticated) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Load current user data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, username')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            logger.error('Failed to load current user profile', { error: profileError });
            setError(new Error('Failed to load user profile'));
            return;
          }
          
          setCurrentUser({
            id: profile.id,
            name: profile.name || profile.username || 'You',
            username: profile.username || 'you',
          });
        }
      } catch (error) {
        logger.error('Failed to load current user', { error });
        setError(error as Error);
      }
    };

    loadCurrentUser();
  }, [isAuthenticated]);

  // Load messages and friend data
  const loadMessages = useCallback(async () => {
    if (!isAuthenticated || !conversationId || !currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load messages using conversationId as friendId
      const data = await getMessages(conversationId as string);
      setMessages(data);
      
      // Mark messages as read using conversationId as friendId
      await markMessagesAsRead(conversationId as string);
      
      // Load friend data using conversationId as friendId
      const { data: friendProfile, error: friendError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .eq('id', conversationId)
        .single();
      
      if (friendError) {
        logger.error('Failed to load friend profile', { error: friendError, conversationId });
        setError(new Error('Failed to load friend profile'));
        return;
      }
      
      setFriend({
        id: friendProfile.id,
        name: friendProfile.name || friendProfile.username || 'Friend',
        username: friendProfile.username || 'friend',
      });
    } catch (error) {
      logger.error('Failed to load messages', { error, conversationId });
      const appError = createUserFriendlyError(error);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, conversationId, currentUser]);

  // Load data when authenticated and user data is available
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadMessages();
    }
  }, [isAuthenticated, currentUser, loadMessages]);

  // Group messages by date with memoization
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups)
      .map(([date, msgs]) => ({
        date,
        messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [messages]);

  // Handle word submission
  const handleSubmitWord = useCallback(async () => {
    if (!messageText.trim() || !conversationId || !currentUser) return;
    
    const word = messageText.trim().toLowerCase();
    
    if (inputState === 'typing') {
      // First submission - show confirmation
      setConfirmText('');
      setInputState('confirming');
      return;
    }
    
    // Confirmation submission
    if (confirmText.trim().toLowerCase() !== word) {
      Alert.alert('Words do not match', 'Please retype your word exactly to confirm.');
      return;
    }
    
    try {
      setSending(true);
      const newMessage = await sendMessage({
        receiver_id: conversationId as string,
        content: word,
      });
      
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      setConfirmText('');
      setInputState('typing');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      logger.error('Failed to send message', { error });
      const appError = createUserFriendlyError(error);
      Alert.alert('Cannot Send Word', appError.userMessage);
    } finally {
      setSending(false);
    }
  }, [messageText, confirmText, inputState, conversationId, currentUser]);

  // Handle message deletion
  const handleDeleteMessage = useCallback(async (message: Message) => {
    if (!currentUser) return;
    
    const isOwn = currentUser.id === message.sender_id;
    
    if (isOwn) {
      // Own message - require retyping confirmation
      Alert.prompt(
        '⚠️ deleting this word hides it from your view, but the other person will still see it. you will not be able to send another today. retype your word to confirm deletion.',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async (typedWord) => {
              if (typedWord?.toLowerCase() === message.content.toLowerCase()) {
                try {
                  await deleteMessage(message.id);
                  setMessages(prev => prev.filter(msg => msg.id !== message.id));
                } catch (error) {
                  logger.error('Failed to delete message', { error });
                  const appError = createUserFriendlyError(error);
                  Alert.alert('Error', appError.userMessage);
                }
              } else {
                Alert.alert('Words do not match', 'Please retype the word exactly to confirm deletion.');
              }
            }
          }
        ],
        'plain-text'
      );
    } else {
      // Other person's message - simple confirmation
      Alert.alert(
        'Delete Message',
        'This will only hide the message from your view. The other person will still see it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMessage(message.id);
                setMessages(prev => prev.filter(msg => msg.id !== message.id));
              } catch (error) {
                logger.error('Failed to delete message', { error });
                const appError = createUserFriendlyError(error);
                Alert.alert('Error', appError.userMessage);
              }
            }
          }
        ]
      );
    }
  }, [currentUser]);

  // Render date group with memoization
  const renderDateGroup = useCallback(({ item }: { item: DateGroupData }) => (
    <DateGroup 
      date={item.date} 
      messages={item.messages} 
      currentUserId={currentUser?.id || ''}
      onDeleteMessage={handleDeleteMessage}
    />
  ), [currentUser?.id, handleDeleteMessage]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: DateGroupData) => item.date, []);

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  // Handle input text changes
  const handleMessageTextChange = useCallback((text: string) => {
    setMessageText(text);
  }, []);

  const handleConfirmTextChange = useCallback((text: string) => {
    setConfirmText(text);
  }, []);

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333" />
          <Text style={styles.loadingText}>loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="Messages"
        subtitle="Sign in to view and send messages"
        showGuestOption={false}
        compact={false}
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <Pressable style={styles.retryButton} onPress={loadMessages}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader 
        currentUser={currentUser}
        friend={friend} 
        onBackPress={handleBackPress}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#333" />
              <Text style={styles.loadingText}>loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={groupedMessages}
              keyExtractor={keyExtractor}
              renderItem={renderDateGroup}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          )}
        </View>

        {/* Input Section */}
        <InputSection
          key={inputState} // Force re-render when state changes
          messageText={messageText}
          confirmText={confirmText}
          showConfirmation={inputState === 'confirming'}
          sending={sending}
          onMessageTextChange={handleMessageTextChange}
          onConfirmTextChange={handleConfirmTextChange}
          onSubmit={handleSubmitWord}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  messagesContainer: {
    flex: 1,
    minHeight: 0, // Important for flex to work properly
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
