# OneWord App - Timezone Guidelines

## Overview
This document provides guidelines for handling dates and times in the OneWord app. The app uses timezone-aware date handling to ensure that "daily" logic (word limits, journal entries, reveal windows) is consistent for each user regardless of their location.

## Core Principles

### 1. **Always Use `src/lib/dates.ts` Helpers**
- **Never** use `new Date()`, `Date.now()`, or `.toISOString()` directly for daily logic
- **Always** use the centralized date utilities for timezone-aware operations
- **Import** from `@/lib/dates` for all date/time operations

### 2. **Definition of "Today"**
- "Today" is defined by the user's timezone, not server time
- A user's day starts at midnight in their local timezone
- Day boundaries are calculated using `getDayKeyForUser(userTimezone)`
- All daily limits and rollovers use this definition

### 3. **How to Store Times**
- **Database**: Always store timestamps in UTC (`TIMESTAMPTZ`)
- **Date strings**: Use `YYYY-MM-DD` format for date-only values
- **Time strings**: Use `HH:mm` format for time-only values
- **Never** store local time strings or timezone offsets

### 4. **How to Display Times**
- **User-facing dates**: Use `formatForUser(userTimezone, utcDate, pattern)`
- **Date comparisons**: Use `isWithinUserToday(userTimezone, utcDate)`
- **Day boundaries**: Use `getUserDayRange(userTimezone, utcDate)`

## Implementation Guidelines

### Daily Logic Functions

#### `getDayKeyForUser(timezone, date?)`
```typescript
// ✅ Correct: Get today's date key for user
const today = getDayKeyForUser(userTimezone);

// ❌ Wrong: Don't use local time
const today = new Date().toISOString().split('T')[0];
```

#### `userMidnightUtc(timezone, date?)`
```typescript
// ✅ Correct: Get UTC timestamp for user's midnight
const userMidnight = userMidnightUtc(userTimezone);

// ❌ Wrong: Don't assume server midnight
const midnight = new Date();
midnight.setHours(0, 0, 0, 0);
```

#### `isWithinUserToday(timezone, date?)`
```typescript
// ✅ Correct: Check if timestamp is within user's today
const isToday = isWithinUserToday(userTimezone, timestamp);

// ❌ Wrong: Don't compare with local date
const isToday = new Date(timestamp).toDateString() === new Date().toDateString();
```

### Word Send Logic
```typescript
// ✅ Correct: Use user timezone for daily limits
const today = getDayKeyForUser(userTimezone);
const existing = words.find(w => 
  w.senderId === userId && 
  w.receiverId === receiverId && 
  w.dateLocal === today
);

// ❌ Wrong: Using local time
const today = localDateString();
```

### Journal Entry Logic
```typescript
// ✅ Correct: Check if user already has entry today
const today = getDayKeyForUser(userTimezone);
const hasEntryToday = journalEntries.some(entry => 
  entry.dateLocal === today
);

// ❌ Wrong: Using server time
const today = new Date().toISOString().split('T')[0];
```

### Reveal Scheduling
```typescript
// ✅ Correct: Parse time in user's timezone
const revealTime = parseTimeToUserToday(userTimezone, '21:00');

// ❌ Wrong: Assuming local time
const revealTime = new Date();
revealTime.setHours(21, 0, 0, 0);
```

## Timezone Selection

### User Timezone Field
- **Field**: `profiles.timezone`
- **Type**: `TEXT` (IANA timezone identifier)
- **Default**: `'America/New_York'` (for backward compatibility)
- **Validation**: Must be valid IANA timezone string

### Common Timezones
```typescript
import { COMMON_TIMEZONES } from '@/lib/dates';

// Available options:
// - UTC
// - America/New_York (Eastern Time)
// - America/Chicago (Central Time)
// - America/Denver (Mountain Time)
// - America/Los_Angeles (Pacific Time)
// - Europe/London (GMT/BST)
// - Europe/Paris (CET/CEST)
// - Asia/Tokyo (JST)
// - Asia/Shanghai (CST)
// - Australia/Sydney (AEST/AEDT)
```

### Timezone Validation
```typescript
import { validateTimezone } from '@/lib/dates';

// ✅ Always validate user-provided timezones
try {
  validateTimezone(userTimezone);
} catch (error) {
  // Handle invalid timezone
  console.error('Invalid timezone:', error.message);
}
```

