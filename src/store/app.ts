import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Connection, ID, JournalEntry, Settings, User, Word } from "@/types";
import { localDateString, parseHHmmToTodayISO } from "@/lib/time";
import { isSingleWord } from "@/lib/validate";
import { getConnectionStatus, Status } from "@/lib/reveal";

function uid(){ return Math.random().toString(36).slice(2); }

export type AppState = {
  me: User;
  users: Record<ID,User>;
  connections: Connection[];
  words: Word[];
  journal: JournalEntry[];
  settings: Settings;
  lastProcessedDate: string;

  // selectors
  connectionsForMe: ()=> Connection[];
  connectionById: (id:ID)=> Connection|undefined;
  statusForConnection: (id:ID)=> Status;
  threadForConnection: (id:ID)=> { key:string; date:string; mine?:string; theirs?:string; missed?:boolean }[];
  journalForMe: ()=> JournalEntry[];
  publicTopWords: ()=> { text:string; count:number }[];

  // actions
  bootstrap: ()=> void;
  sendWord: (args:{ connectionId:ID; text:string; reveal:'instant'|'mutual'|'scheduled'; time?:string; burn?:boolean })=> void;
  processMidnight: ()=> void;
  toggleNotif: ()=> void;
  toggleGamification: ()=> void;
};

export const useAppStore = create<AppState>()(persist((set,get)=>({
  me: { id: 'me', name: 'You' },
  users: { 'me': {id:'me', name:'You'} },
  connections: [],
  words: [],
  journal: [],
  settings: { notifEnabled: true, gamificationEnabled: true },
  lastProcessedDate: localDateString(),

  bootstrap(){
    const st = get();
    // Ensure System Friend connection exists
    let sys = Object.values(st.users).find(u=>u.id==='system');
    if(!sys){
      sys = { id: 'system', name: 'System Friend' };
      set({ users: { ...st.users, system: sys } });
    }
    const hasConn = st.connections.some(c=> (c.a==='me'&&c.b==='system')||(c.a==='system'&&c.b==='me'));
    if(!hasConn){
      const conn: Connection = { id: uid(), a:'me', b:'system', name:'System Friend', createdAt: Date.now() };
      set({ connections: [...st.connections, conn] });
    }
  },

  connectionsForMe(){
    const me = get().me.id;
    return get().connections.filter(c=> c.a===me || c.b===me);
  },
  connectionById(id){ return get().connections.find(c=>c.id===id); },
  statusForConnection(id){
    const me = get().me.id; const c = get().connections.find(c=>c.id===id);
    if(!c) return 'WAITING_YOU';
    const them = c.a===me? c.b : c.a;
    return getConnectionStatus(get().words, me, them);
  },
  threadForConnection(id){
    const me = get().me.id; const c = get().connections.find(c=>c.id===id);
    if(!c) return [];
    const them = c.a===me? c.b : c.a;
    // show last 14 days for demo
    const days: string[] = Array.from({length:14},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-i);
      return localDateString(d);
    }).reverse();
    return days.map(date=>{
      const mine = get().words.find(w=>w.senderId===me && w.receiverId===them && w.dateLocal===date);
      const theirs = get().words.find(w=>w.senderId===them && w.receiverId===me && w.dateLocal===date);
      const missed = (!mine && !theirs && date!==localDateString());
      const revealNow = (w?:Word)=>{
        if(!w) return undefined;
        if(w.reveal==='scheduled' && w.revealTime && Date.now()<new Date(w.revealTime).getTime()) return undefined;
        if(w.reveal==='mutual'){
          if(mine && theirs) return w.text; else return w.senderId===me? w.text : undefined; // show your own text always
        }
        return w.text;
      };
      return {
        key: id+date,
        date,
        mine: revealNow(mine),
        theirs: revealNow(theirs)
      } as any;
    });
  },
  journalForMe(){ return get().journal.sort((a,b)=> a.date<b.date?1:-1); },
  publicTopWords(){
    // simple aggregate of today's words (opt-in omitted in starter)
    const today = localDateString();
    const map = new Map<string,number>();
    get().words.filter(w=>w.dateLocal===today).forEach(w=>{
      map.set(w.text, (map.get(w.text)||0)+1);
    });
    return Array.from(map.entries()).map(([text,count])=>({text,count})).sort((a,b)=>b.count-a.count).slice(0,10);
  },

  sendWord({connectionId, text, reveal, time, burn}){
    const st = get();
    if(!isSingleWord(text)) return;
    const me = st.me.id; const c = st.connections.find(c=>c.id===connectionId);
    if(!c) return; const them = c.a===me? c.b : c.a;
    const dateLocal = localDateString();
    // enforce one per day per connection
    const existing = st.words.find(w=>w.senderId===me && w.receiverId===them && w.dateLocal===dateLocal);
    if(existing) return;

    const w: Word = {
      id: uid(), senderId: me, receiverId: them, dateLocal,
      text, reveal,
      revealTime: reveal==='scheduled' ? parseHHmmToTodayISO(time||'21:00') : undefined,
      burnIfUnread: reveal==='mutual' ? !!burn : false,
      createdAt: Date.now()
    };
    set({ words: [...st.words, w] });

    // System Friend auto-reply once per day
    if(them==='system'){
      const reply: Word = {
        id: uid(), senderId: 'system', receiverId: me, dateLocal,
        text: 'welcome', reveal: 'instant', createdAt: Date.now()
      };
      set({ words: [...get().words, reply] });
    }
  },

  processMidnight(){
    const st = get();
    const today = localDateString();
    const yesterday = ((d:Date)=>{ const x=new Date(d); x.setDate(x.getDate()-1); return localDateString(x); })(new Date());

    // burn-if-unread: delete sender words where counterpart missing
    const keep: Word[] = [];
    for(const w of st.words){
      if(w.dateLocal===yesterday && w.reveal==='mutual' && w.burnIfUnread){
        const counterpart = st.words.find(x=> x.senderId===w.receiverId && x.receiverId===w.senderId && x.dateLocal===yesterday);
        if(!counterpart){
          // drop (burn)
          continue;
        }
      }
      keep.push(w);
    }
    set({ words: keep, lastProcessedDate: today });

    // ensure journal row for yesterday exists (optional starter behavior)
    const me = st.me.id;
    const jr = st.journal.find(j=>j.date===yesterday);
    if(!jr){ set({ journal: [...st.journal, { date: yesterday }] }); }
  },

  toggleNotif(){ set({ settings: { ...get().settings, notifEnabled: !get().settings.notifEnabled } }); },
  toggleGamification(){ set({ settings: { ...get().settings, gamificationEnabled: !get().settings.gamificationEnabled } }); }
}), { name: 'oneword-store', storage: { getItem: AsyncStorage.getItem, setItem: AsyncStorage.setItem, removeItem: AsyncStorage.removeItem } }));

// Auto-bootstrap store on import
useAppStore.getState().bootstrap();