import { Link } from "expo-router";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app";
import { getConnectionStatusLabel } from "@/lib/reveal";

export default function HomeScreen() {
  const me = useAppStore(s => s.me);
  const connections = useAppStore(s => s.connectionsForMe());
  const statusFor = useAppStore(s => s.statusForConnection);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OneWord</Text>
      <FlatList
        data={connections}
        keyExtractor={c => c.id}
        renderItem={({item}) => {
          const status = statusFor(item.id);
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.chip}>{getConnectionStatusLabel(status)}</Text>
              <View style={{flexDirection:'row', gap:12}}>
                <Link href={`/send/${item.id}`} asChild>
                  <Pressable style={styles.btn}><Text style={styles.btnText}>Send</Text></Pressable>
                </Link>
                <Link href={`/connection/${item.id}`} asChild>
                  <Pressable style={[styles.btn, styles.secondary]}><Text style={[styles.btnText,{color:'#111'}]}>Thread</Text></Pressable>
                </Link>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={<Text>No connections yet. System Friend will appear after sign-in.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20,gap:16,backgroundColor:'#fff'},
  title:{fontSize:28,fontWeight:'700'},
  card:{padding:16,borderRadius:16,backgroundColor:'#f5f5f7',gap:8},
  name:{fontSize:18,fontWeight:'600'},
  chip:{alignSelf:'flex-start',backgroundColor:'#e8e8ee',paddingHorizontal:10,paddingVertical:4,borderRadius:999,color:'#333'},
  btn:{backgroundColor:'#111',paddingHorizontal:14,paddingVertical:10,borderRadius:12},
  btnText:{color:'#fff',fontWeight:'700'},
  secondary:{backgroundColor:'#e8e8ee'}
});