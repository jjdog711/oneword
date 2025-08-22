import { View, Text, FlatList, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app";

export default function PublicScreen(){
  const top = useAppStore(s => s.publicTopWords());
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today’s Top Words</Text>
      <FlatList data={top} keyExtractor={(w)=>w.text}
        renderItem={({item,index})=> (
          <View style={styles.row}><Text style={styles.rank}>{index+1}.</Text><Text style={styles.word}>{item.text}</Text><Text style={styles.count}>{item.count}</Text></View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,padding:20,gap:16,backgroundColor:'#fff'},
  title:{fontSize:28,fontWeight:'700'},
  row:{flexDirection:'row',alignItems:'center',gap:12,padding:12,backgroundColor:'#f7f7fa',borderRadius:12,marginBottom:10},
  rank:{width:24,textAlign:'right',fontWeight:'700'},
  word:{flex:1,fontSize:18,fontWeight:'700'},
  count:{color:'#666'}
});