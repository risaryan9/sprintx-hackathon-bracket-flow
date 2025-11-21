import { useState, useMemo } from "react";
import { BracketMatch } from "@/types/bracket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X, Trophy, Loader2, Eye, EyeOff, Crown, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { updateMatchWinner } from "@/services/matches";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface MatchListProps {
  matches: BracketMatch[];
  tournamentId: string;
  currentRound?: string | null;
}

interface MatchFilters {
  round: string | null;
  courtId: string | null;
  umpireId: string | null;
  date: Date | null;
  completionStatus: "all" | "completed" | "pending";
}

export const MatchList = ({ matches, tournamentId, currentRound }: MatchListProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [showPreviousRounds, setShowPreviousRounds] = useState(false);

  const [filters, setFilters] = useState<MatchFilters>({
    round: null,
    courtId: null,
    umpireId: null,
    date: null,
    completionStatus: "all",
  });

  const handleSetWinner = async (
    matchId: string,
    entryId: string | null
  ) => {
    setUpdatingMatchId(matchId);
    try {
      await updateMatchWinner(matchId, entryId);
      queryClient.invalidateQueries({
        queryKey: ["tournament-matches", tournamentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournament-current-round", tournamentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournament-can-generate-next", tournamentId],
      });
      toast({
        title: "Success",
        description: entryId
          ? "Match winner updated successfully!"
          : "Match winner cleared.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update match winner",
        variant: "destructive",
      });
    } finally {
      setUpdatingMatchId(null);
    }
  };

  // Get all rounds and identify current vs previous
  const roundsByType = useMemo(() => {
    const allRounds = new Set<string>();
    const currentRoundSet = new Set<string>();
    
    matches.forEach((match) => {
      if (match.round) {
        allRounds.add(match.round);
        if (currentRound && match.round === currentRound) {
          currentRoundSet.add(match.round);
        }
      }
    });

    const roundsArray = Array.from(allRounds).sort();
    const previousRounds = roundsArray.filter(
      (round) => !currentRoundSet.has(round)
    );
    const currentRounds = Array.from(currentRoundSet);

    return {
      all: roundsArray,
      current: currentRounds,
      previous: previousRounds,
    };
  }, [matches, currentRound]);

  // Extract distinct values for filters
  const distinctRounds = useMemo(() => {
    return roundsByType.all;
  }, [roundsByType]);

  const distinctCourts = useMemo(() => {
    const courts = new Map<string, string>();
    matches.forEach((match) => {
      if (match.court_id && match.court_name) {
        courts.set(match.court_id, match.court_name);
      }
    });
    return Array.from(courts.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [matches]);

  const distinctUmpires = useMemo(() => {
    const umpires = new Map<string, string>();
    matches.forEach((match) => {
      if (match.umpire_id && match.umpire_name) {
        umpires.set(match.umpire_id, match.umpire_name);
      }
    });
    return Array.from(umpires.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [matches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // Show only current round by default (if currentRound is set and showPreviousRounds is false)
      if (
        currentRound &&
        !showPreviousRounds &&
        !filters.round &&
        match.round !== currentRound
      ) {
        return false;
      }

      // Round filter
      if (filters.round && match.round !== filters.round) return false;

      // Court ID filter
      if (filters.courtId && match.court_id !== filters.courtId) return false;

      // Umpire ID filter
      if (filters.umpireId && match.umpire_id !== filters.umpireId)
        return false;

      // Date filter
      if (filters.date && match.scheduled_time) {
        const matchDate = new Date(match.scheduled_time);
        const filterDate = filters.date;
        if (
          matchDate.getDate() !== filterDate.getDate() ||
          matchDate.getMonth() !== filterDate.getMonth() ||
          matchDate.getFullYear() !== filterDate.getFullYear()
        ) {
          return false;
        }
      }

      // Completion status filter
      if (filters.completionStatus === "completed" && !match.is_completed)
        return false;
      if (filters.completionStatus === "pending" && match.is_completed)
        return false;

      return true;
    });
  }, [matches, filters, currentRound, showPreviousRounds]);

  // Group matches by date/time and sort
  const groupedMatches = useMemo(() => {
    const groups = new Map<string, BracketMatch[]>();

    filteredMatches.forEach((match) => {
      let dateKey = "TBD";
      if (match.scheduled_time) {
        try {
          const date = new Date(match.scheduled_time);
          dateKey = format(date, "yyyy-MM-dd");
        } catch {
          dateKey = "TBD";
        }
      }

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(match);
    });

    // Sort matches within each group by match_order
    groups.forEach((groupMatches) => {
      groupMatches.sort((a, b) => {
        const orderA = a.match_order ?? 0;
        const orderB = b.match_order ?? 0;
        return orderA - orderB;
      });
    });

    // Sort groups by date (chronological order)
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "TBD") return 1;
      if (b[0] === "TBD") return -1;
      return a[0].localeCompare(b[0]);
    });

    return sortedGroups;
  }, [filteredMatches]);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "TBD";
    try {
      return format(new Date(timeStr), "MMM d, yyyy h:mm a");
    } catch {
      return timeStr;
    }
  };

  const formatDateHeader = (dateKey: string) => {
    if (dateKey === "TBD") return "TBD";
    try {
      const date = new Date(dateKey + "T00:00:00");
      return format(date, "EEEE, MMMM d, yyyy");
    } catch {
      return dateKey;
    }
  };

  const clearFilters = () => {
    setFilters({
      round: null,
      courtId: null,
      umpireId: null,
      date: null,
      completionStatus: "all",
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.round !== null ||
      filters.courtId !== null ||
      filters.umpireId !== null ||
      filters.date !== null ||
      filters.completionStatus !== "all"
    );
  }, [filters]);

  // Check for tournament champion (Final winner)
  const finalMatch = useMemo(() => {
    return matches.find((match) => match.round === "Final" && match.winner_entry_id);
  }, [matches]);

  const champion = useMemo(() => {
    if (!finalMatch || !finalMatch.winner_entry_id) return null;
    return finalMatch.winner_entry_id === finalMatch.entry1_id
      ? finalMatch.entry1_name
      : finalMatch.entry2_name;
  }, [finalMatch]);

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No matches available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Champion Announcement Banner */}
      {champion && (
        <Card className="glass border-primary/50 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <CardContent className="p-8 text-center relative overflow-hidden">
            {/* Decorative sparkles */}
            <div className="absolute top-2 right-4 opacity-30">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="absolute bottom-2 left-4 opacity-30">
              <Sparkles className="h-5 w-5 text-primary animate-pulse delay-300" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Crown className="h-12 w-12 text-primary animate-bounce" />
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                 Tournament Champion 
                </h2>
                <Crown className="h-12 w-12 text-primary animate-bounce delay-300" />
              </div>
              <div className="mt-4">
                <p className="text-xl md:text-2xl font-semibold text-primary mb-2">
                  {champion}
                </p>
                <p className="text-sm text-muted-foreground">
                  Congratulations on winning the tournament!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Filter Section */}
      <Card className="glass border-white/10 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Filters</CardTitle>
            <div className="flex items-center gap-2">
              {/* Show Previous Rounds Toggle */}
              {currentRound && roundsByType.previous.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreviousRounds(!showPreviousRounds)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showPreviousRounds ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide Previous Rounds
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Show Previous Rounds ({roundsByType.previous.length})
                    </>
                  )}
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          {/* Current Round Indicator */}
          {currentRound && (
            <div className="mt-2 text-sm text-muted-foreground">
              Showing: <span className="text-primary font-medium">{currentRound}</span>
              {!showPreviousRounds && roundsByType.previous.length > 0 && (
                <span className="ml-2">
                  ({roundsByType.previous.length} previous round{roundsByType.previous.length !== 1 ? "s" : ""} hidden)
                </span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Round Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Round
              </label>
              <Select
                value={filters.round || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, round: value === "all" ? null : value })
                }
              >
                <SelectTrigger className="glass border-white/10">
                  <SelectValue placeholder="All Rounds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {distinctRounds.map((round) => (
                    <SelectItem key={round} value={round}>
                      {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Court ID Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Court
              </label>
              <Select
                value={filters.courtId || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    courtId: value === "all" ? null : value,
                  })
                }
              >
                <SelectTrigger className="glass border-white/10">
                  <SelectValue placeholder="All Courts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courts</SelectItem>
                  {distinctCourts.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Umpire ID Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Umpire
              </label>
              <Select
                value={filters.umpireId || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    umpireId: value === "all" ? null : value,
                  })
                }
              >
                <SelectTrigger className="glass border-white/10">
                  <SelectValue placeholder="All Umpires" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Umpires</SelectItem>
                  {distinctUmpires.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal glass border-white/10",
                      !filters.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.date ? (
                      format(filters.date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.date || undefined}
                    onSelect={(date) =>
                      setFilters({ ...filters, date: date || null })
                    }
                    initialFocus
                  />
                  {filters.date && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setFilters({ ...filters, date: null })
                        }
                      >
                        Clear Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Completion Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={filters.completionStatus}
                onValueChange={(value: "all" | "completed" | "pending") =>
                  setFilters({ ...filters, completionStatus: value })
                }
              >
                <SelectTrigger className="glass border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredMatches.length !== matches.length && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredMatches.length} of {matches.length} matches
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matches List */}
      {groupedMatches.length === 0 ? (
        <Card className="glass border-white/10">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No matches found matching the selected filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedMatches.map(([dateKey, groupMatches]) => (
            <div key={dateKey} className="space-y-4">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {formatDateHeader(dateKey)}
                </h3>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white/80"
                >
                  {groupMatches.length}{" "}
                  {groupMatches.length === 1 ? "match" : "matches"}
                </Badge>
              </div>

              {/* Matches for this date */}
              <div className="space-y-4">
                {groupMatches.map((match) => {
                  const isFinalMatch = match.round === "Final";
                  const isFinalWithWinner = isFinalMatch && match.winner_entry_id;

  return (
                  <Card
          key={match.id}
                    className={cn(
                      "glass border-white/10 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10",
                      isFinalMatch && "border-primary/30 shadow-lg shadow-primary/10",
                      isFinalWithWinner && "border-primary/50 bg-gradient-to-br from-primary/5 to-transparent"
                    )}
                  >
                    <CardContent className={cn("p-6", isFinalMatch && "p-8")}>
                      {/* Final Match Header */}
                      {isFinalMatch && (
                        <div className="mb-6 pb-4 border-b border-primary/30">
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <Trophy className="h-6 w-6 text-primary" />
                            <h3 className="text-2xl font-bold text-primary">CHAMPIONSHIP FINAL</h3>
                            <Trophy className="h-6 w-6 text-primary" />
                          </div>
                          {!isFinalWithWinner && (
                            <p className="text-center text-sm text-muted-foreground">
                              Declare the tournament champion
                            </p>
                          )}
                        </div>
                      )}

                      {/* Top Section: Player Names & Round */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <span className={cn(
                            "text-xl font-semibold text-foreground",
                            isFinalMatch && match.winner_entry_id === match.entry1_id && "text-primary text-2xl"
                          )}>
                {match.entry1_name || "TBD"}
              </span>
                          <span className={cn(
                            "text-muted-foreground px-2 font-medium",
                            isFinalMatch && "text-lg"
                          )}>
                            vs
                          </span>
                          <span className={cn(
                            "text-xl font-semibold text-foreground",
                            isFinalMatch && match.winner_entry_id === match.entry2_id && "text-primary text-2xl"
                          )}>
                {match.entry2_name || "BYE"}
              </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {match.round && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-primary/30 bg-primary/10 text-primary text-xs",
                                isFinalMatch && "border-primary/50 bg-primary/20 text-primary font-bold px-3 py-1"
                              )}
                            >
                              {isFinalMatch ? "🏆 " : ""}
                              {match.round}
                            </Badge>
                          )}
                          {match.is_completed ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              Completed
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs"
                            >
                              Pending
                            </Badge>
                          )}
                        </div>
            </div>

                      {/* Bottom Section: Match Details */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
                        {(match.court_name || match.court_id) && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">
                              Court:
                            </span>
                            <span className="text-primary font-medium">
                              {match.court_name || `Court ${match.court_id?.slice(0, 8)}`}
                            </span>
                            {match.court_id && (
                              <span className="text-muted-foreground text-xs">
                                ({match.court_id.slice(0, 8)})
                              </span>
                            )}
                          </div>
                        )}
                        {(match.umpire_name || match.umpire_id) && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">
                              Umpire:
                            </span>
                            <span className="text-primary font-medium">
                              {match.umpire_name || `Umpire ${match.umpire_id?.slice(0, 8)}`}
                            </span>
                            {match.umpire_id && (
                              <span className="text-muted-foreground text-xs">
                                ({match.umpire_id.slice(0, 8)})
                              </span>
                            )}
                          </div>
              )}
              {match.scheduled_time && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">
                              Time:
                            </span>
                            <span className="text-foreground">
                              {formatTime(match.scheduled_time)}
                            </span>
                          </div>
                        )}
                        {match.match_order && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">
                              Order:
                            </span>
                            <span className="text-foreground">
                              {match.match_order}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Winner Assignment Section */}
                      <div className={cn(
                        "mt-4 pt-4 border-t",
                        isFinalMatch ? "border-primary/30" : "border-white/10"
                      )}>
                        {isFinalMatch ? (
                          // Final Match: Special "Declare Winner" UI
                          <div className="space-y-4">
                            <div className="text-center mb-4">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <Crown className="h-5 w-5 text-primary" />
                                <span className="text-lg font-bold text-foreground">
                                  {isFinalWithWinner ? "Tournament Champion Declared" : "Declare Tournament Winner"}
                                </span>
                                <Crown className="h-5 w-5 text-primary" />
                              </div>
                              {isFinalWithWinner && (
                                <p className="text-xs text-muted-foreground">
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-center gap-3">
                              {match.entry1_id && match.entry1_name && (
                                <Button
                                  size="lg"
                                  variant={
                                    match.winner_entry_id === match.entry1_id
                                      ? "default"
                                      : "outline"
                                  }
                                  className={cn(
                                    match.winner_entry_id === match.entry1_id
                                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/50"
                                      : "glass border-white/10 hover:border-primary/50 hover:bg-primary/10",
                                    "min-w-[180px]"
                                  )}
                                  onClick={() =>
                                    handleSetWinner(
                                      match.id,
                                      match.winner_entry_id === match.entry1_id
                                        ? null
                                        : match.entry1_id
                                    )
                                  }
                                  disabled={updatingMatchId === match.id}
                                >
                                  {updatingMatchId === match.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Declaring...
                                    </>
                                  ) : (
                                    <>
                                      {match.winner_entry_id === match.entry1_id ? (
                                        <Crown className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Trophy className="h-4 w-4 mr-2" />
                                      )}
                                      {match.entry1_name}
                                    </>
                                  )}
                                </Button>
                              )}
                              {match.entry2_id && match.entry2_name && (
                                <Button
                                  size="lg"
                                  variant={
                                    match.winner_entry_id === match.entry2_id
                                      ? "default"
                                      : "outline"
                                  }
                                  className={cn(
                                    match.winner_entry_id === match.entry2_id
                                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/50"
                                      : "glass border-white/10 hover:border-primary/50 hover:bg-primary/10",
                                    "min-w-[180px]"
                                  )}
                                  onClick={() =>
                                    handleSetWinner(
                                      match.id,
                                      match.winner_entry_id === match.entry2_id
                                        ? null
                                        : match.entry2_id
                                    )
                                  }
                                  disabled={updatingMatchId === match.id}
                                >
                                  {updatingMatchId === match.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Declaring...
                                    </>
                                  ) : (
                                    <>
                                      {match.winner_entry_id === match.entry2_id ? (
                                        <Crown className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Trophy className="h-4 w-4 mr-2" />
                                      )}
                                      {match.entry2_name}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            {isFinalWithWinner && (
                              <div className="mt-4 pt-4 border-t border-primary/30 text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <Trophy className="h-5 w-5 text-primary" />
                                  <p className="text-lg font-bold text-primary">
                                    Winner: {match.winner_entry_id === match.entry1_id
                                      ? match.entry1_name
                                      : match.entry2_name}
                                  </p>
                                  <Trophy className="h-5 w-5 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Regular Match: Standard winner assignment UI
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-muted-foreground">
                                  Set Winner:
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {match.entry1_id && match.entry1_name && (
                                  <Button
                                    size="sm"
                                    variant={
                                      match.winner_entry_id === match.entry1_id
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      match.winner_entry_id === match.entry1_id
                                        ? "bg-primary text-white border-primary"
                                        : "glass border-white/10 hover:border-primary/30"
                                    }
                                    onClick={() =>
                                      handleSetWinner(
                                        match.id,
                                        match.winner_entry_id === match.entry1_id
                                          ? null
                                          : match.entry1_id
                                      )
                                    }
                                    disabled={updatingMatchId === match.id}
                                  >
                                    {updatingMatchId === match.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Trophy className="h-3 w-3 mr-1" />
                                    )}
                                    {match.entry1_name}
                                  </Button>
                                )}
                                {match.entry2_id && match.entry2_name && (
                                  <Button
                                    size="sm"
                                    variant={
                                      match.winner_entry_id === match.entry2_id
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      match.winner_entry_id === match.entry2_id
                                        ? "bg-primary text-white border-primary"
                                        : "glass border-white/10 hover:border-primary/30"
                                    }
                                    onClick={() =>
                                      handleSetWinner(
                                        match.id,
                                        match.winner_entry_id === match.entry2_id
                                          ? null
                                          : match.entry2_id
                                      )
                                    }
                                    disabled={updatingMatchId === match.id}
                                  >
                                    {updatingMatchId === match.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Trophy className="h-3 w-3 mr-1" />
                                    )}
                                    {match.entry2_name}
                                  </Button>
              )}
            </div>
          </div>
                            {match.winner_entry_id && (
                              <div className="mt-2 text-xs text-primary font-medium">
                                Winner:{" "}
                                {match.winner_entry_id === match.entry1_id
                                  ? match.entry1_name
                                  : match.entry2_name}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchList;
