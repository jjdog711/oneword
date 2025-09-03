# OneWord App - Timezone Implementation Checklist

## Overview
This document provides a complete checklist for implementing timezone hardening in the OneWord app. All changes are proposed and require approval before implementation.

## Prerequisites
- [ ] Review and approve this implementation plan
- [ ] Ensure `date-fns` dependency is available (already present: `^3.6.0`)
- [ ] Backup current database state
- [ ] Plan deployment strategy for breaking changes

## Phase 1: Dependencies & Infrastructure

### 1.1 Add date-fns-tz Dependency
**File**: `package.json`
**Change**: Add `date-fns-tz` dependency

```diff
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "2.1.2",
    "@supabase/supabase-js": "^2.56.0",
    "@tanstack/react-query": "^5.85.5",
    "@types/react": "~19.0.10",
    "date-fns": "^3.6.0",
+   "date-fns-tz": "^3.6.0",
    "eas-cli": "^16.17.4",
    "expo": "~53.0.22",
    // ... existing dependencies
  }
}
```

**Command**: `npm install date-fns-tz@^3.6.0`

### 1.2 Create Central Date Utilities
**File**: `src/lib/dates.ts` ✅ **CREATED**
**Status**: Ready for review

### 1.3 Create Database Migration
**File**: `sql/optional_add_timezone.sql` ✅ **CREATED**
**Status**: Ready for review

**Note**: This migration adds the `timezone` field to the `profiles` table with backward compatibility.

## Phase 2: Core Logic Updates

### 2.1 Update Store App Logic
**File**: `src/store/app.ts`
**Priority**: HIGH (affects daily word limits and journal entries)

```diff
- import { localDateString, parseHHmmToTodayISO } from "@/lib/time";
+ import { getDayKeyForUser, parseTimeToUserToday } from "@/lib/dates";

export const useAppStore = create<AppState>()(persist((set,get)=>({
  me: { id: '', name: '' },
  lastProcessedDate: '', // Will be set dynamically
  
  // ... existing code ...
  
  todaysJournalEntry(){
-   return get().journalEntries.find(je => je.dateLocal === today);
+   const userTimezone = get().me.timezone || 'America/New_York';
+   const today = getDayKeyForUser(userTimezone);
+   return get().journalEntries.find(je => je.dateLocal === today);
  },

  sendWord: async ({connectionId, text, reveal, time, burn}) => {
    const st = get();
    if(!isSingleWord(text)) return;
    const me = st.me.id; const c = st.connections.find(c=>c.id===connectionId);
    if(!c) return; const them = c.a===me? c.b : c.a;
-   const dateLocal = localDateString();
+   const userTimezone = st.me.timezone || 'America/New_York';
+   const dateLocal = getDayKeyForUser(userTimezone);
    
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
-       revealTime: reveal==='scheduled' ? parseHHmmToTodayISO(time||'21:00') : undefined,
+       revealTime: reveal==='scheduled' ? parseTimeToUserToday(userTimezone, time||'21:00') : undefined,
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

  // ... existing code ...

  addJournalEntry: async (word: string, reflections?: string) => {
    const st = get();
    const me = st.me.id;
-   const today = localDateString();
+   const userTimezone = st.me.timezone || 'America/New_York';
+   const today = getDayKeyForUser(userTimezone);
    
    // Check if user already has an entry today
    const existingEntry = st.journalEntries.find(je => je.dateLocal === today);
    if (existingEntry) {
      throw new AppError(
        ErrorCodes.DAILY_JOURNAL_LIMIT_EXCEEDED,
        'Daily journal limit exceeded',
        'You have already added a journal entry for today. Come back tomorrow to add another entry!',
        true
      );
    }

    try {
      // Add journal entry to Supabase
      await addJournalEntryToSupabase(word, reflections);
      
      const entry: JournalEntry = {
        id: `journal_${Date.now()}`,
        userId: me,
        dateLocal: today,
        word,
        reflections,
        createdAt: Date.now()
      };
      set({ journalEntries: [...st.journalEntries, entry] });
    } catch (error) {
      logger.error('Failed to add journal entry', { error, word });
      throw createUserFriendlyError(error);
    }
  },

  updateJournalEntry: async (word: string, reflections?: string) => {
    const st = get();
    const me = st.me.id;
-   const today = localDateString();
+   const userTimezone = st.me.timezone || 'America/New_York';
+   const today = getDayKeyForUser(userTimezone);
    
    const entry = st.journalEntries.find(je => je.dateLocal === today);
    if (!entry) {
      throw new AppError(
        ErrorCodes.JOURNAL_ENTRY_NOT_FOUND,
        'Journal entry not found',
        'No journal entry found for today. Please add an entry first.',
        true
      );
    }

    try {
      // Update journal entry in Supabase
      await updateJournalEntryToSupabase(entry.id, word, reflections);
      
      set({
        journalEntries: st.journalEntries.map(je =>
          je.dateLocal === today
            ? { ...entry, word, reflections: reflections || entry.reflections, updated_at: new Date().toISOString() }
            : je
        )
      });
    } catch (error) {
      logger.error('Failed to update journal entry', { error, word });
      throw createUserFriendlyError(error);
    }
  },

  // ... existing code ...

  processMidnight: () => {
    const st = get();
-   const today = localDateString();
+   const userTimezone = st.me.timezone || 'America/New_York';
+   const today = getDayKeyForUser(userTimezone);
    
    if (st.lastProcessedDate === today) return;
    
    // Process missed words from yesterday
-   const yesterday = ((d:Date)=>{ const x=new Date(d); x.setDate(x.getDate()-1); return localDateString(x); })(new Date());
+   const yesterday = ((d:Date)=>{ 
+     const x=new Date(d); 
+     x.setDate(x.getDate()-1); 
+     return getDayKeyForUser(userTimezone, x); 
+   })(new Date());
    
    // ... rest of midnight processing logic ...
    
    set({ lastProcessedDate: today });
  }
}));
```

