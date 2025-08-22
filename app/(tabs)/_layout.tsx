import { Tabs } from "expo-router";
import { House, BookText, Globe, Settings as Gear } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({color,size}) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="journal" options={{ title: "Journal", tabBarIcon: ({color,size}) => <BookText color={color} size={size} /> }} />
      <Tabs.Screen name="public" options={{ title: "Public", tabBarIcon: ({color,size}) => <Globe color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({color,size}) => <Gear color={color} size={size} /> }} />
    </Tabs>
  );
}