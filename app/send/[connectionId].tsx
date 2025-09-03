import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useState, useMemo } from "react";
import { useAppStore } from "@/store/app";
import { logger } from '@/lib/logger';
import { createUserFriendlyError } from '@/lib/errors';

export default function SendScreen(){
  const { connectionId } = useLocalSearchParams<{connectionId:string}>();
  const connection = useAppStore(s=>s.connectionById(connectionId!));
  const sendWord = useAppStore(s=>s.sendWord);

  const [word, setWord] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState<'instant'|'mutual'|'scheduled'>('instant');
  const [time, setTime] = useState<string>("21:00"); // HH:mm for scheduled (simple input)
  const [burn, setBurn] = useState(false);

  const canSend = useMemo(()=> word.trim().length>0 && word.trim()===confirm.trim(), [word,confirm]);

  if(!connection){
    return <View style={styles.container}><Text>Connection not found.</Text></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Send to {connection.name}</Text>
      </View>

      <Text style={styles.label}>Your word</Text>
      <TextInput
        value={word}
        onChangeText={setWord}
        placeholder="One word"
        autoCapitalize="none"
        style={styles.input}
      />

      <Text style={styles.label}>Retype to confirm</Text>
      <TextInput value={confirm} onChangeText={setConfirm} placeholder="Retype" style={styles.input}/>

      <Text style={styles.label}>Reveal</Text>
      <View style={styles.row}>
        {(['instant','mutual','scheduled'] as const).map(r => (
          <Pressable key={r} onPress={()=>setReveal(r)} style={[styles.pill, reveal===r && styles.pillActive]}>
            <Text style={[styles.pillText, reveal===r && styles.pillTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {reveal==='scheduled' && (
        <View style={{marginTop:8}}>
          <Text style={styles.label}>Reveal time (HH:mm)</Text>
          <TextInput value={time} onChangeText={setTime} placeholder="21:00" style={styles.input}/>
        </View>
      )}

      {reveal==='mutual' && (
        <Pressable onPress={()=>setBurn(b=>!b)} style={[styles.pill, burn && styles.pillActive]}>
          <Text style={[styles.pillText, burn && styles.pillTextActive]}>burn if unread</Text>
        </Pressable>
      )}

      <Pressable
        disabled={!canSend}
        onPress={async ()=>{
          try {
            await sendWord({ connectionId: connection.id, text: word.trim(), reveal, time, burn });
            router.back();
          } catch (error) {
            logger.error('Failed to send word', { error, connectionId: connection.id, word });
            const appError = createUserFriendlyError(error);
            const title = appError.code === 'DAILY_WORD_LIMIT_EXCEEDED' ? 'Cannot Send Word' : 'Error';
            Alert.alert(title, appError.userMessage);
          }
        }}
        style={[styles.btn, !canSend && {opacity:.4}]}
      >
        <Text style={styles.btnText}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20,gap:12,backgroundColor:'#fff'},
  header:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:8},
  backButton:{paddingVertical:8},
  backText:{color:'#666',fontWeight:'600'},
  title:{fontSize:22,fontWeight:'700'},
  label:{fontWeight:'600',marginTop:6},
  input:{borderWidth:1,borderColor:'#ddd',borderRadius:12,padding:12,fontSize:16,backgroundColor:'#fafafa'},
  row:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  pill:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,borderWidth:1,borderColor:'#ddd',backgroundColor:'#fff'},
  pillActive:{backgroundColor:'#111',borderColor:'#111'},
  pillText:{color:'#333',textTransform:'capitalize',fontWeight:'600'},
  pillTextActive:{color:'#fff'},
  btn:{marginTop:12,backgroundColor:'#111',padding:14,borderRadius:12,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'700'}
});