### 2.2 Update Midnight Service
**File**: `src/services/midnight.ts`
**Priority**: HIGH (affects daily rollover)

```diff
import { useEffect } from "react";
import { useAppStore } from "@/store/app";
- import { localDateString } from "@/lib/time";
+ import { getDayKeyForUser } from "@/lib/dates";

export function useMidnightRollover(){
  const last = useAppStore(s=>s.lastProcessedDate);
  const process = useAppStore(s=>s.processMidnight);
+ const userTimezone = useAppStore(s=>s.me.timezone) || 'America/New_York';
  
  useEffect(()=>{ 
    // Only process if we have a valid lastProcessedDate
    if (last) {
      process(); 
    }
  },[]);
  
  useEffect(()=>{
    const id = setInterval(()=>{
-     const today = localDateString();
+     const today = getDayKeyForUser(userTimezone);
      if(today !== last && last){ 
        process(); 
      }
    }, 60_000);
    return ()=> clearInterval(id);
-  },[last]);
+  },[last, userTimezone]);
}
```

### 2.3 Update Time Utilities
**File**: `src/lib/time.ts`
**Priority**: MEDIUM (consolidate with new system)

```diff
export const pad = (n:number)=> (n<10?`0${n}`:`${n}`);

// DEPRECATED: Use @/lib/dates instead
// These functions will be removed after migration
export function localDateString(d=new Date()){ 
  console.warn('localDateString is deprecated. Use getDayKeyForUser from @/lib/dates instead.');
  const y=d.getFullYear(); const m=pad(d.getMonth()+1); const day=pad(d.getDate()); 
  return `${y}-${m}-${day}`; 
}

export function isPastMidnight(last:string){ 
  console.warn('isPastMidnight is deprecated. Use isWithinUserToday from @/lib/dates instead.');
  return localDateString()!==last; 
}

export function parseHHmmToTodayISO(hhmm:string){
  console.warn('parseHHmmToTodayISO is deprecated. Use parseTimeToUserToday from @/lib/dates instead.');
  const [h,m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h||0,m||0,0,0); return d.toISOString();
}

// Import the new timezone service for backward compatibility
import { TimezoneService, getEasternDate, isEasternToday } from '@/services/timezone';

// Re-export the new functions for backward compatibility
export { getEasternDate, isEasternToday };

// Legacy functions - now use the new service
export function getEasternDateTime(date: Date = new Date()): Date {
  console.warn('getEasternDateTime is deprecated. Use toUserLocal from @/lib/dates instead.');
  try {
    // Convert to Eastern Time
    const easternTime = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
    return easternTime;
  } catch (error) {
    console.error('Error getting Eastern date time:', error);
    // Fallback to original date if timezone conversion fails
    return date;
  }
}

export function isEasternMidnight(date: Date = new Date()): boolean {
  console.warn('isEasternMidnight is deprecated. Use userMidnightUtc from @/lib/dates instead.');
  return TimezoneService.isMidnightInTargetTimezone();
}

export function getEasternMidnight(date: Date = new Date()): Date {
  console.warn('getEasternMidnight is deprecated. Use userMidnightUtc from @/lib/dates instead.');
  try {
    const easternTime = getEasternDateTime(date);
    easternTime.setHours(0, 0, 0, 0);
    return easternTime;
  } catch (error) {
    console.error('Error getting Eastern midnight:', error);
    // Fallback to local midnight
    const localMidnight = new Date(date);
    localMidnight.setHours(0, 0, 0, 0);
    return localMidnight;
  }
}

// Get the start and end of today in Eastern Time (for database queries)
export function getEasternTodayRange(): { start: string; end: string } {
  console.warn('getEasternTodayRange is deprecated. Use getUserDayRange from @/lib/dates instead.');
  return {
    start: TimezoneService.getTodayStartInTargetTimezone(),
    end: TimezoneService.getTodayEndInTargetTimezone()
  };
}
```

