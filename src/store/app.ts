import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Connection, ID, JournalEntry, Settings, User, Word, Friend, FriendRequest, Notification, FriendPublicWord } from "@/types";
import { getDayKeyForUser, parseTimeToUserToday } from "@/lib/dates";
import { isSingleWord } from "@/lib/validate";
import { getConnectionStatus, Status } from "@/lib/reveal";
import { addWord as addWordToSupabase, addPublicWord as addPublicWordToSupabase, getPublicWords as getPublicWordsFromSupabase, getFriendsPublicWords as getFriendsPublicWordsFromSupabase, getCurrentUserPublicWord as getCurrentUserPublicWordFromSupabase, sendFriendRequest as sendFriendRequestToSupabase, getFriends as getFriendsFromSupabase, getFriendRequests as getFriendRequestsFromSupabase, getSentFriendRequests as getSentFriendRequestsFromSupabase, acceptFriendRequest as acceptFriendRequestToSupabase, declineFriendRequest as declineFriendRequestToSupabase, removeFriend as removeFriendFromSupabase, searchUsers as searchUsersFromSupabase, loadUserConnections as loadUserConnectionsFromSupabase, getContactSuggestions as getContactSuggestionsFromSupabase, getNotifications as getNotificationsFromSupabase, addJournalEntry as addJournalEntryToSupabase, getJournalEntries as getJournalEntriesFromSupabase, deleteJournalEntry as deleteJournalEntryToSupabase, updateJournalEntry as updateJournalEntryToSupabase, addFriendById as addFriendByIdToSupabase, updateUserProfile as updateUserProfileToSupabase, deletePublicWord as deletePublicWordToSupabase, signInWithGoogle, signInWithFacebook, signInWithApple, signInWithGithub } from "@/services/supabase";
import { supabase } from "@/services/supabase";
import { logger } from "@/lib/logger";
import { createUserFriendlyError } from "@/lib/errors";
import { AppError, ErrorCodes } from "@/lib/errors";

function uid(){ return Math.random().toString(36).slice(2); }

export type AppState = {
  me: User; // Now a full User object
  users: Record<ID,User>;
  connections: Connection[];
  words: Word[];
  journal: JournalEntry[];
  settings: Settings;
  lastProcessedDate: string;
  publicWords: { text:string; count:number }[];
  friendsPublicWords: FriendPublicWord[]; // Typed
  currentUserPublicWord: Word | null; // Typed
  friendRequests: { sent: FriendRequest[]; received: FriendRequest[] }; // Typed
  friends: Friend[]; // Typed
  notifications: Notification[]; // Typed
  journalEntries: JournalEntry[]; // Typed
  isGuestMode: boolean; // Add guest mode state

  // selectors
  connectionsForMe: ()=> Connection[];
  connectionById: (id:ID)=> Connection|undefined;
  statusForConnection: (id:ID)=> Status;
  threadForConnection: (id:ID)=> { key:string; date:string; mine?:string; theirs?:string; missed?:boolean }[];
  journalForMe: ()=> JournalEntry[];
  publicTopWords: ()=> { text:string; count:number }[];
  pendingFriendRequests: ()=> any[];
  todaysJournalEntry: ()=> any;

  // actions
  bootstrap: ()=> void;
  sendWord: (args:{ connectionId:ID; text:string; reveal:'instant'|'mutual'|'scheduled'; time?:string; burn?:boolean })=> void;
  addPublicWord: (text: string)=> Promise<void>;
  loadPublicWords: ()=> Promise<void>;
  loadFriendsPublicWords: ()=> Promise<void>;
  loadCurrentUserPublicWord: ()=> Promise<void>;
  sendFriendRequest: (targetUserId: string)=> Promise<void>;
  getFriendRequests: ()=> Promise<void>;
  acceptFriendRequest: (friendshipId: string)=> Promise<void>;
  declineFriendRequest: (friendshipId: string)=> Promise<void>;
  addFriendById: (friendId: string)=> Promise<void>;
  updateUserProfile: (updates: { display_name?: string; username?: string; profile_visibility?: string })=> Promise<void>;
  loadConnections: ()=> Promise<void>;
  loadFriends: ()=> Promise<void>;
  loadNotifications: ()=> Promise<void>;
  addJournalEntry: (word: string, reflections?: string)=> Promise<void>;
  loadJournalEntries: ()=> Promise<void>;
  processMidnight: ()=> void;
  toggleNotif: ()=> void;
  toggleGamification: ()=> void;
  clearUserData: ()=> void;
  deletePublicWord: (wordId: string) => Promise<void>;
  deleteDMWord: (wordId: string) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
  updateJournalEntry: (entryId: string, word: string, reflections?: string) => Promise<void>;
  loadCurrentUserProfile: () => Promise<void>;
  updateCurrentUserProfile: (updates: { username?: string; name?: string; email?: string; bio?: string }) => Promise<void>; // Updated signature
  setGuestMode: (isGuest: boolean) => void; // Add guest mode action
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
};

