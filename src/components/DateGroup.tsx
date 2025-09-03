import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@/services/dm';
import MessageRow from './MessageRow';

interface DateGroupProps {
  date: string;
  messages: Message[];
  currentUserId: string;
  onDeleteMessage: (message: Message) => void;
}

const DateGroup: React.FC<DateGroupProps> = React.memo(({
  date,
  messages,
  currentUserId,
  onDeleteMessage,
}) => {
  const formatDate = React.useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${dayName} ${month}/${day}/${year}`;
  }, []);

  const userMessage = messages.find(msg => currentUserId === msg.sender_id);
  const friendMessage = messages.find(msg => currentUserId !== msg.sender_id);

  return (
    <View style={styles.dateGroup}>
      <View style={styles.dateDivider}>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </View>
      
      <MessageRow
        userMessage={userMessage}
        friendMessage={friendMessage}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  dateGroup: {
    marginBottom: 24,
  },
  dateDivider: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
});

DateGroup.displayName = 'DateGroup';

export default DateGroup;
