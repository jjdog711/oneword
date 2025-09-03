# OneWord App - Timezone Audit

## Overview
This document identifies all date/time usage in the OneWord app that affects daily cycles, including word send cutoffs, reveal windows, journaling, and notification scheduling.

## Audit Scope
**Included**: Logic relevant to daily cycles (cutoffs, reveals, journals, notifications)
**Excluded**: Trivial uses (logging, display-only formatting, analytics timestamps)

## Current Timezone State
- **Hardcoded**: App currently uses `America/New_York` timezone everywhere
- **Mixed Logic**: Some functions use local time, others use Eastern time
- **No User Choice**: All users forced into Eastern time regardless of location
- **Database**: Supabase functions hardcoded to Eastern time

## Affected Files & Daily Logic

### 1. **src/store/app.ts** - Core Daily Logic
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 82 | `lastProcessedDate: localDateString()` | Track last processed date | Uses local time, not user timezone |
| 128 | `return localDateString(d);` | Get date string for specific date | Uses local time, not user timezone |
| 133 | `date!==localDateString()` | Check if date is today | Uses local time, not user timezone |
| 158 | `const today = localDateString();` | Get today's date for word limits | Uses local time, not user timezone |
| 167 | `const dateLocal = localDateString();` | Set word date for daily limit | Uses local time, not user timezone |
| 389 | `const today = localDateString();` | Get today for journal entries | Uses local time, not user timezone |
| 390 | `const yesterday = ((d:Date)=>{ const x=new Date(d); x.setDate(x.getDate()-1); return localDateString(x); })(new Date());` | Get yesterday for journal | Uses local time, not user timezone |

### 2. **src/services/midnight.ts** - Midnight Rollover
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 17 | `const today = localDateString();` | Check if midnight passed | Uses local time, not user timezone |

### 3. **src/lib/time.ts** - Date Utilities
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 2 | `export function localDateString(d=new Date()){ const y=d.getFullYear(); const m=pad(d.getMonth()+1); const day=pad(d.getDate()); return `${y}-${m}-${day}`; }` | Generate date string | Uses local time, not user timezone |
| 3 | `export function isPastMidnight(last:string){ return localDateString()!==last; }` | Check midnight rollover | Uses local time, not user timezone |
| 4 | `export function parseHHmmToTodayISO(hhmm:string){ const [h,m] = hhmm.split(":").map(Number); const d = new Date(); d.setHours(h||0,m||0,0,0); return d.toISOString(); }` | Parse time to today's ISO | Uses local time, not user timezone |

### 4. **src/services/timezone.ts** - Timezone Service
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 16 | `static getTodayInTargetTimezone(): string` | Get today in Eastern time | Hardcoded to Eastern, not user timezone |
| 34 | `static isTimestampTodayInTargetTimezone(timestamp: string \| Date): boolean` | Check if timestamp is today | Hardcoded to Eastern, not user timezone |
| 56 | `const today = this.getTodayInTargetTimezone();` | Get today for database queries | Hardcoded to Eastern, not user timezone |
| 69 | `const today = this.getTodayInTargetTimezone();` | Get today for database queries | Hardcoded to Eastern, not user timezone |

### 5. **src/services/supabase.ts** - Database Operations
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 101 | `const today = TimezoneService.getTodayInTargetTimezone();` | Get today for word queries | Hardcoded to Eastern, not user timezone |
| 174 | `const today = TimezoneService.getTodayInTargetTimezone();` | Get today for journal queries | Hardcoded to Eastern, not user timezone |
| 885 | `p_date_local: TimezoneService.getTodayInTargetTimezone()` | Set journal entry date | Hardcoded to Eastern, not user timezone |

### 6. **src/lib/reveal.ts** - Word Reveal Logic
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 6 | `const today = localDateString();` | Get today for reveal logic | Uses local time, not user timezone |
| 13 | `if(Date.now()<t) return 'SCHEDULED';` | Check if reveal time passed | Uses UTC time, should use user timezone |

### 7. **app/(tabs)/me.tsx** - Journal Display
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 75 | `formatDate(dateString)` | Format journal entry dates | Display only, but affects user experience |

### 8. **app/(tabs)/friends.tsx** - Word Display
| Line | Snippet | Intent | Current Issue |
|------|---------|---------|---------------|
| 198 | `new Date(currentUserPublicWord.createdAt).toISOString()` | Convert timestamp to ISO | Display only, but affects user experience |

## Database Functions (Proposed Changes Only)
The following Supabase functions are hardcoded to Eastern time and would need updates:

- `get_today_in_target_timezone()` → `get_today_in_user_timezone(user_timezone)`
- `is_timestamp_today_in_target_timezone()` → `is_timestamp_today_in_user_timezone(timestamp, user_timezone)`
- `get_public_words_today()` → `get_public_words_today_in_user_timezone(user_timezone)`
- `get_user_public_word_today()` → `get_user_public_word_today_in_user_timezone(user_uuid, user_timezone)`
- `has_user_sent_word_today()` → `has_user_sent_word_today_in_user_timezone(user_uuid, receiver_uuid, user_timezone)`

## Impact Assessment
- **High Impact**: Daily word limits, journal entries, midnight rollover
- **Medium Impact**: Word reveal scheduling, friend word display
- **Low Impact**: Date formatting, logging timestamps

## Migration Complexity
- **Core Logic**: High - affects fundamental daily behavior
- **Database**: Medium - requires function updates and data migration
- **UI**: Low - mostly display formatting changes
- **Testing**: High - need comprehensive timezone edge case testing
