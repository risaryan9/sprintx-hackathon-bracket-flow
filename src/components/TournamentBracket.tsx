import React, { useState, useEffect } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { BracketMatch } from "@/types/bracket";
import { transformMatchesToRounds, MatchSeed, RoundProps } from "@/utils/bracketTransform";
import { parseAsUTC } from "@/utils/timestampParser";
import { formatTimeUntilIdle } from "@/utils/idleCalculations";

// Type matching react-brackets RenderSeedProps
interface RenderSeedProps {
  seed: MatchSeed;
  breakpoint: number;
  roundIndex: number;
  seedIndex: number;
  rounds?: RoundProps[];
}
import { format } from "date-fns";
import { MapPin, User, Trophy, Calendar, Clock, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TournamentBracketProps {
  matches: BracketMatch[];
  tournamentFormat: "knockouts" | "round_robin" | "double_elimination";
}

const CustomSeed = ({ seed, breakpoint, roundIndex, seedIndex }: RenderSeedProps) => {
  const matchSeed = seed as MatchSeed;
  const [currentTime, setCurrentTime] = useState(new Date());
  const isCompleted = matchSeed.is_completed;
  const isRunning = !!matchSeed.actual_start_time && !isCompleted;
  const isAwaitingResult = !!matchSeed.awaiting_result;
  const entry1Winner = matchSeed.winner_entry_id === matchSeed.entry1_id;
  const entry2Winner = matchSeed.winner_entry_id === matchSeed.entry2_id;

  // Calculate remaining time for running matches
  const calculateRemainingTime = (): number | null => {
    if (!isRunning || !matchSeed.actual_start_time || !matchSeed.duration_minutes) {
      return null;
    }
    
    try {
      const startTime = parseAsUTC(matchSeed.actual_start_time);
      if (!startTime) return null;
      
      const endTime = new Date(startTime.getTime() + matchSeed.duration_minutes * 60 * 1000);
      const remainingMs = endTime.getTime() - currentTime.getTime();
      return Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
    } catch {
      return null;
    }
  };

  // Update time every 30 seconds for running matches
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const remainingMinutes = calculateRemainingTime();

  return (
    <Seed mobileBreakpoint={breakpoint} className="min-w-[265px]">
      <SeedItem className="rounded-xl border border-white/20 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm px-5 py-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
        <div className="space-y-3">
          {/* Entry 1 */}
          <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <SeedTeam 
                className={`text-sm font-semibold flex-1 truncate ${
                  entry1Winner && isCompleted
                    ? "text-primary"
                    : "text-foreground/90"
                }`}
              >
                {matchSeed.teams[0]?.name || "TBD"}
              </SeedTeam>
              {matchSeed.teams[0]?.club_name && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                        aria-label={`Club: ${matchSeed.teams[0]?.club_name}`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/90 border-white/10 text-white">
                      <p className="font-medium">{matchSeed.teams[0]?.club_name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {entry1Winner && isCompleted && (
              <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>

          {/* Divider */}
          <div className="relative h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Entry 2 */}
          <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <SeedTeam
                className={`text-sm font-semibold flex-1 truncate ${
                  entry2Winner && isCompleted
                    ? "text-primary"
                    : "text-foreground/90"
                }`}
              >
                {matchSeed.teams[1]?.name || "BYE"}
              </SeedTeam>
              {matchSeed.teams[1]?.club_name && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                        aria-label={`Club: ${matchSeed.teams[1]?.club_name}`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/90 border-white/10 text-white">
                      <p className="font-medium">{matchSeed.teams[1]?.club_name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {entry2Winner && isCompleted && (
              <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>

          {/* Match Details */}
          {(matchSeed.scheduled_time || matchSeed.court_name || matchSeed.umpire_name) && (
            <div className="pt-2 mt-1 border-t border-white/10 space-y-1.5">
              {matchSeed.scheduled_time && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{format(new Date(matchSeed.scheduled_time), "MMM d, h:mm a")}</span>
                </div>
              )}
              {matchSeed.court_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{matchSeed.court_name}</span>
                </div>
              )}
              {matchSeed.umpire_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{matchSeed.umpire_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          <div className="mt-2 space-y-1">
            {isCompleted ? (
              <Badge 
                className="bg-green-500/20 text-green-400 border-green-500/30 text-xs w-full justify-center py-1"
              >
                Completed
              </Badge>
            ) : isAwaitingResult ? (
              <Badge 
                className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs w-full justify-center py-1"
              >
                Awaiting Result
              </Badge>
            ) : isRunning ? (
              <>
                <Badge 
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs w-full justify-center py-1"
                >
                  Running
                </Badge>
                {remainingMinutes !== null && remainingMinutes > 0 && (
                  <Badge 
                    variant="outline"
                    className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs w-full justify-center py-0.5"
                  >
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {formatTimeUntilIdle(remainingMinutes)}
                  </Badge>
                )}
              </>
            ) : null}
          </div>
        </div>
      </SeedItem>
    </Seed>
  );
};

const CustomRoundTitle = (title: string | React.ReactElement, roundIndex: number): React.ReactElement => {
  return (
    <div className="text-center mb-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
  );
};

export const TournamentBracket = ({ matches, tournamentFormat }: TournamentBracketProps) => {
  const rounds = transformMatchesToRounds(matches, tournamentFormat);

  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No matches available to display in bracket format.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bracket-scrollbar">
      <div className="min-w-max p-6">
        <Bracket
          rounds={rounds}
          renderSeedComponent={CustomSeed}
          roundTitleComponent={CustomRoundTitle}
          mobileBreakpoint={992}
          bracketClassName="bg-black"
          roundClassName="text-foreground"
        />
      </div>
    </div>
  );
};