### 2.4 Update Reveal Logic
**File**: `src/lib/reveal.ts`
**Priority**: MEDIUM (affects word reveal scheduling)

```diff
- import { localDateString } from "@/lib/time";
+ import { getDayKeyForUser, isTimePassedInUserTz } from "@/lib/dates";

export function getRevealStatus(word: Word): 'REVEALED' | 'SCHEDULED' | 'MUTUAL_PENDING' {
- const today = localDateString();
+ // Note: This function needs user timezone context
+ // For now, use default timezone, but this should be updated to accept user timezone
+ const userTimezone = 'America/New_York'; // TODO: Get from user context
+ const today = getDayKeyForUser(userTimezone);

  if (word.reveal === 'instant') return 'REVEALED';
  if (word.reveal === 'mutual') return 'MUTUAL_PENDING';
  
  if (word.reveal === 'scheduled' && word.revealTime) {
-   if(Date.now()<t) return 'SCHEDULED';
+   if(!isTimePassedInUserTz(userTimezone, word.revealTime)) return 'SCHEDULED';
    return 'REVEALED';
  }
  
  return 'REVEALED';
}
```

## Phase 3: Service Layer Updates

### 3.1 Update Supabase Service
**File**: `src/services/supabase.ts`
**Priority**: HIGH (affects database operations)

