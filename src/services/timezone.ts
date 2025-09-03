// Timezone service for consistent daily reset handling
// Following real-world best practices for timezone management

export const TIMEZONE_CONFIG = {
  TARGET_TIMEZONE: 'America/New_York',
  DAILY_RESET_HOUR: 0, // Midnight
  DAILY_RESET_MINUTE: 0
} as const;

export class TimezoneService {
  private static readonly TARGET_TIMEZONE = TIMEZONE_CONFIG.TARGET_TIMEZONE;
  
  /**
   * Get today's date in the target timezone (Eastern Time)
   * Returns YYYY-MM-DD format
   */
  static getTodayInTargetTimezone(): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
        timeZone: this.TARGET_TIMEZONE,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit'
      }).format(new Date());
    } catch (error) {
      console.error('Error getting today in target timezone:', error);
      // Fallback to UTC if timezone conversion fails
      return new Date().toISOString().slice(0, 10);
    }
  }
  
  /**
   * Check if a timestamp is from today in the target timezone
   */
  static isTimestampTodayInTargetTimezone(timestamp: string | Date): boolean {
    try {
      const date = new Date(timestamp);
      const dateInTargetTZ = new Intl.DateTimeFormat('en-CA', {
        timeZone: this.TARGET_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
      
      return dateInTargetTZ === this.getTodayInTargetTimezone();
    } catch (error) {
      console.error('Error checking if timestamp is today:', error);
      return false;
    }
  }
  
  /**
   * Get the start of today in target timezone (for database queries)
   */
  static getTodayStartInTargetTimezone(): string {
    try {
      const today = this.getTodayInTargetTimezone();
      return `${today}T00:00:00-04:00`; // Eastern Time (EDT)
    } catch (error) {
      console.error('Error getting today start:', error);
      return new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
    }
  }
  
  /**
   * Get the end of today in target timezone (for database queries)
   */
  static getTodayEndInTargetTimezone(): string {
    try {
      const today = this.getTodayInTargetTimezone();
      return `${today}T23:59:59-04:00`; // Eastern Time (EDT)
    } catch (error) {
      console.error('Error getting today end:', error);
      return new Date().toISOString().slice(0, 10) + 'T23:59:59Z';
    }
  }
  
  /**
   * Convert a UTC timestamp to target timezone date
   */
  static convertUTCToTargetTimezoneDate(utcTimestamp: string | Date): string {
    try {
      const date = new Date(utcTimestamp);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: this.TARGET_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error converting UTC to target timezone:', error);
      return new Date(utcTimestamp).toISOString().slice(0, 10);
    }
  }
  
  /**
   * Check if it's currently midnight in target timezone
   */
  static isMidnightInTargetTimezone(): boolean {
    try {
      const now = new Date();
      const targetTime = new Intl.DateTimeFormat('en-US', {
        timeZone: this.TARGET_TIMEZONE,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).format(now);
      
      return targetTime === '0:0' || targetTime === '00:00';
    } catch (error) {
      console.error('Error checking midnight in target timezone:', error);
      return false;
    }
  }
  
  /**
   * Get time until next daily reset in target timezone
   */
  static getTimeUntilNextReset(): number {
    try {
      const now = new Date();
      const targetNow = new Date(now.toLocaleString('en-US', { timeZone: this.TARGET_TIMEZONE }));
      const tomorrow = new Date(targetNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      return tomorrow.getTime() - targetNow.getTime();
    } catch (error) {
      console.error('Error calculating time until reset:', error);
      return 24 * 60 * 60 * 1000; // 24 hours as fallback
    }
  }
}

// Convenience functions for backward compatibility
export const getEasternDate = (date: Date = new Date()): string => {
  return TimezoneService.convertUTCToTargetTimezoneDate(date);
};

export const isEasternToday = (dateString: string): boolean => {
  return dateString === TimezoneService.getTodayInTargetTimezone();
};
