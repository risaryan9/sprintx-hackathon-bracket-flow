import { supabase } from "@/lib/supabaseClient";
import { parseAsUTC } from "@/utils/timestampParser";

/**
 * Automatically check and update idle status for courts and umpires
 * This should be called periodically to reset idle status when match duration ends
 */
export const autoUpdateIdleStatus = async (): Promise<void> => {
  const now = new Date().toISOString();
  
  // Find all active matches (started but not completed)
  const { data: activeMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, actual_start_time, duration_minutes, umpire_id, court_id, is_completed")
    .not("actual_start_time", "is", null)
    .eq("is_completed", false);

  if (matchesError) {
    console.error("Error fetching active matches:", matchesError);
    return;
  }

  if (!activeMatches || activeMatches.length === 0) {
    return;
  }

  const nowTime = new Date().getTime();
  
  // Check each match to see if duration has passed
  for (const match of activeMatches) {
    if (!match.actual_start_time || !match.duration_minutes) {
      continue;
    }

    try {
      // CRITICAL: Parse start time as UTC using utility function
      // This ensures database timestamps are correctly interpreted as UTC (not IST/local time)
      const startTime = parseAsUTC(match.actual_start_time);
      
      if (!startTime) {
        console.error(`Invalid start time for match ${match.id}:`, match.actual_start_time);
        continue; // Skip invalid dates
      }

      // Calculate end time
      const endTime = new Date(startTime.getTime() + match.duration_minutes * 60 * 1000);
      const endTimeMs = endTime.getTime();

      // If duration has passed (more than 1 minute past end time)
      if (nowTime > endTimeMs + 60000) {
        // Update match to awaiting_result
        await supabase
          .from("matches")
          .update({ awaiting_result: true })
          .eq("id", match.id);

        // Reset umpire to idle if this is their assigned match
        if (match.umpire_id) {
          const { data: umpireData } = await supabase
            .from("umpires")
            .select("last_assigned_match_id")
            .eq("id", match.umpire_id)
            .single();

          // Only reset if this umpire is still assigned to this match
          if (umpireData?.last_assigned_match_id === match.id) {
            await supabase
              .from("umpires")
              .update({
                is_idle: true,
                last_assigned_start_time: null,
                last_assigned_match_id: null,
              })
              .eq("id", match.umpire_id)
              .eq("last_assigned_match_id", match.id);
          }
        }

        // Reset court to idle if this is its assigned match
        if (match.court_id) {
          const { data: courtData } = await supabase
            .from("courts")
            .select("last_assigned_match_id")
            .eq("id", match.court_id)
            .single();

          // Only reset if this court is still assigned to this match
          if (courtData?.last_assigned_match_id === match.id) {
            await supabase
              .from("courts")
              .update({
                is_idle: true,
                last_assigned_start_time: null,
                last_assigned_match_id: null,
              })
              .eq("id", match.court_id)
              .eq("last_assigned_match_id", match.id);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing match ${match.id}:`, error);
    }
  }
};

