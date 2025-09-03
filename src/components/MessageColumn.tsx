import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Message } from '@/services/dm';

interface MessageColumnProps {
  message?: Message;
  align: 'left' | 'right';
  onLongPress?: () => void;
}

const MessageColumn: React.FC<MessageColumnProps> = React.memo(({
  message,
  align,
  onLongPress,
}) => {
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  if (!message) {
    return <View style={styles.emptyColumn} />;
  }

  return (
    <Pressable 
      style={[
        styles.messageContainer, 
        align === 'right' && styles.messageContainerRight
      ]} 
      onLongPress={onLongPress}
      accessibilityLabel={`${align} message: ${message.content}`}
      accessibilityRole="button"
    >
      <Text style={[
        styles.messageText,
        align === 'right' && styles.messageTextRight
      ]}>{message.content}</Text>
      <Text style={styles.timeText}>{formatTime(message.created_at)}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  messageContainer: {
    flex: 1,
    alignItems: 'flex-start',
    minHeight: 32,
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  emptyColumn: {
    flex: 1,
    height: 32,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
    textAlign: 'left',
  },
  messageTextRight: {
    textAlign: 'right',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
});

MessageColumn.displayName = 'MessageColumn';

export default MessageColumn;