```diff
- import { TimezoneService } from './timezone';
+ import { getDayKeyForUser } from '@/lib/dates';

// ... existing code ...

export const getCurrentUserPublicWord = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view your public word.',
        true
      );
    }

    const userId = userData.user.id;
    
    // Get user's timezone from profile
+   const { data: profile, error: profileError } = await supabase
+     .from('profiles')
+     .select('timezone')
+     .eq('id', userId)
+     .single();
+   
+   if (profileError) {
+     logger.warn('Failed to get user timezone, using default', { error: profileError });
+   }
+   
+   const userTimezone = profile?.timezone || 'America/New_York';
-   const today = TimezoneService.getTodayInTargetTimezone();
+   const today = getDayKeyForUser(userTimezone);

    // ... rest of function ...
  }, 'getCurrentUserPublicWord');
};

export const getJournalEntries = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view journal entries.',
        true
      );
    }

    const userId = userData.user.id;
    
    // Get user's timezone from profile
+   const { data: profile, error: profileError } = await supabase
+     .from('profiles')
+     .select('timezone')
+     .eq('id', userId)
+     .single();
+   
+   if (profileError) {
+     logger.warn('Failed to get user timezone, using default', { error: profileError });
+   }
+   
+   const userTimezone = profile?.timezone || 'America/New_York';
-   const today = TimezoneService.getTodayInTargetTimezone();
+   const today = getDayKeyForUser(userTimezone);

    // ... rest of function ...
  }, 'getJournalEntries');
};

export const addJournalEntry = async (word: string, reflections?: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to add journal entries.',
        true
      );
    }

    const userId = userData.user.id;
    
    // Get user's timezone from profile
+   const { data: profile, error: profileError } = await supabase
+     .from('profiles')
+     .select('timezone')
+     .eq('id', userId)
+     .single();
+   
+   if (profileError) {
+     logger.warn('Failed to get user timezone, using default', { error: profileError });
+   }
+   
+   const userTimezone = profile?.timezone || 'America/New_York';
-   const today = TimezoneService.getTodayInTargetTimezone();
+   const today = getDayKeyForUser(userTimezone);

    // ... rest of function ...
  }, 'addJournalEntry');
};
```

### 3.2 Update DM Service
**File**: `src/services/dm.ts`
**Priority**: LOW (affects display only)

```diff
- import { TimezoneService } from './timezone';
+ import { getDayKeyForUser } from '@/lib/dates';

// ... existing code ...

export const getOrCreateConversation = async (friendId: string): Promise<string> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to start a conversation.',
        true
      );
    }

    const userId = userData.user.id;
    
    // Get user's timezone from profile
+   const { data: profile, error: profileError } = await supabase
+     .from('profiles')
+     .select('timezone')
+     .eq('id', userId)
+     .single();
+   
+   if (profileError) {
+     logger.warn('Failed to get user timezone, using default', { error: profileError });
+   }
+   
+   const userTimezone = profile?.timezone || 'America/New_York';
-   const today = TimezoneService.getTodayInTargetTimezone();
+   const today = getDayKeyForUser(userTimezone);

    // ... rest of function ...
  }, 'getOrCreateConversation');
};
```

## Phase 4: UI Layer Updates

### 4.1 Update Me Screen
**File**: `app/(tabs)/me.tsx`
**Priority**: LOW (display formatting only)

```diff
// ... existing imports ...
+ import { formatForUser } from '@/lib/dates';

export default function MeScreen() {
  // ... existing code ...
  
+ const userTimezone = useAppStore(s => s.me.timezone) || 'America/New_York';
  
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'unknown date';
    }
    
    const date = new Date(dateString);
    
    // Check if the date is valid (not NaN and not the Unix epoch)
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      return 'unknown date';
    }
    
+   // Use timezone-aware formatting
+   try {
+     return formatForUser(userTimezone, date, 'MM-dd-yy');
+   } catch (error) {
+     // Fallback to original formatting if timezone conversion fails
+     const month = (date.getMonth() + 1).toString().padStart(2, '0');
+     const day = date.getDate().toString().padStart(2, '0');
+     const year = date.getFullYear().toString().slice(-2);
+     return `${month}-${day}-${year}`;
+   }
-   const month = (date.getMonth() + 1).toString().padStart(2, '0');
-   const day = date.getDate().toString().padStart(2, '0');
-   const year = date.getFullYear().toString().slice(-2);
-   return `${month}-${day}-${year}`;
  };

  // ... rest of component ...
}
```

### 4.2 Update Friends Screen
**File**: `app/(tabs)/friends.tsx`
**Priority**: LOW (display formatting only)

