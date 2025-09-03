import { supabase } from './supabase';
import { logger } from '@/lib/logger';
import { createUserFriendlyError, handleAsyncError, AppError, ErrorCodes } from '@/lib/errors';
import { getDayKeyForUser } from '@/lib/dates';

// Types for the new Facebook-style DM system
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export interface ConversationPreview {
  id: string;
  friend_id: string;
  friend_name: string;
  friend_username: string;
  last_message?: Message;
  unread_count: number;
}

export interface SendMessageRequest {
  receiver_id: string;
  content: string;
}

// Get conversations (friends list for DM)
export const getConversations = async (): Promise<ConversationPreview[]> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view conversations.',
        true
      );
    }

    // Get user's friends
    const { data: friends, error: friendsError } = await supabase
      .rpc('get_user_friends', { user_id: userData.user.id });

    if (friendsError) {
      logger.error('Failed to get friends', { error: friendsError });
      throw createUserFriendlyError(friendsError);
    }

    if (!friends || friends.length === 0) {
      logger.info('No friends found');
      return [];
    }

    // Get the last message for each friend
    const conversations: ConversationPreview[] = [];
    
    for (const friend of friends) {
      const { data: lastMessage, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userData.user.id},receiver_id.eq.${friend.friend_id}),and(sender_id.eq.${friend.friend_id},receiver_id.eq.${userData.user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (messageError && messageError.code !== 'PGRST116') {
        logger.error('Failed to get last message', { error: messageError, friendId: friend.friend_id });
        continue;
      }

      // Count unread messages (messages from friend that are newer than user's last message)
      let unreadCount = 0;
      if (lastMessage) {
        const { data: unreadMessages, error: unreadError } = await supabase
          .from('messages')
          .select('id')
          .eq('sender_id', friend.friend_id)
          .eq('receiver_id', userData.user.id)
          .gt('created_at', lastMessage.created_at);

        if (!unreadError) {
          unreadCount = unreadMessages?.length || 0;
        }
      }

      conversations.push({
        id: friend.friend_id, // Use friend_id as the conversation id
        friend_id: friend.friend_id,
        friend_name: friend.friend_name,
        friend_username: friend.friend_username,
        last_message: lastMessage || undefined,
        unread_count: unreadCount
      });
    }

    // Sort by last message time
    conversations.sort((a, b) => {
      const aTime = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const bTime = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return bTime - aTime;
    });

    logger.info('Conversations loaded successfully', { count: conversations.length });
    return conversations;
  }, 'getConversations');
};

// Get messages between current user and a friend
export const getMessages = async (friendId: string): Promise<Message[]> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view messages.',
        true
      );
    }

    // Verify they are friends
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${userData.user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userData.user.id})`)
      .eq('status', 'accepted')
      .single();

    if (friendshipError || !friendship) {
      throw new AppError(
        ErrorCodes.PERMISSION_DENIED,
        'Not friends',
        'You can only message your friends.',
        true
      );
    }

    // Get messages between the two users
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userData.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userData.user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get messages', { error, friendId });
      throw createUserFriendlyError(error);
    }

    logger.info('Messages loaded successfully', { count: messages?.length || 0, friendId });
    return messages || [];
  }, 'getMessages');
};

// Send a message to a friend
export const sendMessage = async (request: SendMessageRequest): Promise<Message> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to send messages.',
        true
      );
    }

    // Verify they are friends
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${userData.user.id},addressee_id.eq.${request.receiver_id}),and(requester_id.eq.${request.receiver_id},addressee_id.eq.${userData.user.id})`)
      .eq('status', 'accepted')
      .single();

    if (friendshipError || !friendship) {
      throw new AppError(
        ErrorCodes.PERMISSION_DENIED,
        'Not friends',
        'You can only message your friends.',
        true
      );
    }

    // Get user's timezone from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError) {
      logger.warn('Failed to get user timezone, using default', { error: profileError });
    }
    
    const userTimezone = profile?.timezone || 'America/New_York';
    const today = getDayKeyForUser(userTimezone);
    
    // Check if user has already sent a message today to this friend
    const { data: existingMessage, error: checkError } = await supabase
      .from('messages')
      .select('id')
      .eq('sender_id', userData.user.id)
      .eq('receiver_id', request.receiver_id)
      .gte('created_at', new Date(today + 'T00:00:00Z').toISOString())
      .lt('created_at', new Date(today + 'T23:59:59Z').toISOString())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      logger.error('Failed to check daily message limit for DM', { error: checkError, receiverId: request.receiver_id });
      throw createUserFriendlyError(checkError);
    }

    if (existingMessage) {
      throw new AppError(
        ErrorCodes.DAILY_WORD_LIMIT_EXCEEDED,
        'Daily word limit exceeded',
        'You have already sent your word for today to this friend. Come back tomorrow to send another word!',
        true
      );
    }

    // Send the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userData.user.id,
        receiver_id: request.receiver_id,
        content: request.content
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to send message', { error, request });
      throw createUserFriendlyError(error);
    }

    logger.info('Message sent successfully', { messageId: message.id, receiverId: request.receiver_id });
    return message;
  }, 'sendMessage');
};

// Mark messages as read (simple implementation - just get messages to mark them as "viewed")
export const markMessagesAsRead = async (friendId: string): Promise<void> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to mark messages as read.',
        true
      );
    }

    // For now, we'll just log that messages were viewed
    // In a more complex system, you might have a separate table to track read status
    logger.info('Messages marked as read', { friendId, userId: userData.user.id });
  }, 'markMessagesAsRead');
};

// Delete a message (only hides it for the user, doesn't affect the other person)
export const deleteMessage = async (messageId: string): Promise<void> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to delete messages.',
        true
      );
    }

    // For now, we'll just log the deletion
    // In a more complex system, you might have a separate table to track deleted messages per user
    logger.info('Message deleted (hidden from user view)', { messageId, userId: userData.user.id });
    
    // TODO: Implement proper deletion tracking in a separate table
    // This would track which messages each user has "deleted" (hidden from their view)
    // For now, we'll just return success and let the UI handle the removal
  }, 'deleteMessage');
};

// Get or create a conversation with a friend
export const getOrCreateConversation = async (friendId: string): Promise<string> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to start conversations.',
        true
      );
    }

    // Check if friendship exists
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${userData.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userData.user.id})`)
      .eq('status', 'accepted')
      .single();

    if (friendshipError || !friendship) {
      throw new AppError(
        ErrorCodes.PERMISSION_DENIED,
        'Not friends',
        'You can only message your friends.',
        true
      );
    }

    // For this simple implementation, we'll use the friend_id as the conversation id
    // In a more complex system, you might have a separate conversations table
    return friendId;
  }, 'getOrCreateConversation');
};
