/**
 * Utility to parse timestamps from Supabase/PostgreSQL
 * 
 * CRITICAL: Supabase stores timestamps in UTC but may return them in different formats.
 * This utility ensures all timestamps are parsed as UTC to avoid timezone issues.
 * 
 * Problem scenario:
 * - Database: "2025-11-21 11:55:11.835" (UTC, but no timezone indicator)
 * - JavaScript: new Date("2025-11-21 11:55:11.835") interprets as LOCAL time (e.g., IST)
 * - Result: UTC time gets interpreted as IST, making it appear 5:30 hours in the past!
 * 
 * Solution: Always append 'Z' to force UTC interpretation
 */

/**
 * Parse a timestamp string from database and ensure it's interpreted as UTC
 * @param timestampString - Timestamp string from database (may be PostgreSQL or ISO format)
 * @returns Date object representing the UTC timestamp
 */
export const parseAsUTC = (timestampString: string | null | undefined): Date | null => {
  if (!timestampString) {
    return null;
  }

  let normalizedTime = timestampString.trim();
  
  // If it's in PostgreSQL format (space separator), convert to ISO format
  if (normalizedTime.includes(' ') && !normalizedTime.includes('T')) {
    normalizedTime = normalizedTime.replace(' ', 'T');
  }
  
  // CRITICAL: Always add 'Z' for UTC if no timezone indicator exists
  // Without 'Z', JavaScript interprets as local time (e.g., IST = UTC+5:30)
  // With 'Z', JavaScript correctly interprets as UTC
  if (!normalizedTime.includes('Z') && 
      !normalizedTime.includes('+') && 
      !normalizedTime.match(/-\d{2}:\d{2}$/)) { // Check for timezone offset like -05:30
    normalizedTime = normalizedTime + 'Z';
  }
  
  const parsedDate = new Date(normalizedTime);
  
  if (isNaN(parsedDate.getTime())) {
    console.error("Failed to parse timestamp as UTC:", {
      original: timestampString,
      normalized: normalizedTime,
    });
    return null;
  }
  
  return parsedDate;
};

/**
 * Format current time as UTC ISO string for database storage
 * This ensures consistency when storing timestamps
 */
export const getCurrentUTCISO = (): string => {
  return new Date().toISOString();
};