```diff
// ... existing imports ...
+ import { formatForUser } from '@/lib/dates';

export default function FriendsScreen() {
  // ... existing code ...
  
+ const userTimezone = useAppStore(s => s.me.timezone) || 'America/New_York';
  
  const formatTime = (timestamp: string | number) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
+     // Use timezone-aware formatting
+     return formatForUser(userTimezone, date, 'HH:mm');
    } catch (error) {
      // Fallback to original formatting if timezone conversion fails
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
  };

  // ... rest of component ...
}
```

## Phase 5: Testing & Validation

### 5.1 Jest Tests
**File**: `src/lib/dates.test.ts` ✅ **CREATED**
**Status**: Ready for review

### 5.2 Manual Testing Checklist
- [ ] Test daily word limits in different timezones
- [ ] Test journal entry daily limits in different timezones
- [ ] Test midnight rollover in different timezones
- [ ] Test DST transitions (spring forward, fall back)
- [ ] Test year boundaries (Dec 31 → Jan 1)
- [ ] Test leap year handling (Feb 29)
- [ ] Test timezone validation and error handling
- [ ] Test fallback to UTC when timezone conversion fails

## Phase 6: Database Migration

### 6.1 Run Migration
**File**: `sql/optional_add_timezone.sql` ✅ **CREATED**
**Status**: Ready for review

**Commands**:
```bash
# Apply the migration
npx supabase db push

# Verify the changes
npx supabase db diff
```

### 6.2 Update Existing Users
**SQL Command**:
```sql
-- Update existing users to have proper timezone
UPDATE profiles SET timezone = 'America/New_York' WHERE timezone IS NULL;

-- Verify the update
SELECT COUNT(*) as users_with_timezone FROM profiles WHERE timezone IS NOT NULL;
```

## Phase 7: Cleanup & Documentation

### 7.1 Remove Deprecated Functions
After all functionality is migrated and tested:
- [ ] Remove deprecated functions from `src/lib/time.ts`
- [ ] Remove `src/services/timezone.ts` (if no longer needed)
- [ ] Update all imports to use new date utilities

### 7.2 Update Documentation
- [ ] Update README.md with timezone information
- [ ] Update API documentation
- [ ] Create migration guide for developers

## Risk Assessment

### High Risk Changes
1. **Daily Logic Updates**: Changes to word limits and journal entries
2. **Database Schema**: Adding timezone field to profiles table
3. **Core Store Logic**: Updates to app state management

### Medium Risk Changes
1. **Service Layer**: Updates to Supabase service functions
2. **UI Formatting**: Changes to date display logic

### Low Risk Changes
1. **Dependency Addition**: Adding `date-fns-tz`
2. **New Utility Functions**: Adding new date utility functions

## Rollback Plan

### Database Rollback
```sql
-- Remove timezone column (if needed)
ALTER TABLE profiles DROP COLUMN IF EXISTS timezone;

-- Restore original handle_new_user function
-- (restore from backup or previous migration)
```

### Code Rollback
- Revert all file changes to previous state
- Remove `date-fns-tz` dependency
- Restore original date logic functions

## Success Criteria

- [ ] All daily logic uses user timezone consistently
- [ ] Daily word limits work correctly in different timezones
- [ ] Journal entries respect user timezone boundaries
- [ ] Midnight rollover works correctly in all timezones
- [ ] DST transitions are handled properly
- [ ] All tests pass
- [ ] No breaking changes for existing users
- [ ] Performance impact is minimal

## Timeline Estimate

- **Phase 1-2**: 2-3 days (dependencies, core logic)
- **Phase 3**: 1-2 days (service layer)
- **Phase 4**: 1 day (UI updates)
- **Phase 5**: 2-3 days (testing)
- **Phase 6**: 1 day (database migration)
- **Phase 7**: 1 day (cleanup)

**Total Estimated Time**: 8-11 days

## Approval Required

**Before proceeding with implementation, please confirm:**
- [ ] Review and approve this implementation plan
- [ ] Confirm database migration approach
- [ ] Confirm testing strategy
- [ ] Confirm deployment timeline
- [ ] Confirm rollback procedures
