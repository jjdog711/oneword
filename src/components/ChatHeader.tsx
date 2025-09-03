import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

interface ChatHeaderProps {
  currentUser: {
    id: string;
    name: string;
    username: string;
  } | null;
  friend: {
    id: string;
    name: string;
    username: string;
  } | null;
  onBackPress: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
  currentUser,
  friend,
  onBackPress,
}) => {
  const currentUserName = currentUser?.name || currentUser?.username || 'you';
  const friendName = friend?.name || friend?.username || 'friend';
  
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBackPress}>
        <ArrowLeft size={24} color="#333" />
      </Pressable>
      <View style={styles.headerNames}>
        <Text style={styles.headerName}>{currentUserName.toLowerCase()}</Text>
        <Text style={styles.headerSeparator}>•</Text>
        <Text style={styles.headerName}>{friendName.toLowerCase()}</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
});

const styles = StyleSheet.create({
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
  headerNames: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    textTransform: 'lowercase',
  },
  headerSeparator: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
