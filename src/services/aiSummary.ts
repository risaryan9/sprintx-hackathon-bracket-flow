import { Match } from "@/types/match";
import { Tournament } from "@/types/tournament";

interface MatchSummary {
  matchId: string;
  summary: string;
}

interface MatchDataForAI {
  match: Match;
  tournament: Tournament;
  entry1Name: string | null;
  entry2Name: string | null;
  courtName: string | null;
  umpireName: string | null;
  round: string | null;
  matchOrder: number | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  restEnforced: boolean | null;
  algorithmicReasoning?: {
    seeding?: string;
    restTime?: number;
    courtUtilization?: string;
    playerAvailability?: string;
  };
}

/**
 * Generate AI summary for a single match using Gemini API
 */
export const generateMatchSummary = async (
  matchData: MatchDataForAI
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please set VITE_GEMINI_KEY environment variable.");
  }

  const prompt = buildPrompt(matchData);

  try {
    // Use gemini-2.0-flash as shown in the working curl command
    const modelName = "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return text.trim();
    }
    
    throw new Error("Unexpected response format from Gemini API");
  } catch (error) {
    console.error("Error generating AI summary:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error(
      `Failed to generate AI summary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

/**
 * Generate overall tournament fixture summary
 */
export const generateOverallSummary = async (
  matchesData: MatchDataForAI[],
  tournament: Tournament
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please set VITE_GEMINI_KEY environment variable.");
  }

  const totalMatches = matchesData.length;
  const rounds = [...new Set(matchesData.map(m => m.round).filter(Boolean))];
  const courts = [...new Set(matchesData.map(m => m.courtName).filter(Boolean))];
  
  const prompt = `You are an AI assistant providing an overview of tournament fixture scheduling. Generate a concise paragraph (3-4 sentences) summarizing the overall fixture schedule for this tournament.

Tournament: ${tournament.name}
Format: ${tournament.format}
Sport: ${tournament.sport}
Total Matches: ${totalMatches}
Rounds: ${rounds.join(", ") || "Not specified"}
Courts Used: ${courts.length} ${courts.length === 1 ? "court" : "courts"}
Match Duration: ${tournament.match_duration_minutes} minutes
Rest Time: ${tournament.rest_time_minutes} minutes

Provide an overview that explains:
1. How the tournament format (${tournament.format}) influenced the scheduling approach
2. The overall strategy for court utilization and match distribution
3. How rest times and player availability were considered across all matches

Keep it concise (3-4 sentences) and suitable for display at the top of a tournament summary.`;

  try {
    const modelName = "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return text.trim();
    }
    
    throw new Error("Unexpected response format from Gemini API");
  } catch (error) {
    console.error("Error generating overall summary:", error);
    throw error;
  }
};

/**
 * Generate AI summaries for multiple matches
 */
export const generateMatchSummaries = async (
  matchesData: MatchDataForAI[]
): Promise<MatchSummary[]> => {
  const summaries: MatchSummary[] = [];

  // Process matches in batches to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < matchesData.length; i += batchSize) {
    const batch = matchesData.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (matchData) => {
      try {
        const summary = await generateMatchSummary(matchData);
        return {
          matchId: matchData.match.id,
          summary,
        };
      } catch (error) {
        console.error(`Error generating summary for match ${matchData.match.id}:`, error);
        return {
          matchId: matchData.match.id,
          summary: `Unable to generate summary for this match. ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    summaries.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < matchesData.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return summaries;
};

/**
 * Build the prompt for Gemini API
 */
function buildPrompt(matchData: MatchDataForAI): string {
  const {
    match,
    tournament,
    entry1Name,
    entry2Name,
    courtName,
    umpireName,
    round,
    matchOrder,
    scheduledTime,
    durationMinutes,
    restEnforced,
    algorithmicReasoning,
  } = matchData;

  const scheduledTimeStr = scheduledTime
    ? new Date(scheduledTime).toLocaleString()
    : "TBD";

  const reasoning = algorithmicReasoning || {
    seeding: "Based on tournament bracket structure",
    restTime: restEnforced ? tournament.rest_time_minutes : 0,
    courtUtilization: "Optimized for maximum court usage",
    playerAvailability: "Scheduled to avoid player conflicts",
  };

  return `You are an AI assistant explaining tournament match scheduling decisions. Generate a concise, human-readable explanation (2-3 sentences) for why this specific match was scheduled the way it was.

Tournament: ${tournament.name}
Format: ${tournament.format}
Sport: ${tournament.sport}

Match Details:
- Round: ${round || "Not specified"}
- Match Order: ${matchOrder || "Not specified"}
- Player/Team 1: ${entry1Name || "TBD"}
- Player/Team 2: ${entry2Name || "BYE"}
- Court: ${courtName || "TBD"}
- Umpire: ${umpireName || "TBD"}
- Scheduled Time: ${scheduledTimeStr}
- Duration: ${durationMinutes || tournament.match_duration_minutes} minutes
- Rest Time Enforced: ${restEnforced ? "Yes" : "No"}
- Rest Time: ${reasoning.restTime} minutes

Algorithmic Reasoning:
- Seeding Logic: ${reasoning.seeding}
- Court Utilization: ${reasoning.courtUtilization}
- Player Availability: ${reasoning.playerAvailability}

Generate a brief explanation that covers:
1. Why these two players/teams were matched together (considering seeding, bracket structure, or round-robin logic)
2. Why this specific match order and scheduling time was chosen (considering rest times, court availability, and player conflicts)
3. How the fixture generation algorithm made this decision

Keep the explanation concise (2-3 sentences), clear, and suitable for display in a tournament management interface.`;
}

