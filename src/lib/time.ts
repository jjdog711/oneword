export const pad = (n:number)=> (n<10?`0${n}`:`${n}`);
export function localDateString(d=new Date()){ const y=d.getFullYear(); const m=pad(d.getMonth()+1); const day=pad(d.getDate()); return `${y}-${m}-${day}`; }
export function isPastMidnight(last:string){ return localDateString()!==last; }
export function parseHHmmToTodayISO(hhmm:string){
  const [h,m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h||0,m||0,0,0); return d.toISOString();
}

// Import the new timezone service for backward compatibility
import { TimezoneService, getEasternDate, isEasternToday } from '@/services/timezone';

// Re-export the new functions for backward compatibility
export { getEasternDate, isEasternToday };

// Legacy functions - now use the new service
export function getEasternDateTime(date: Date = new Date()): Date {
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
  return TimezoneService.isMidnightInTargetTimezone();
}

export function getEasternMidnight(date: Date = new Date()): Date {
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
  return {
    start: TimezoneService.getTodayStartInTargetTimezone(),
    end: TimezoneService.getTodayEndInTargetTimezone()
  };
}