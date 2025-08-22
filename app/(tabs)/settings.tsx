import { View, Text, Switch, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app";

export default function SettingsScreen(){
  const notif = useAppStore(s=>s.settings.notifEnabled);
  const toggleNotif = useAppStore(s=>s.toggleNotif);
  const gam = useAppStore(s=>s.settings.gamificationEnabled);
  const toggleGam = useAppStore(s=>s.toggleGamification);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.row}><Text>Notifications</Text><Switch value={notif} onValueChange={toggleNotif} /></View>
      <View style={styles.row}><Text>Gamification</Text><Switch value={gam} onValueChange={toggleGam} /></View>
      <Text style={{color:'#666',marginTop:12}}>Premium features (themes, mood tags, analytics, export) are placeholders in this starter.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,padding:20,gap:16,backgroundColor:'#fff'},
  title:{fontSize:28,fontWeight:'700'},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:14,backgroundColor:'#f7f7fa',borderRadius:12}
});