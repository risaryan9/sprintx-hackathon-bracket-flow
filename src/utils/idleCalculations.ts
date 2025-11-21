/**
 * Utility functions for calculating idle status and time until idle
 * for courts and umpires based on match start time and duration
 */

import { parseAsUTC } from "./timestampParser";

export interface IdleStatus {
  isIdle: boolean;
  minutesUntilIdle: number | null;
  timeUntilIdleFormatted: string | null;
}

/**
 * Calculate when a court or umpire will become idle
 * 
 * Formula: time_until_idle = (start_time + duration_minutes) - current_time
 * 
 * @param isIdle - Current idle status from database (optional check)
 * @param lastAssignedStartTime - Timestamp when the match started (from court/umpire or match record)
 * @param matchDurationMinutes - Duration of the match in minutes
 * @returns IdleStatus object with calculated values
 */
export const calculateIdleStatus = (
  isIdle: boolean,
  lastAssignedStartTime: string | null,
  matchDurationMinutes: number | null
): IdleStatus => {
  // If marked as idle in database, return idle immediately (unless we have a start time)
  // If we have a start time, trust the calculation over the flag
  if (isIdle && !lastAssignedStartTime) {
    return {
      isIdle: true,
      minutesUntilIdle: null,
      timeUntilIdleFormatted: null,
    };
  }

  // If missing required data, cannot calculate - assume idle
  if (!lastAssignedStartTime || !matchDurationMinutes || matchDurationMinutes <= 0) {
    return {
      isIdle: true,
      minutesUntilIdle: null,
      timeUntilIdleFormatted: null,
    };
  }

  try {
    // CRITICAL: Parse start time as UTC using utility function
    // This ensures database timestamps (stored in UTC) are correctly interpreted as UTC
    // Without this, JavaScript would interpret as local time (e.g., IST = UTC+5:30)
    const startTime = parseAsUTC(lastAssignedStartTime);
    
    if (!startTime) {
      console.error("Invalid start time:", lastAssignedStartTime);
      return {
        isIdle: true,
        minutesUntilIdle: null,
        timeUntilIdleFormatted: null,
      };
    }
    
    // Get current time - ensure we compare UTC to UTC
    // Database timestamps are in UTC, so we need to use UTC for comparison
    const currentTime = new Date();
    
    // Formula: end_time = start_time + duration_minutes
    // Convert duration from minutes to milliseconds
    const durationMs = matchDurationMinutes * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    
    // Formula: time_until_idle = end_time - current_time
    // Both times are in milliseconds since epoch, so this comparison is timezone-independent
    const timeRemainingMs = endTime.getTime() - currentTime.getTime();
    
    // Debug logging
    console.log("Idle calculation:", {
      startTime: startTime.toISOString(),
      currentTime: currentTime.toISOString(),
      endTime: endTime.toISOString(),
      timeRemainingMs,
      durationMinutes: matchDurationMinutes,
    });
    
    // If time has passed or is very close (within 1 minute), consider idle
    if (timeRemainingMs <= 60000) { // 1 minute threshold
      return {
        isIdle: true, // Match should be over or ending soon
        minutesUntilIdle: 0,
        timeUntilIdleFormatted: timeRemainingMs > 0 ? "Less than 1m" : "Overtime",
      };
    }

    // Calculate minutes remaining (rounded up)
    const minutesRemaining = Math.ceil(timeRemainingMs / (60 * 1000));

    return {
      isIdle: false, // Still busy
      minutesUntilIdle: minutesRemaining,
      timeUntilIdleFormatted: formatTimeUntilIdle(minutesRemaining),
    };
  } catch (error) {
    console.error("Error calculating idle status:", error, {
      lastAssignedStartTime,
      matchDurationMinutes,
    });
    return {
      isIdle: true,
      minutesUntilIdle: null,
      timeUntilIdleFormatted: null,
    };
  }
};

/**
 * Format minutes into a human-readable string
 * @param minutes - Number of minutes
 * @returns Formatted string like "5m", "1h 30m", etc.
 */
export const formatTimeUntilIdle = (minutes: number): string => {
  if (minutes <= 0) {
    return "Now";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    if (mins > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${hours}h`;
  }

  return `${mins}m`;
};

/**
 * Get match details for idle calculation
 * This is a helper to combine match data with court/umpire data
 */
export interface MatchForIdleCalc {
  id: string;
  actual_start_time: string | null;
  duration_minutes: number | null;
}

/**
 * Calculate idle status for a court or umpire with match data lookup
 * 
 * Formula: time_until_idle = (start_time + duration_minutes) - current_time
 * 
 * Priority:
 * 1. Check if match has actually started (actual_start_time exists)
 * 2. Use last_assigned_start_time from court/umpire record (preferred)
 * 3. Fall back to match.actual_start_time if court/umpire time not set
 * 4. Use is_idle flag from database as secondary check
 * 
 * @param isIdle - Current idle status from database
 * @param lastAssignedStartTime - Start time from court/umpire record (when match was assigned)
 * @param lastAssignedMatchId - ID of the currently assigned match
 * @param matches - Array of all matches to search for duration
 * @returns IdleStatus object
 */
export const calculateIdleStatusWithMatch = (
  isIdle: boolean,
  lastAssignedStartTime: string | null,
  lastAssignedMatchId: string | null,
  matches: MatchForIdleCalc[]
): IdleStatus => {
  // Step 1: If no match assigned, definitely idle
  if (!lastAssignedMatchId) {
    return {
      isIdle: true,
      minutesUntilIdle: null,
      timeUntilIdleFormatted: null,
    };
  }

  // Step 2: Find the assigned match to get duration
  const match = matches.find((m) => m.id === lastAssignedMatchId);
  
  if (!match) {
    // Match not found - check if is_idle flag says busy, then show as busy without countdown
    if (!isIdle) {
      return {
        isIdle: false,
        minutesUntilIdle: null,
        timeUntilIdleFormatted: "Match in progress",
      };
    }
    return {
      isIdle: true,
      minutesUntilIdle: null,
      timeUntilIdleFormatted: null,
    };
  }

  // Step 3: Determine the actual start time
  // Priority: last_assigned_start_time (from court/umpire) > actual_start_time (from match)
  const startTime = lastAssignedStartTime || match.actual_start_time;
  
  // Step 4: Check if match has actually started
  const matchHasStarted = !!match.actual_start_time;
  
  // Step 5: If we have a start time and duration, calculate idle status
  // This is the primary calculation path
  if (startTime && match.duration_minutes && match.duration_minutes > 0) {
    // Use is_idle flag: if false, they're busy; if true but match started, trust match started
    const shouldBeBusy = !isIdle || matchHasStarted;
    
    return calculateIdleStatus(
      !shouldBeBusy, // Invert: if shouldBeBusy is true, isIdle is false
      startTime,
      match.duration_minutes
    );
  }
  
  // Step 6: If is_idle is false but we don't have start time/duration
  // This means they're assigned but waiting or missing data
  if (!isIdle) {
    if (matchHasStarted) {
      // Match started but missing duration
      return {
        isIdle: false,
        minutesUntilIdle: null,
        timeUntilIdleFormatted: "In progress",
      };
    }
    // Assigned but not started
    return {
      isIdle: false,
      minutesUntilIdle: null,
      timeUntilIdleFormatted: "Waiting to start",
    };
  }

  // Step 7: Default to idle if we can't determine status
  return {
    isIdle: true,
    minutesUntilIdle: null,
    timeUntilIdleFormatted: null,
  };
};

