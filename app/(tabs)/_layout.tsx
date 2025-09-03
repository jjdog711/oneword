import { Tabs } from "expo-router";
import { Users, Globe, User } from "lucide-react-native";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getFriendRequests } from "@/services/supabase";

// Badge component for tab notifications
function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Load pending friend requests count
  useEffect(() => {
    const loadPendingRequestsCount = async () => {
      if (!isAuthenticated) {
        setPendingRequestsCount(0);
        return;
      }

      try {
        const requests = await getFriendRequests();
        setPendingRequestsCount(requests.length);
      } catch (error) {
        console.error('Failed to load pending requests count:', error);
        setPendingRequestsCount(0);
      }
    };

    loadPendingRequestsCount();
  }, [isAuthenticated]);

  return (
    <Tabs 
      screenOptions={{ headerShown: false }}
      initialRouteName="global"
    >
      <Tabs.Screen 
        name="friends" 
        options={{ 
          title: "Friends", 
          tabBarIcon: ({color,size}) => (
            <View style={styles.tabIconContainer}>
              <Users color={color} size={size} />
              <TabBadge count={pendingRequestsCount} />
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="global" 
        options={{ 
          title: "Global", 
          tabBarIcon: ({color,size}) => <Globe color={color} size={size} /> 
        }} 
      />
      <Tabs.Screen 
        name="me" 
        options={{ 
          title: "Me", 
          tabBarIcon: ({color,size}) => <User color={color} size={size} /> 
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});