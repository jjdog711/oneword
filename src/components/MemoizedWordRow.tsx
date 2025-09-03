import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { WordRowData } from '@/types';

interface WordRowProps {
  item: WordRowData;
  onPress: (item: WordRowData) => void;
  onLongPress?: (item: WordRowData) => void;
}

const WordRow = memo<WordRowProps>(({ item, onPress, onLongPress }) => {
  const handlePress = () => onPress(item);
  const handleLongPress = () => onLongPress?.(item);

  if (item.isInputRow) {
    return (
      <View style={styles.wordRow}>
        <Text style={[styles.username, item.isCurrentUser && styles.currentUserText]}>
          {item.username}
        </Text>
        <Text style={styles.inputPlaceholder}>tap to add word</Text>
        <Text style={styles.timePlaceholder}>--</Text>
      </View>
    );
  }

  if (!item.hasWordToday) {
    return (
      <Pressable style={styles.wordRow} onPress={handlePress}>
        <Text style={[styles.username, item.isCurrentUser && styles.currentUserText]}>
          {item.username}
        </Text>
        <Text style={styles.noWordText}>no word yet</Text>
        <Text style={styles.lastWordText}>
          {item.lastWord ? `last: ${item.lastWord} ${item.lastDate || ''}` : '--'}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable 
      style={styles.wordRow} 
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <Text style={[styles.username, item.isCurrentUser && styles.currentUserText]}>
        {item.username}
      </Text>
      <Text style={styles.wordText}>{item.word || ''}</Text>
      <Text style={styles.timeText}>{item.time || ''}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  currentUserText: {
    fontWeight: '500',
  },
  wordText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  timeText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
    textTransform: 'lowercase',
  },
  noWordText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  lastWordText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
    textTransform: 'lowercase',
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  timePlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    textAlign: 'right',
  },
});

WordRow.displayName = 'WordRow';

export default WordRow;
