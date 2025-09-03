import { startOfDay, addDays, isAfter, isBefore, isEqual } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime, format as tzFormat } from "date-fns-tz";

/**
 * Get a deterministic day key (YYYY-MM-DD) for a user in their timezone
 * This ensures "today" is consistent for each user regardless of server time
 */
export function getDayKeyForUser(tz: string, at: Date = new Date()): string {
  const local = utcToZonedTime(at, tz);
  const localStart = startOfDay(local);
  const asUtc = zonedTimeToUtc(localStart, tz);
  return tzFormat(asUtc, "yyyy-MM-dd");
}

/**
 * Get the UTC timestamp for midnight in the user's timezone
 * Useful for database queries and day boundary calculations
 */
export function userMidnightUtc(tz: string, at: Date = new Date()): Date {
  const local = utcToZonedTime(at, tz);
  const localStart = startOfDay(local);
  return zonedTimeToUtc(localStart, tz);
}

/**
 * Convert a UTC date to the user's local timezone
 * Useful for displaying times in user's local context
 */
export function toUserLocal(tz: string, at: Date): Date {
  return utcToZonedTime(at, tz);
}

/**
 * Format a date for display in the user's timezone
 * Defaults to YYYY-MM-DD HH:mm format
 */
export function formatForUser(tz: string, at: Date, pattern = "yyyy-MM-dd HH:mm"): string {
  return tzFormat(utcToZonedTime(at, tz), pattern, { timeZone: tz });
}

/**
 * Check if a timestamp falls within "today" for the user
 * Uses the user's timezone boundaries (midnight to midnight)
 */
export function isWithinUserToday(tz: string, at: Date = new Date()): boolean {
  const start = userMidnightUtc(tz, at);
  const nextStart = addDays(start, 1);
  return isAfter(at, start) || isEqual(at, start);
}

/**
 * Get the start and end of a user's day in UTC
 * Useful for database range queries
 */
export function getUserDayRange(tz: string, at: Date = new Date()): { start: Date; end: Date } {
  const start = userMidnightUtc(tz, at);
  const end = addDays(start, 1);
  return { start, end };
}

/**
 * Parse a time string (HH:mm) and convert it to today in the user's timezone
 * Returns UTC timestamp for scheduling purposes
 */
export function parseTimeToUserToday(tz: string, timeString: string, at: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const userLocal = utcToZonedTime(at, tz);
  const userLocalStart = startOfDay(userLocal);
  userLocalStart.setHours(hours || 0, minutes || 0, 0, 0);
  return zonedTimeToUtc(userLocalStart, tz);
}

/**
 * Check if a scheduled time has passed in the user's timezone
 * Useful for reveal logic and notifications
 */
export function isTimePassedInUserTz(tz: string, scheduledTime: Date, at: Date = new Date()): boolean {
  const userLocal = utcToZonedTime(at, tz);
  const scheduledLocal = utcToZonedTime(scheduledTime, tz);
  return isAfter(userLocal, scheduledLocal);
}

/**
 * Get the next occurrence of a time in the user's timezone
 * If the time has passed today, returns tomorrow's occurrence
 */
export function getNextOccurrenceInUserTz(tz: string, timeString: string, at: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const userLocal = utcToZonedTime(at, tz);
  const userLocalStart = startOfDay(userLocal);
  userLocalStart.setHours(hours || 0, minutes || 0, 0, 0);
  
  // If the time has passed today, move to tomorrow
  if (isBefore(userLocalStart, userLocal)) {
    userLocalStart.setDate(userLocalStart.getDate() + 1);
  }
  
  return zonedTimeToUtc(userLocalStart, tz);
}

/**
 * Get the user's current timezone offset in minutes
 * Useful for debugging and timezone validation
 */
export function getUserTimezoneOffset(tz: string, at: Date = new Date()): number {
  const utc = new Date(at.getTime() + (at.getTimezoneOffset() * 60000));
  const userLocal = utcToZonedTime(utc, tz);
  return userLocal.getTimezoneOffset();
}

/**
 * Validate if a timezone string is a valid IANA timezone
 * Throws error if invalid timezone is provided
 */
export function validateTimezone(tz: string): void {
  try {
    // Try to create a date in the timezone to validate it
    const testDate = new Date();
    utcToZonedTime(testDate, tz);
  } catch (error) {
    throw new Error(`Invalid timezone: ${tz}. Please provide a valid IANA timezone identifier.`);
  }
}

/**
 * Get a list of common timezones for user selection
 * Focuses on major cities and regions
 */
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
] as const;

/**
 * Get a user-friendly timezone label
 */
export function getTimezoneLabel(tz: string): string {
  const timezone = COMMON_TIMEZONES.find(t => t.value === tz);
  return timezone ? timezone.label : tz;
}