export const useAppStore = create<AppState>()(persist((set,get)=>({
  me: { id: '', name: '' }, // Initialized as empty object
  users: {}, // Initialized as empty object
  connections: [],
  words: [],
  journal: [],
  settings: { notifEnabled: true, gamificationEnabled: true },
  lastProcessedDate: '', // Will be set dynamically
  publicWords: [],
  friendsPublicWords: [],
  currentUserPublicWord: null,
  friendRequests: { sent: [], received: [] },
  friends: [],
  notifications: [],
  journalEntries: [],
  isGuestMode: false, // Initialize guest mode as false

  bootstrap(){
    const st = get();
    // Initialize timezone if not set
    if (!st.me.timezone) {
      set({ me: { ...st.me, timezone: 'America/New_York' } });
    }
    
    // Initialize lastProcessedDate if not set
    if (!st.lastProcessedDate) {
      const userTimezone = st.me.timezone || 'America/New_York';
      const today = getDayKeyForUser(userTimezone);
      set({ lastProcessedDate: today });
    }
    
    // Create a consistent UUID for system user (using a fixed UUID)
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
    
    // Ensure System Friend connection exists
    let sys = Object.values(st.users).find(u=>u.id===SYSTEM_USER_ID);
    if(!sys){
      sys = { id: SYSTEM_USER_ID, name: 'System Friend' };
      set({ users: { ...st.users, [SYSTEM_USER_ID]: sys } });
    }
    const hasConn = st.connections.some(c=> (c.a==='me'&&c.b===SYSTEM_USER_ID)||(c.a===SYSTEM_USER_ID&&c.b==='me'));
    if(!hasConn){
      const conn: Connection = { id: uid(), a:'me', b:SYSTEM_USER_ID, name:'System Friend', createdAt: Date.now() };
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
    const userTimezone = get().me.timezone || 'America/New_York';
    const days: string[] = Array.from({length:14},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-i);
      return getDayKeyForUser(userTimezone, d);
    }).reverse();
    return days.map(date=>{
      const mine = get().words.find(w=>w.senderId===me && w.receiverId===them && w.dateLocal===date);
      const theirs = get().words.find(w=>w.senderId===them && w.receiverId===me && w.dateLocal===date);
      const missed = (!mine && !theirs && date!==getDayKeyForUser(userTimezone));
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
    return get().publicWords;
  },
  pendingFriendRequests(){
    return get().friendRequests.received.filter(r => r.status === 'pending');
  },
  todaysJournalEntry(){
    const userTimezone = get().me.timezone || 'America/New_York';
    const today = getDayKeyForUser(userTimezone);
    return get().journalEntries.find(je => je.dateLocal === today);
  },

  sendWord: async ({connectionId, text, reveal, time, burn}) => {
    const st = get();
    if(!isSingleWord(text)) return;
    const me = st.me.id; const c = st.connections.find(c=>c.id===connectionId);
    if(!c) return; const them = c.a===me? c.b : c.a;
    const userTimezone = st.me.timezone || 'America/New_York';
    const dateLocal = getDayKeyForUser(userTimezone);
    // enforce one per day per connection
    const existing = st.words.find(w=>w.senderId===me && w.receiverId===them && w.dateLocal===dateLocal);
    if(existing) {
      throw new AppError(
        ErrorCodes.DAILY_WORD_LIMIT_EXCEEDED,
        'Daily word limit exceeded',
        'You have already sent your word for today to this connection. Come back tomorrow to send another word!',
        true
      );
    }

    try {
      // Add word to Supabase
      await addWordToSupabase(text, them);
      
      const w: Word = {
        id: uid(), senderId: me, receiverId: them, dateLocal,
        text, reveal,
        revealTime: reveal==='scheduled' ? parseTimeToUserToday(userTimezone, time||'21:00') : undefined,
        burnIfUnread: reveal==='mutual' ? !!burn : false,
        createdAt: Date.now()
      };
      set({ words: [...st.words, w] });

      // System Friend auto-reply once per day
      const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
      if(them===SYSTEM_USER_ID){
        const reply: Word = {
          id: uid(), senderId: SYSTEM_USER_ID, receiverId: me, dateLocal,
          text: 'welcome', reveal: 'instant', createdAt: Date.now()
        };
        set({ words: [...get().words, reply] });
      }
    } catch (error) {
      logger.error('Failed to send word', { error, text, connectionId });
      throw createUserFriendlyError(error);
    }
  },

  addPublicWord: async (text: string) => {
    if(!isSingleWord(text)) return;
    
    try {
      await addPublicWordToSupabase(text);
      // Refresh public words and current user's word after adding
      await Promise.all([
        get().loadPublicWords(),
        get().loadCurrentUserPublicWord()
      ]);
      logger.info('Public word added successfully', { text });
    } catch (error) {
      logger.error('Failed to add public word', { error, text });
      throw createUserFriendlyError(error);
    }
  },

  loadPublicWords: async () => {
    try {
      const publicWords = await getPublicWordsFromSupabase();
      set({ publicWords });
      logger.info('Public words loaded successfully', { count: publicWords.length });
    } catch (error) {
      logger.error('Failed to load public words', { error });
      throw createUserFriendlyError(error);
    }
  },

  loadFriendsPublicWords: async () => {
    try {
      const friendsPublicWords = await getFriendsPublicWordsFromSupabase();
      set({ friendsPublicWords });
      logger.info('Friends public words loaded successfully', { count: friendsPublicWords.length });
    } catch (error) {
      logger.error('Failed to load friends public words', { error });
      throw createUserFriendlyError(error);
    }
  },

  loadCurrentUserPublicWord: async () => {
    try {
      const currentUserPublicWord = await getCurrentUserPublicWordFromSupabase();
      set({ currentUserPublicWord });
      logger.info('Current user public word loaded successfully', { hasWord: !!currentUserPublicWord });
    } catch (error) {
      logger.error('Failed to load current user public word', { error });
      throw createUserFriendlyError(error);
    }
  },

  sendFriendRequest: async (targetUserId: string) => {
    try {
      await sendFriendRequestToSupabase(targetUserId);
      // Refresh friend requests after sending
      await get().getFriendRequests();
      logger.info('Friend request sent successfully', { targetUserId });
    } catch (error) {
      logger.error('Failed to send friend request', { error, targetUserId });
      throw createUserFriendlyError(error);
    }
  },

  getFriendRequests: async () => {
    try {
      const requests = await getFriendRequestsFromSupabase();
      set({ friendRequests: { ...get().friendRequests, received: requests as unknown as FriendRequest[] } });
      logger.info('Friend requests loaded successfully', { count: requests?.length || 0 });
    } catch (error) {
      logger.error('Failed to load friend requests', { error });
      throw createUserFriendlyError(error);
    }
  },

  acceptFriendRequest: async (requestId: string) => {
    try {
      await acceptFriendRequestToSupabase(requestId);
      // Reload friends and requests
      await get().getFriendRequests();
      await get().loadFriends();
      logger.info('Friend request accepted successfully', { requestId });
    } catch (error) {
      logger.error('Failed to accept friend request', { error, requestId });
      throw createUserFriendlyError(error);
    }
  },

  declineFriendRequest: async (requestId: string) => {
    try {
      await declineFriendRequestToSupabase(requestId);
      // Reload requests
      await get().getFriendRequests();
      logger.info('Friend request declined successfully', { requestId });
    } catch (error) {
      logger.error('Failed to decline friend request', { error, requestId });
      throw createUserFriendlyError(error);
    }
  },

  removeFriend: async (friendId: string) => {
    try {
      await removeFriendFromSupabase(friendId);
      // Reload friends
      await get().loadFriends();
      logger.info('Friend removed successfully', { friendId });
    } catch (error) {
      logger.error('Failed to remove friend', { error, friendId });
      throw createUserFriendlyError(error);
    }
  },

  searchUsers: async (query: string) => {
    try {
      const results = await searchUsersFromSupabase(query);
      return results;
    } catch (error) {
      logger.error('Failed to search users', { error, query });
      throw createUserFriendlyError(error);
    }
  },

  loadConnections: async () => {
    try {
      const { connections, users } = await loadUserConnectionsFromSupabase();
      set({ connections, users });
      logger.info('Connections loaded successfully', { 
        connectionsCount: connections.length,
        usersCount: Object.keys(users).length 
      });
    } catch (error) {
      logger.error('Failed to load connections', { error });
      throw createUserFriendlyError(error);
    }
  },

  loadFriends: async () => {
    try {
      const friends = await getFriendsFromSupabase();
      set({ friends: friends as unknown as Friend[] });
      logger.info('Friends loaded successfully', { count: friends?.length || 0 });
    } catch (error) {
      logger.error('Failed to load friends', { error });
      throw createUserFriendlyError(error);
    }
  },

  loadNotifications: async () => {
    try {
      const notifications = await getNotificationsFromSupabase();
      set({ notifications });
      logger.info('Notifications loaded successfully', { count: notifications?.length || 0 });
    } catch (error) {
      logger.error('Failed to load notifications', { error });
      throw createUserFriendlyError(error);
    }
  },

  addJournalEntry: async (word: string, reflections?: string) => {
    if (!word.trim()) return;
    
    try {
      await addJournalEntryToSupabase(word, reflections);
      await get().loadJournalEntries();
      logger.info('Journal entry added successfully', { word, reflections });
    } catch (error) {
      logger.error('Failed to add journal entry', { error, word, reflections });
      throw createUserFriendlyError(error);
    }
  },

  loadJournalEntries: async () => {
    try {
      const entries = await getJournalEntriesFromSupabase();
      set({ journalEntries: entries });
      logger.info('Journal entries loaded successfully', { count: entries?.length || 0 });
    } catch (error) {
      logger.error('Failed to load journal entries', { error });
      throw createUserFriendlyError(error);
    }
  },

  processMidnight(){
    const st = get();
    const userTimezone = st.me.timezone || 'America/New_York';
    const today = getDayKeyForUser(userTimezone);
    const yesterday = ((d:Date)=>{ 
      const x=new Date(d); 
      x.setDate(x.getDate()-1); 
      return getDayKeyForUser(userTimezone, x); 
    })(new Date());

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
    if(!jr){ 
      set({ 
        journal: [...st.journal, { 
          id: `journal_${Date.now()}`,
          userId: 'me',
          date: yesterday,
          dateLocal: yesterday,
          createdAt: Date.now()
        }] 
      }); 
    }
  },

  toggleNotif(){ set({ settings: { ...get().settings, notifEnabled: !get().settings.notifEnabled } }); },
  toggleGamification: ()=> {
    const st = get();
    set({ settings: { ...st.settings, gamificationEnabled: !st.settings.gamificationEnabled } });
  },

  clearUserData: () => {
    set({
      me: { id: '', name: '' },
      users: {},
      connections: [],
      words: [],
      journal: [],
      publicWords: [],
      friendsPublicWords: [],
      currentUserPublicWord: null,
      friendRequests: { sent: [], received: [] },
      friends: [],
      notifications: [],
      journalEntries: [],
      isGuestMode: false, // Clear guest mode on sign out
    });
  },

  // Word Management System - Deletion Functions
  deletePublicWord: async (wordId: string) => {
    try {
      await deletePublicWordToSupabase(wordId);
      await get().loadPublicWords();
      await get().loadCurrentUserPublicWord(); // Refresh current user's word
      logger.info('Public word deleted successfully', { wordId });
    } catch (error) {
      logger.error('Failed to delete public word', { error, wordId });
      throw createUserFriendlyError(error);
    }
  },

  deleteDMWord: async (wordId: string) => {
    try {
      // TODO: Implement deleteDMWordToSupabase function
      // await deleteDMWordToSupabase(wordId);
      // Note: This only deletes on sender's side, receiver still sees it
      logger.info('DM word deleted successfully (sender-side only)', { wordId });
    } catch (error) {
      logger.error('Failed to delete DM word', { error, wordId });
      throw createUserFriendlyError(error);
    }
  },

  deleteJournalEntry: async (entryId: string) => {
    try {
      await deleteJournalEntryToSupabase(entryId);
      await get().loadJournalEntries();
      logger.info('Journal entry deleted successfully', { entryId });
    } catch (error) {
      logger.error('Failed to delete journal entry', { error, entryId });
      throw createUserFriendlyError(error);
    }
  },

  updateJournalEntry: async (entryId: string, word: string, reflections?: string) => {
    try {
      await updateJournalEntryToSupabase(entryId, word, reflections);
      const st = get();
      const updatedEntries = st.journalEntries.map(entry => 
        entry.id === entryId 
          ? { ...entry, word, reflections: reflections || entry.reflections, updated_at: new Date().toISOString() }
          : entry
      );
      set({ journalEntries: updatedEntries });
    } catch (error) {
      logger.error('Failed to update journal entry', { error, entryId });
      throw error;
    }
  },

  loadCurrentUserProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warn('No authenticated user found');
        return;
      }

      // Get user profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, username, is_premium, tz_name')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('Failed to load user profile', { error, userId: user.id });
        throw error;
      }

      // Update the store's me object with real data
      const updatedMe = {
        id: user.id,
        name: profile.name || 'User',
        username: profile.username || profile.name || 'user',
        email: user.email || '',
        bio: '' // No bio field in current schema
      };

      set({ me: updatedMe });
      logger.info('Current user profile loaded successfully', { userId: user.id, name: profile.name, username: profile.username });
    } catch (error) {
      logger.error('Error loading current user profile', { error });
      throw error;
    }
  },

  updateCurrentUserProfile: async (updates: { username?: string; name?: string; email?: string; bio?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Map the updates to the actual database columns
      const dbUpdates: any = {};
      if (updates.name) { // Changed from display_name to name
        dbUpdates.name = updates.name;
      }
      if (updates.username) {
        dbUpdates.username = updates.username;
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to update user profile', { error, userId: user.id });
        throw error;
      }

      // Update the store's me object
      const st = get();
      const updatedMe = {
        ...st.me,
        name: dbUpdates.name || st.me.name,
        username: dbUpdates.username || st.me.username
      };

      set({ me: updatedMe });
      logger.info('Current user profile updated successfully', { userId: user.id, updates: dbUpdates });
    } catch (error) {
      logger.error('Error updating current user profile', { error });
      throw error;
    }
  },

  setGuestMode: (isGuest: boolean) => {
    set({ isGuestMode: isGuest });
    logger.info('Guest mode updated', { isGuest });
  },

  addFriendById: async (friendId: string) => {
    try {
      await addFriendByIdToSupabase(friendId);
      await get().getFriendRequests(); // Refresh friend requests
      logger.info('Friend request sent successfully', { friendId });
    } catch (error) {
      logger.error('Failed to send friend request', { error, friendId });
      throw createUserFriendlyError(error);
    }
  },

  updateUserProfile: async (updates: { display_name?: string; username?: string; profile_visibility?: string }) => {
    try {
      await updateUserProfileToSupabase(updates);
      logger.info('User profile updated successfully', { updates });
    } catch (error) {
      logger.error('Failed to update user profile', { error, updates });
      throw createUserFriendlyError(error);
    }
  }
}), { 
  name: 'oneword-store', 
  storage: { 
    getItem: async (name: string) => {
      const value = await AsyncStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    },
    setItem: async (name: string, value: any) => {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: AsyncStorage.removeItem 
  } 
}));

// Remove the immediate bootstrap call to prevent initialization errors
// The store will be bootstrapped when it's first used