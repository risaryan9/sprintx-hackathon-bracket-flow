import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { BracketMatch } from "@/types/bracket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User, Trophy, Clock, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { parseAsUTC } from "@/utils/timestampParser";
import { formatTimeUntilIdle } from "@/utils/idleCalculations";

interface FixtureViewProps {
  matches: BracketMatch[];
  tournamentId: string;
  currentRound?: string | null;
}

interface CourtMatch {
  courtId: string;
  courtName: string;
  match: BracketMatch;
}

export const FixtureView = ({
  matches,
  tournamentId,
  currentRound,
}: FixtureViewProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every 30 seconds for running matches
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate remaining time for a match
  const calculateRemainingTime = (match: BracketMatch): number | null => {
    if (!match.actual_start_time || !match.duration_minutes || match.is_completed) {
      return null;
    }
    
    try {
      const startTime = parseAsUTC(match.actual_start_time);
      if (!startTime) return null;
      
      const endTime = new Date(startTime.getTime() + match.duration_minutes * 60 * 1000);
      const remainingMs = endTime.getTime() - currentTime.getTime();
      return Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
    } catch {
      return null;
    }
  };
  // Separate matches into current batch (with courts) and upcoming (without courts or later)
  const { currentBatch, upcomingMatches } = useMemo(() => {
    // Filter out BYE matches (completed matches without courts/umpires) from active scheduling
    // BYE matches are already completed and don't need to be shown in active batches
    const isByeMatch = (m: BracketMatch) => 
      (m.entry1_id === null || m.entry2_id === null) && m.is_completed;
    
    // Get all matches with court assignments or current round (excluding BYE matches)
    const matchesWithCourts = matches.filter(
      (m) =>
        !isByeMatch(m) &&
        ((m.court_id && m.court_name && !m.is_completed) ||
        (currentRound && m.round === currentRound && !m.is_completed))
    );

    if (matchesWithCourts.length === 0) {
      return {
        currentBatch: [],
        upcomingMatches: matches.filter((m) => !isByeMatch(m) && !m.is_completed),
      };
    }

    // Find the earliest scheduled time among matches with courts
    const times = matchesWithCourts
      .map((m) => m.scheduled_time)
      .filter((t): t is string => t !== null)
      .map((t) => new Date(t).getTime())
      .filter((t) => !isNaN(t));

    const earliestTime = times.length > 0 ? Math.min(...times) : null;

    // Get matches scheduled at the earliest time (current batch)
    const currentBatchMatches: CourtMatch[] = [];
    const seenCourts = new Set<string>();

    matchesWithCourts.forEach((match) => {
      const matchTime = match.scheduled_time
        ? new Date(match.scheduled_time).getTime()
        : null;
      const isEarliest =
        !earliestTime ||
        !matchTime ||
        matchTime === earliestTime ||
        Math.abs(matchTime - earliestTime) < 60000; // Within 1 minute

      const useMatch =
        (match.court_id && match.court_name && isEarliest) ||
        (!match.court_id && currentRound && match.round === currentRound);

      if (useMatch) {
        const courtId = match.court_id || `virtual-${match.id}`;
        const courtName = match.court_name || `Match ${match.match_order ?? ""}`.trim();

        if (!seenCourts.has(courtId)) {
          seenCourts.add(courtId);
          currentBatchMatches.push({
            courtId,
            courtName: courtName || "Court TBD",
            match,
          });
        }
      }
    });

    // Sort by court name for consistent display
    currentBatchMatches.sort((a, b) => a.courtName.localeCompare(b.courtName));

    // Get remaining matches (those without courts or not in the current batch)
    // Exclude BYE matches from upcoming (they're already completed)
    const currentBatchMatchIds = new Set(
      currentBatchMatches.map((c) => c.match.id)
    );
    const upcoming = matches.filter(
      (match) => 
        !isByeMatch(match) &&
        !match.is_completed && 
        !currentBatchMatchIds.has(match.id)
    );

    // Sort upcoming matches by scheduled_time, then by match_order
    upcoming.sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) {
        return (
          new Date(a.scheduled_time).getTime() -
          new Date(b.scheduled_time).getTime()
        );
      }
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      const orderA = a.match_order ?? 0;
      const orderB = b.match_order ?? 0;
      return orderA - orderB;
    });

    return {
      currentBatch: currentBatchMatches,
      upcomingMatches: upcoming,
    };
  }, [matches]);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "TBD";
    try {
      return format(new Date(timeStr), "MMM d, yyyy h:mm a");
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      {/* Current Batch - Matches Assigned to Courts */}
      {currentBatch.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Current Batch</h2>
              <p className="text-sm text-muted-foreground">
                Matches currently assigned to courts
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              {currentBatch.length} {currentBatch.length === 1 ? "court" : "courts"}
            </Badge>
          </div>

          {/* Court Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentBatch.map(({ courtId, courtName, match }) => (
              <Card
                key={courtId}
                className="glass border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/50 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {courtName}
                    </CardTitle>
                    {match.round && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary text-xs"
                      >
                        {match.round}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Match Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Time:</span>
                      <span className="text-foreground font-medium">
                        {formatTime(match.scheduled_time)}
                      </span>
                    </div>

                    {match.match_order && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Match Order:</span>
                        <span className="text-foreground font-medium ml-2">
                          {match.match_order}
                        </span>
                      </div>
                    )}

                    {match.umpire_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Umpire:</span>
                        <span className="text-primary font-medium">
                          {match.umpire_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Match Participants */}
                  <div className="pt-3 border-t border-white/10">
                    <TooltipProvider>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {match.entry1_name || "TBD"}
                            </span>
                            {match.entry1_club_name && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    aria-label={`Club: ${match.entry1_club_name}`}
                                  >
                                    <Building2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/90 border-white/10 text-white">
                                  <p className="font-medium">{match.entry1_club_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {match.winner_entry_id === match.entry1_id && (
                            <Trophy className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="text-center text-xs text-muted-foreground py-1">
                          vs
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {match.entry2_name || "BYE"}
                            </span>
                            {match.entry2_club_name && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    aria-label={`Club: ${match.entry2_club_name}`}
                                  >
                                    <Building2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/90 border-white/10 text-white">
                                  <p className="font-medium">{match.entry2_club_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {match.winner_entry_id === match.entry2_id && (
                            <Trophy className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </TooltipProvider>
                  </div>

                  {/* Match Status */}
                  <div className="mt-3 space-y-1">
                      {match.is_completed ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs w-full justify-center">
                          Completed
                        </Badge>
                      ) : match.awaiting_result ? (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs w-full justify-center">
                          Awaiting Result
                        </Badge>
                      ) : match.actual_start_time ? (
                        <>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs w-full justify-center">
                            Running
                          </Badge>
                          {(() => {
                            const remaining = calculateRemainingTime(match);
                            return remaining !== null && remaining > 0 ? (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs w-full justify-center">
                                <Clock className="h-2.5 w-2.5 mr-1" />
                                {formatTimeUntilIdle(remaining)}
                              </Badge>
                            ) : null;
                          })()}
                        </>
                      ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Matches - Remaining Matches */}
      {upcomingMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Upcoming Matches</h2>
              <p className="text-sm text-muted-foreground">
                Remaining matches to be scheduled
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-white/20 bg-white/5 text-white/80"
            >
              {upcomingMatches.length}{" "}
              {upcomingMatches.length === 1 ? "match" : "matches"}
            </Badge>
          </div>

          {/* Vertical List of Upcoming Matches */}
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <Card
                key={match.id}
                className="glass border-white/10 hover:border-primary/30 transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Match Info */}
                    <div className="flex-1 space-y-2">
                      <TooltipProvider>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-foreground">
                              {match.entry1_name || "TBD"}
                            </span>
                            {match.entry1_club_name && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    aria-label={`Club: ${match.entry1_club_name}`}
                                  >
                                    <Building2 className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/90 border-white/10 text-white">
                                  <p className="font-medium">{match.entry1_club_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {match.winner_entry_id === match.entry1_id && (
                              <Trophy className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="text-muted-foreground px-2">vs</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-foreground">
                              {match.entry2_name || "BYE"}
                            </span>
                            {match.entry2_club_name && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    aria-label={`Club: ${match.entry2_club_name}`}
                                  >
                                    <Building2 className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/90 border-white/10 text-white">
                                  <p className="font-medium">{match.entry2_club_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {match.winner_entry_id === match.entry2_id && (
                              <Trophy className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </TooltipProvider>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {match.round && (
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/10 text-primary text-xs"
                          >
                            {match.round}
                          </Badge>
                        )}
                        {match.match_order && (
                          <span>Order: {match.match_order}</span>
                        )}
                        {match.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatTime(match.scheduled_time)}
                          </span>
                        )}
                        {match.court_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {match.court_name}
                          </span>
                        )}
                        {match.umpire_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {match.umpire_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {match.is_completed ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Completed
                        </Badge>
                      ) : match.awaiting_result ? (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                          Awaiting Result
                        </Badge>
                      ) : match.actual_start_time ? (
                        <>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                            Running
                          </Badge>
                          {(() => {
                            const remaining = calculateRemainingTime(match);
                            return remaining !== null && remaining > 0 ? (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">
                                <Clock className="h-2.5 w-2.5 mr-1" />
                                {formatTimeUntilIdle(remaining)}
                              </Badge>
                            ) : null;
                          })()}
                        </>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs"
                        >
                          Upcoming
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed BYE Matches */}
      {(() => {
        const byeMatches = matches.filter(
          (m) => (m.entry1_id === null || m.entry2_id === null) && m.is_completed
        );
        
        if (byeMatches.length === 0) return null;
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-1">BYE Matches</h2>
                <p className="text-sm text-muted-foreground">
                  Automatically completed matches (no opponent)
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/10 text-green-400"
              >
                {byeMatches.length} {byeMatches.length === 1 ? "match" : "matches"}
              </Badge>
            </div>

            <div className="space-y-3">
              {byeMatches.map((match) => (
                <Card
                  key={match.id}
                  className="glass border-green-500/20 bg-green-500/5 hover:border-green-500/40 transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-foreground">
                              {match.entry1_name || match.entry2_name || "TBD"}
                            </span>
                            {match.winner_entry_id && (
                              <Trophy className="h-4 w-4 text-green-400" />
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="border-green-500/30 bg-green-500/10 text-green-400 text-xs"
                          >
                            BYE - Auto Winner
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {match.round && (
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/10 text-primary text-xs"
                            >
                              {match.round}
                            </Badge>
                          )}
                          {match.match_order && (
                            <span>Order: {match.match_order}</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Empty State */}
      {currentBatch.length === 0 && upcomingMatches.length === 0 && (
        <Card className="glass border-white/10">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No matches available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FixtureView;

