export type ID = string;

export interface User {
  id: ID;
  name: string;
  username?: string;
  email?: string;
  bio?: string;
}

export interface Connection {
  id: ID;
  a: ID;
  b: ID;
  name: string;
  createdAt: number;
}

export interface Word {
  id: ID;
  senderId: ID;
  receiverId: ID;
  dateLocal: string;
  text: string;
  reveal: 'instant' | 'mutual' | 'scheduled';
  revealTime?: string;
  isPublic?: boolean;
  burnIfUnread?: boolean;
  createdAt: number;
}

export interface JournalEntry {
  id: ID;
  userId: ID;
  date: string;
  dateLocal: string;
  word?: string;
  reflections?: string;
  createdAt: number;
}

export interface Settings {
  notifEnabled: boolean;
  gamificationEnabled: boolean;
}

// DM System Types - Updated for Facebook-style system
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'reaction';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Conversation {
  id: ID;
  friend_id: ID;
  friend_name: string;
  friend_username: string;
  last_message?: Message;
  unread_count: number;
}

export interface Message {
  id: ID;
  sender_id: ID;
  receiver_id: ID;
  content: string;
  created_at: string;
  // Computed fields
  sender?: User;
  isOwn?: boolean;
}

export interface MessageStatusRecord {
  id: ID;
  messageId: ID;
  userId: ID;
  status: MessageStatus;
  readAt?: string;
  createdAt: string;
}

export interface MessageReaction {
  id: ID;
  messageId: ID;
  userId: ID;
  reaction: string; // emoji or reaction type
  createdAt: string;
  // Computed fields
  user?: User;
}

export interface ConversationPreview {
  id: ID;
  friend_id: ID;
  friend_name: string;
  friend_username: string;
  last_message?: Message;
  unread_count: number;
}

export interface SendMessageRequest {
  receiver_id: ID;
  content: string;
}

export interface CreateConversationRequest {
  otherUserId: ID;
  initialMessage?: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend_profile?: {
    id: string;
    username: string;
    display_name: string;
  };
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender_profile?: {
    id: string;
    username: string;
    display_name: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'word_received';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export interface WordRowData {
  id: string;
  username: string;
  isCurrentUser: boolean;
  hasWordToday: boolean;
  word?: string;
  time?: string;
  wordId?: string;
  userId: string;
  isInputRow?: boolean;
  lastWord?: string;
  lastDate?: string;
}

export interface FriendPublicWord {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  friend_name: string;
  friend_username: string;
  isToday: boolean;
  friend_id: string;
}