import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Message } from '@/services/dm';
import MessageColumn from './MessageColumn';

interface MessageRowProps {
  userMessage?: Message;
  friendMessage?: Message;
  currentUserId: string;
  onDeleteMessage: (message: Message) => void;
}

const MessageRow: React.FC<MessageRowProps> = React.memo(({
  userMessage,
  friendMessage,
  currentUserId,
  onDeleteMessage,
}) => {
  const handleDeleteUserMessage = React.useCallback(() => {
    if (userMessage) {
      onDeleteMessage(userMessage);
    }
  }, [userMessage, onDeleteMessage]);

  const handleDeleteFriendMessage = React.useCallback(() => {
    if (friendMessage) {
      onDeleteMessage(friendMessage);
    }
  }, [friendMessage, onDeleteMessage]);

  return (
    <View style={styles.messageRow}>
      <MessageColumn 
        message={userMessage} 
        align="right" 
        onLongPress={userMessage ? handleDeleteUserMessage : undefined}
      />
      <View style={styles.centerSpacer} />
      <MessageColumn 
        message={friendMessage} 
        align="left" 
        onLongPress={friendMessage ? handleDeleteFriendMessage : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  centerSpacer: {
    width: 40,
  },
});

MessageRow.displayName = 'MessageRow';

export default MessageRow;
