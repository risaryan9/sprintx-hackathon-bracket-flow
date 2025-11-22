import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { generateMatchSummaries, generateOverallSummary, MatchDataForAI } from "@/services/aiSummary";
import { BracketMatch } from "@/types/bracket";
import { Tournament } from "@/types/tournament";

interface AISummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: BracketMatch[];
  tournament: Tournament;
}

interface MatchSummary {
  matchId: string;
  summary: string;
}

export const AISummaryModal = ({
  open,
  onOpenChange,
  matches,
  tournament,
}: AISummaryModalProps) => {
  const [overallSummary, setOverallSummary] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<MatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const matchesRef = useRef<string>("");

  useEffect(() => {
    const matchesKey = matches.map(m => m.id).join(",");
    
    const generateSummaries = async () => {
      setIsLoading(true);
      setError(null);

    try {
      // Prepare match data for AI
      const matchesData: MatchDataForAI[] = matches.map((match) => ({
        match: {
          id: match.id,
          tournament_id: match.tournament_id,
          round: match.round,
          match_order: match.match_order,
          entry1_id: match.entry1_id,
          entry2_id: match.entry2_id,
          court_id: match.court_id,
          umpire_id: match.umpire_id,
          scheduled_time: match.scheduled_time,
          duration_minutes: match.duration_minutes,
          rest_enforced: null,
          match_code: match.match_code,
          code_valid: match.code_valid,
          winner_entry_id: match.winner_entry_id,
          is_completed: match.is_completed,
          created_at: null,
          updated_at: null,
          entry1_score: null,
          entry2_score: null,
          actual_start_time: match.actual_start_time || null,
          awaiting_result: match.awaiting_result || null,
        },
        tournament,
        entry1Name: match.entry1_name,
        entry2Name: match.entry2_name,
        courtName: match.court_name,
        umpireName: match.umpire_name,
        round: match.round,
        matchOrder: match.match_order,
        scheduledTime: match.scheduled_time,
        durationMinutes: match.duration_minutes,
        restEnforced: tournament.rest_time_minutes > 0,
        algorithmicReasoning: {
          seeding: match.round?.includes("Round of") 
            ? "Seeded based on bracket structure"
            : match.round?.includes("Quarterfinal") || match.round?.includes("Semifinal")
            ? "Advanced based on previous round results"
            : "Scheduled based on tournament format",
          restTime: tournament.rest_time_minutes,
          courtUtilization: match.court_name 
            ? "Court assigned to optimize utilization and minimize idle time"
            : "Court assignment pending",
          playerAvailability: "Scheduled to ensure players have adequate rest time between matches",
        },
      }));

      // Generate overall summary first
      const overall = await generateOverallSummary(matchesData, tournament);
      setOverallSummary(overall);

      // Then generate individual match summaries
      const generatedSummaries = await generateMatchSummaries(matchesData);
      setSummaries(generatedSummaries);
    } catch (err) {
      console.error("Error generating AI summaries:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate AI summaries. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
    };

    if (open && matches.length > 0 && matchesRef.current !== matchesKey) {
      matchesRef.current = matchesKey;
      generateSummaries();
    } else if (!open) {
      // Reset state when modal closes
      setSummaries([]);
      setOverallSummary(null);
      setError(null);
      setExpandedMatches(new Set());
      matchesRef.current = "";
    }
  }, [open, matches, tournament]);

  const getMatchSummary = (matchId: string): string | null => {
    return summaries.find((s) => s.matchId === matchId)?.summary || null;
  };

  const toggleMatch = (matchId: string) => {
    setExpandedMatches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const isMatchExpanded = (matchId: string) => expandedMatches.has(matchId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-black/95 backdrop-blur-xl max-w-4xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl text-white">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <DialogTitle className="text-2xl font-semibold text-white">
                AI Match Summaries
              </DialogTitle>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </Badge>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            AI-generated explanations for match scheduling decisions
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                Generating AI summaries for {matches.length} matches...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={generateSummaries}
                className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : summaries.length === 0 && !overallSummary ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No summaries available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Summary */}
              {overallSummary && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Overall Fixture Summary
                      </h3>
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {overallSummary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Match Summaries - Collapsible */}
              <div className="space-y-2">
                <h3 className="text-md font-semibold text-white mb-3">
                  Individual Match Summaries
                </h3>
                {matches.map((match) => {
                  const summary = getMatchSummary(match.id);
                  const isExpanded = isMatchExpanded(match.id);

                  return (
                    <Collapsible
                      key={match.id}
                      open={isExpanded}
                      onOpenChange={() => toggleMatch(match.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full">
                          <div className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors text-left">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="border-primary/30 bg-primary/10 text-primary text-xs"
                                  >
                                    {match.round || "Round TBD"}
                                  </Badge>
                                  {match.match_order && (
                                    <Badge
                                      variant="outline"
                                      className="border-white/20 bg-white/5 text-white text-xs"
                                    >
                                      Match #{match.match_order}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="text-base font-semibold text-white mb-1">
                                  {match.entry1_name || "TBD"} vs {match.entry2_name || "BYE"}
                                </h4>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                  {match.court_name && (
                                    <span>Court: {match.court_name}</span>
                                  )}
                                  {match.scheduled_time && (
                                    <span>
                                      {new Date(match.scheduled_time).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      {summary && (
                        <CollapsibleContent>
                          <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-4 ml-4">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-200 leading-relaxed">
                                {summary}
                              </p>
                            </div>
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