## Migration Strategy

### Phase 1: Add Timezone Support
1. Add `timezone` field to `profiles` table
2. Deploy new date utilities alongside existing ones
3. Update user registration to set default timezone

### Phase 2: Gradual Migration
1. Update core daily logic functions one by one
2. Test thoroughly after each change
3. Monitor for any timezone-related issues

### Phase 3: Cleanup
1. Remove old timezone-unaware functions
2. Update all remaining date logic
3. Remove backward compatibility code

## Testing Guidelines

### Timezone Edge Cases
- **DST Transitions**: Test spring forward and fall back
- **Day Boundaries**: Test midnight rollovers in different timezones
- **Year Boundaries**: Test December 31 → January 1 transitions
- **Leap Years**: Test February 29 handling

### Test Data
```typescript
// Use consistent test dates
const testDate = new Date('2024-01-15T12:00:00Z'); // UTC noon

// Test different timezones
const timezones = ['UTC', 'America/New_York', 'Asia/Tokyo'];

// Test edge cases
const edgeCases = [
  new Date('2024-03-10T02:30:00Z'), // Spring forward
  new Date('2024-11-03T02:30:00Z'), // Fall back
  new Date('2024-12-31T23:30:00Z'), // Year boundary
];
```

## Common Pitfalls

### 1. **Mixing Timezone Logic**
```typescript
// ❌ Wrong: Mixing timezone-aware and local functions
const today = getDayKeyForUser(userTimezone);
const localTime = new Date().toLocaleString();

// ✅ Correct: Consistent timezone usage
const today = getDayKeyForUser(userTimezone);
const userTime = formatForUser(userTimezone, new Date());
```

### 2. **Assuming Server Timezone**
```typescript
// ❌ Wrong: Server timezone assumptions
const serverMidnight = new Date();
serverMidnight.setHours(0, 0, 0, 0);

// ✅ Correct: User timezone midnight
const userMidnight = userMidnightUtc(userTimezone);
```

### 3. **Hardcoding Timezone Offsets**
```typescript
// ❌ Wrong: Hardcoded offsets
const easternTime = new Date(utcTime.getTime() - (5 * 60 * 60 * 1000));

// ✅ Correct: Use timezone utilities
const easternTime = toUserLocal('America/New_York', utcTime);
```

## Performance Considerations

### Database Queries
- Use `getUserDayRange()` for date range queries
- Index on `date_local` field for performance
- Consider timezone-aware database functions for complex queries

### Caching
- Cache user timezone preferences
- Cache calculated day boundaries
- Invalidate cache when user changes timezone

## Error Handling

### Invalid Timezones
```typescript
try {
  const today = getDayKeyForUser(userTimezone);
} catch (error) {
  // Fallback to UTC if timezone is invalid
  const today = getDayKeyForUser('UTC');
  logger.warn('Invalid timezone, falling back to UTC', { userTimezone, error });
}
```

### Timezone Conversion Failures
```typescript
try {
  const userTime = formatForUser(userTimezone, utcDate);
} catch (error) {
  // Fallback to UTC formatting
  const userTime = formatForUser('UTC', utcDate);
  logger.error('Timezone conversion failed', { userTimezone, error });
}
```

## Future Considerations

### User Preferences
- Allow users to change timezone in settings
- Remember timezone preference across devices
- Support automatic timezone detection

### Notifications
- Schedule notifications based on user timezone
- Handle timezone changes for existing notifications
- Support multiple timezone preferences

### Internationalization
- Format dates according to user locale
- Support 12/24 hour time preferences
- Handle different date formats (MM/DD vs DD/MM)

## Resources

### IANA Timezone Database
- [List of IANA timezone identifiers](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [Timezone abbreviations](https://en.wikipedia.org/wiki/List_of_time_zone_abbreviations)

### Date-fns Documentation
- [date-fns timezone functions](https://date-fns.org/v3.6.0/docs/zonedTimeToUtc)
- [Formatting patterns](https://date-fns.org/v3.6.0/docs/format)

### Testing Resources
- [Jest timezone testing](https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom)
- [Timezone edge case examples](https://www.timeanddate.com/time/dst/2024.html)
