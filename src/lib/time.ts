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