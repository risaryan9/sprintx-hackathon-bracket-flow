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
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MatchListProps {
  matches: BracketMatch[];
}

interface MatchFilters {
  round: string | null;
  courtId: string | null;
  umpireId: string | null;
  date: Date | null;
  completionStatus: "all" | "completed" | "pending";
}

export const MatchList = ({ matches }: MatchListProps) => {
  const [filters, setFilters] = useState<MatchFilters>({
    round: null,
    courtId: null,
    umpireId: null,
    date: null,
    completionStatus: "all",
  });

  // Extract distinct values for filters
  const distinctRounds = useMemo(() => {
    const rounds = new Set<string>();
    matches.forEach((match) => {
      if (match.round) rounds.add(match.round);
    });
    return Array.from(rounds).sort();
  }, [matches]);

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
  }, [matches, filters]);

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

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No matches available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Filter Section */}
      <Card className="glass border-white/10 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Filters</CardTitle>
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
                {groupMatches.map((match) => (
                  <Card
                    key={match.id}
                    className="glass border-white/10 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <CardContent className="p-6">
                      {/* Top Section: Player Names & Round */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <span className="text-xl font-semibold text-foreground">
                            {match.entry1_name || "TBD"}
                          </span>
                          <span className="text-muted-foreground px-2 font-medium">
                            vs
                          </span>
                          <span className="text-xl font-semibold text-foreground">
                            {match.entry2_name || "BYE"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {match.round && (
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/10 text-primary text-xs"
                            >
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchList;
