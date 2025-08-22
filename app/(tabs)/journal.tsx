import { View, Text, FlatList, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app";

export default function JournalScreen(){
  const journal = useAppStore(s => s.journalForMe());
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Journal</Text>
      <FlatList
        data={journal}
        keyExtractor={(j)=>j.date}
        renderItem={({item})=> (
          <View style={styles.row}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.word}>{item.myWord ?? '—'}</Text>
            <Text style={styles.note} numberOfLines={3}>{item.reflections ?? ''}</Text>
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,padding:20,gap:16,backgroundColor:'#fff'},
  title:{fontSize:28,fontWeight:'700'},
  row:{padding:12,backgroundColor:'#f7f7fa',borderRadius:12,marginBottom:10},
  date:{fontWeight:'600',marginBottom:4,color:'#666'},
  word:{fontSize:18,fontWeight:'700'},
  note:{marginTop:6,color:'#444'}
});