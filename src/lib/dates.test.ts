import {
  getDayKeyForUser,
  userMidnightUtc,
  toUserLocal,
  formatForUser,
  isWithinUserToday,
  getUserDayRange,
  parseTimeToUserToday,
  isTimePassedInUserTz,
  getNextOccurrenceInUserTz,
  getUserTimezoneOffset,
  validateTimezone,
  COMMON_TIMEZONES,
  getTimezoneLabel
} from './dates';

// Mock date for consistent testing
const mockDate = new Date('2024-01-15T12:00:00Z'); // UTC noon on Jan 15, 2024

describe('Date Utilities - Timezone Handling', () => {
  beforeEach(() => {
    // Mock Date.now() to return consistent timestamp
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDayKeyForUser', () => {
    it('should return correct day key for UTC timezone', () => {
      const result = getDayKeyForUser('UTC', mockDate);
      expect(result).toBe('2024-01-15');
    });

    it('should return correct day key for Eastern timezone', () => {
      const result = getDayKeyForUser('America/New_York', mockDate);
      // Jan 15, 2024 at 12:00 UTC is Jan 15, 2024 at 7:00 AM Eastern
      expect(result).toBe('2024-01-15');
    });

    it('should return correct day key for Tokyo timezone', () => {
      const result = getDayKeyForUser('Asia/Tokyo', mockDate);
      // Jan 15, 2024 at 12:00 UTC is Jan 15, 2024 at 9:00 PM Tokyo
      expect(result).toBe('2024-01-15');
    });

    it('should handle day boundary correctly for Eastern timezone', () => {
      // Test at 23:30 UTC on Jan 15 (18:30 Eastern on Jan 15)
      const eveningDate = new Date('2024-01-15T23:30:00Z');
      const result = getDayKeyForUser('America/New_York', eveningDate);
      expect(result).toBe('2024-01-15');
    });

    it('should handle day boundary correctly for Tokyo timezone', () => {
      // Test at 23:30 UTC on Jan 15 (08:30 Tokyo on Jan 16)
      const eveningDate = new Date('2024-01-15T23:30:00Z');
      const result = getDayKeyForUser('Asia/Tokyo', eveningDate);
      expect(result).toBe('2024-01-16');
    });
  });

  describe('userMidnightUtc', () => {
    it('should return UTC timestamp for midnight in user timezone', () => {
      const result = userMidnightUtc('America/New_York', mockDate);
      // Should return UTC timestamp for 00:00 Eastern on Jan 15
      expect(result.getTime()).toBeLessThan(mockDate.getTime());
    });

    it('should handle different timezones correctly', () => {
      const easternMidnight = userMidnightUtc('America/New_York', mockDate);
      const tokyoMidnight = userMidnightUtc('Asia/Tokyo', mockDate);
      
      // Tokyo midnight should be different from Eastern midnight
      expect(easternMidnight.getTime()).not.toBe(tokyoMidnight.getTime());
    });
  });

  describe('toUserLocal', () => {
    it('should convert UTC to user local time', () => {
      const result = toUserLocal('America/New_York', mockDate);
      // Jan 15, 2024 at 12:00 UTC should be Jan 15, 2024 at 7:00 AM Eastern
      expect(result.getHours()).toBe(7);
    });

    it('should handle different timezones correctly', () => {
      const easternTime = toUserLocal('America/New_York', mockDate);
      const tokyoTime = toUserLocal('Asia/Tokyo', mockDate);
      
      expect(easternTime.getHours()).toBe(7); // 7 AM Eastern
      expect(tokyoTime.getHours()).toBe(21); // 9 PM Tokyo
    });
  });

  describe('formatForUser', () => {
    it('should format date in user timezone', () => {
      const result = formatForUser('America/New_York', mockDate);
      expect(result).toMatch(/2024-01-15 07:00/);
    });

    it('should use custom format pattern', () => {
      const result = formatForUser('America/New_York', mockDate, 'MM/dd/yyyy HH:mm');
      expect(result).toMatch(/01\/15\/2024 07:00/);
    });

    it('should handle different timezones correctly', () => {
      const easternFormat = formatForUser('America/New_York', mockDate);
      const tokyoFormat = formatForUser('Asia/Tokyo', mockDate);
      
      expect(easternFormat).toMatch(/07:00/);
      expect(tokyoFormat).toMatch(/21:00/);
    });
  });

  describe('isWithinUserToday', () => {
    it('should return true for current time in user timezone', () => {
      const result = isWithinUserToday('America/New_York', mockDate);
      expect(result).toBe(true);
    });

    it('should return false for time outside user day', () => {
      // Test with a time that's clearly not today in Eastern time
      const tomorrowDate = new Date('2024-01-16T12:00:00Z');
      const result = isWithinUserToday('America/New_York', tomorrowDate);
      expect(result).toBe(false);
    });
  });

  describe('getUserDayRange', () => {
    it('should return correct day range for user timezone', () => {
      const { start, end } = getUserDayRange('America/New_York', mockDate);
      
      expect(start.getTime()).toBeLessThan(mockDate.getTime());
      expect(end.getTime()).toBeGreaterThan(mockDate.getTime());
      
      // End should be exactly 24 hours after start
      expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('parseTimeToUserToday', () => {
    it('should parse time string to today in user timezone', () => {
      const result = parseTimeToUserToday('America/New_York', '14:30', mockDate);
      
      // Should return UTC timestamp for 2:30 PM Eastern on Jan 15
      expect(result.getTime()).toBeGreaterThan(mockDate.getTime());
    });

    it('should handle midnight correctly', () => {
      const result = parseTimeToUserToday('America/New_York', '00:00', mockDate);
      const easternMidnight = userMidnightUtc('America/New_York', mockDate);
      
      expect(result.getTime()).toBe(easternMidnight.getTime());
    });
  });

  describe('isTimePassedInUserTz', () => {
    it('should return true for past time in user timezone', () => {
      const pastTime = new Date('2024-01-15T06:00:00Z'); // 1 AM Eastern
      const result = isTimePassedInUserTz('America/New_York', pastTime, mockDate);
      expect(result).toBe(true);
    });

    it('should return false for future time in user timezone', () => {
      const futureTime = new Date('2024-01-15T18:00:00Z'); // 1 PM Eastern
      const result = isTimePassedInUserTz('America/New_York', futureTime, mockDate);
      expect(result).toBe(false);
    });
  });

  describe('getNextOccurrenceInUserTz', () => {
    it('should return today if time has not passed', () => {
      const result = getNextOccurrenceInUserTz('America/New_York', '18:00', mockDate);
      // 6 PM Eastern hasn't passed yet (it's 7 AM Eastern)
      expect(result.getDate()).toBe(15);
    });

    it('should return tomorrow if time has passed today', () => {
      const result = getNextOccurrenceInUserTz('America/New_York', '06:00', mockDate);
      // 6 AM Eastern has passed (it's 7 AM Eastern), so return tomorrow
      expect(result.getDate()).toBe(16);
    });
  });

  describe('getUserTimezoneOffset', () => {
    it('should return timezone offset in minutes', () => {
      const result = getUserTimezoneOffset('America/New_York', mockDate);
      // January is EST (UTC-5), so offset should be 300 minutes
      expect(result).toBe(300);
    });

    it('should handle different timezones', () => {
      const easternOffset = getUserTimezoneOffset('America/New_York', mockDate);
      const tokyoOffset = getUserTimezoneOffset('Asia/Tokyo', mockDate);
      
      expect(easternOffset).toBe(300); // EST
      expect(tokyoOffset).toBe(-540); // JST (UTC+9)
    });
  });

  describe('validateTimezone', () => {
    it('should not throw for valid timezone', () => {
      expect(() => validateTimezone('America/New_York')).not.toThrow();
      expect(() => validateTimezone('UTC')).not.toThrow();
      expect(() => validateTimezone('Asia/Tokyo')).not.toThrow();
    });

    it('should throw for invalid timezone', () => {
      expect(() => validateTimezone('Invalid/Timezone')).toThrow();
      expect(() => validateTimezone('')).toThrow();
    });
  });

  describe('COMMON_TIMEZONES', () => {
    it('should contain expected timezone options', () => {
      expect(COMMON_TIMEZONES).toHaveLength(11);
      
      const timezoneValues = COMMON_TIMEZONES.map(t => t.value);
      expect(timezoneValues).toContain('UTC');
      expect(timezoneValues).toContain('America/New_York');
      expect(timezoneValues).toContain('Asia/Tokyo');
    });

    it('should have proper structure', () => {
      COMMON_TIMEZONES.forEach(timezone => {
        expect(timezone).toHaveProperty('value');
        expect(timezone).toHaveProperty('label');
        expect(typeof timezone.value).toBe('string');
        expect(typeof timezone.label).toBe('string');
      });
    });
  });

  describe('getTimezoneLabel', () => {
    it('should return label for known timezone', () => {
      const result = getTimezoneLabel('America/New_York');
      expect(result).toBe('Eastern Time (US & Canada)');
    });

    it('should return timezone value for unknown timezone', () => {
      const result = getTimezoneLabel('Unknown/Timezone');
      expect(result).toBe('Unknown/Timezone');
    });
  });

  describe('DST Transitions', () => {
    it('should handle spring forward correctly', () => {
      // March 10, 2024 - Spring forward in Eastern time
      const springForwardDate = new Date('2024-03-10T02:30:00Z');
      const result = getDayKeyForUser('America/New_York', springForwardDate);
      expect(result).toBe('2024-03-10');
    });

    it('should handle fall back correctly', () => {
      // November 3, 2024 - Fall back in Eastern time
      const fallBackDate = new Date('2024-11-03T02:30:00Z');
      const result = getDayKeyForUser('America/New_York', fallBackDate);
      expect(result).toBe('2024-11-03');
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundary correctly', () => {
      // December 31, 2024 at 23:30 UTC (6:30 PM Eastern on Dec 31)
      const yearEndDate = new Date('2024-12-31T23:30:00Z');
      const result = getDayKeyForUser('America/New_York', yearEndDate);
      expect(result).toBe('2024-12-31');
    });

    it('should handle leap year correctly', () => {
      // February 29, 2024 (leap year)
      const leapYearDate = new Date('2024-02-29T12:00:00Z');
      const result = getDayKeyForUser('America/New_York', leapYearDate);
      expect(result).toBe('2024-02-29');
    });

    it('should handle timezone with half-hour offset', () => {
      // Test with a timezone that has half-hour offset (e.g., India)
      const indiaDate = new Date('2024-01-15T12:00:00Z');
      const result = getDayKeyForUser('Asia/Kolkata', indiaDate);
      expect(result).toBe('2024-01-15');
    });
  });
});
