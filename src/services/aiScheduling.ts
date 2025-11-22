import { Umpire, Court, Entry, Player } from "@/types/match";

/**
 * AI-assisted suggestions for scheduling optimization
 * These are advisory only and don't override core logic
 */

interface UmpireSuggestion {
  umpireId: string;
  reasoning: string;
  confidence: number;
}

interface BatchSizeSuggestion {
  suggestedBatchSize: number;
  reasoning: string;
}

interface TimeSlotSuggestion {
  suggestedAdjustment: number; // minutes to adjust
  reasoning: string;
}

/**
 * Get AI suggestion for optimal umpire selection
 * Returns null if AI is unavailable or fails - core logic will handle it
 */
export const getAISuggestedUmpire = async (
  availableUmpires: Umpire[],
  match: { entry1_id: string | null; entry2_id: string | null },
  entries: Entry[],
  players: Player[],
  tournamentContext: {
    sport: string;
    format: string;
    matchDuration: number;
  }
): Promise<UmpireSuggestion | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  
  if (!apiKey || availableUmpires.length === 0) {
    return null;
  }

  // Only use AI if we have multiple options and sufficient context
  if (availableUmpires.length <= 1) {
    return null;
  }

  try {
    // Extract match context
    const entry1 = entries.find((e) => e.id === match.entry1_id);
    const entry2 = entries.find((e) => e.id === match.entry2_id);
    const player1 = entry1?.player_id ? players.find((p) => p.id === entry1.player_id) : null;
    const player2 = entry2?.player_id ? players.find((p) => p.id === entry2.player_id) : null;

    // Prepare umpire data (only include relevant fields)
    const umpireData = availableUmpires.map((u) => ({
      id: u.id,
      name: u.full_name || "Unknown",
      experience: u.experience_years || 0,
      certification: u.certification_level || "Unknown",
      clubId: u.club_id || null,
      isIdle: u.is_idle !== false,
    }));

    const prompt = `You are an AI assistant providing MINOR suggestions for umpire assignment in a sports tournament. Your suggestions are ADVISORY ONLY and should not override algorithmic logic.

Tournament Context:
- Sport: ${tournamentContext.sport}
- Format: ${tournamentContext.format}
- Match Duration: ${tournamentContext.matchDuration} minutes

Match Context:
- Player 1 Club: ${player1?.club_id || "Unknown"}
- Player 2 Club: ${player2?.club_id || "Unknown"}

Available Umpires:
${umpireData.map((u, i) => `${i + 1}. ${u.name} (Experience: ${u.experience} years, Certification: ${u.certification}, Club: ${u.clubId || "None"}, Available: ${u.isIdle})`).join("\n")}

Provide a SINGLE suggestion:
1. Which umpire ID would be most suitable (considering experience, club neutrality, availability)
2. Brief reasoning (1 sentence)
3. Confidence level (0-1)

Respond in JSON format ONLY:
{
  "umpireId": "uuid-here",
  "reasoning": "Brief explanation",
  "confidence": 0.8
}

If you cannot make a confident suggestion, return null.`;

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
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent suggestions
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!response.ok) {
      return null; // Fail silently, core logic will handle
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text.trim();
      
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestion = JSON.parse(jsonMatch[0]);
        
        // Validate suggestion
        if (suggestion.umpireId && availableUmpires.some(u => u.id === suggestion.umpireId)) {
          return {
            umpireId: suggestion.umpireId,
            reasoning: suggestion.reasoning || "AI suggestion",
            confidence: Math.min(1, Math.max(0, suggestion.confidence || 0.5)),
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    // Fail silently - core logic will handle umpire selection
    console.debug("AI umpire suggestion failed (non-critical):", error);
    return null;
  }
};

/**
 * Get AI suggestion for optimal batch size
 * Returns null if AI is unavailable - core logic will handle it
 */
export const getAISuggestedBatchSize = async (
  currentBatchSize: number,
  courts: Court[],
  umpires: Umpire[],
  totalMatches: number,
  tournamentContext: {
    sport: string;
    format: string;
    matchDuration: number;
    restTime: number;
  }
): Promise<BatchSizeSuggestion | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const prompt = `You are an AI assistant providing MINOR suggestions for tournament scheduling batch size. Your suggestions are ADVISORY ONLY.

Tournament Context:
- Sport: ${tournamentContext.sport}
- Format: ${tournamentContext.format}
- Match Duration: ${tournamentContext.matchDuration} minutes
- Rest Time: ${tournamentContext.restTime} minutes

Resources:
- Available Courts: ${courts.length}
- Available Umpires: ${umpires.length}
- Total Matches: ${totalMatches}
- Current Batch Size: ${currentBatchSize}

Provide a SINGLE suggestion:
1. Optimal batch size (considering resource availability and tournament flow)
2. Brief reasoning (1 sentence)

Respond in JSON format ONLY:
{
  "suggestedBatchSize": 3,
  "reasoning": "Brief explanation"
}

Keep suggestions conservative and within resource limits.`;

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
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestion = JSON.parse(jsonMatch[0]);
        
        // Validate suggestion is within bounds
        const maxPossible = Math.min(courts.length, umpires.length);
        if (suggestion.suggestedBatchSize && 
            suggestion.suggestedBatchSize > 0 && 
            suggestion.suggestedBatchSize <= maxPossible) {
          return {
            suggestedBatchSize: Math.floor(suggestion.suggestedBatchSize),
            reasoning: suggestion.reasoning || "AI optimization suggestion",
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.debug("AI batch size suggestion failed (non-critical):", error);
    return null;
  }
};

/**
 * Get AI suggestion for time slot adjustments
 * Returns null if AI is unavailable - core logic will handle it
 */
export const getAITimeSlotSuggestion = async (
  currentTime: Date,
  matchContext: {
    round: string;
    matchOrder: number;
    totalMatchesInRound: number;
  },
  tournamentContext: {
    sport: string;
    matchDuration: number;
    restTime: number;
  }
): Promise<TimeSlotSuggestion | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  
  if (!apiKey) {
    return null;
  }

  // Only use AI for non-critical time adjustments
  // Skip for early matches or simple schedules
  if (matchContext.matchOrder <= 3) {
    return null;
  }

  try {
    const prompt = `You are an AI assistant providing MINOR suggestions for match timing adjustments. Your suggestions are ADVISORY ONLY.

Tournament Context:
- Sport: ${tournamentContext.sport}
- Match Duration: ${tournamentContext.matchDuration} minutes
- Rest Time: ${tournamentContext.restTime} minutes

Match Context:
- Round: ${matchContext.round}
- Match Order: ${matchContext.matchOrder} of ${matchContext.totalMatchesInRound}
- Current Scheduled Time: ${currentTime.toISOString()}

Provide a SINGLE suggestion:
1. Time adjustment in minutes (can be negative for earlier, positive for later, or 0 for no change)
2. Brief reasoning (1 sentence)

Respond in JSON format ONLY:
{
  "suggestedAdjustment": 0,
  "reasoning": "Brief explanation"
}

Keep adjustments minimal (within ±15 minutes). Return 0 if no adjustment needed.`;

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
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestion = JSON.parse(jsonMatch[0]);
        
        // Validate adjustment is reasonable
        const adjustment = suggestion.suggestedAdjustment || 0;
        if (Math.abs(adjustment) <= 15) {
          return {
            suggestedAdjustment: Math.round(adjustment),
            reasoning: suggestion.reasoning || "AI timing optimization",
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.debug("AI time slot suggestion failed (non-critical):", error);
    return null;
  }
};

