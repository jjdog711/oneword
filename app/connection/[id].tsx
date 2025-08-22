import { useLocalSearchParams } from "expo-router";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app";

export default function ThreadScreen(){
  const { id } = useLocalSearchParams<{id:string}>();
  const thread = useAppStore(s=>s.threadForConnection(id!));
  const conn = useAppStore(s=>s.connectionById(id!));
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{conn?.name}</Text>
      <FlatList data={thread} keyExtractor={(r)=>r.key}
        renderItem={({item})=> (
          <View style={styles.row}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.me}>You: {item.mine ?? '—'}</Text>
            <Text style={styles.them}>{conn?.name}: {item.theirs ?? '—'}</Text>
            {item.missed && <Text style={styles.missed}>Missed</Text>}
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,padding:20,gap:12,backgroundColor:'#fff'},
  title:{fontSize:22,fontWeight:'700'},
  row:{padding:12,backgroundColor:'#f7f7fa',borderRadius:12,marginBottom:10,gap:4},
  date:{color:'#666',fontWeight:'600'},
  me:{fontWeight:'700'},
  them:{fontWeight:'700'},
  missed:{marginTop:4,color:'#b00',fontWeight:'700'}
});