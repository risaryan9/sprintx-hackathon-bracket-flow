import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Users, CheckCircle2, AlertCircle, User, Users2, Gavel, MapPin, Clock, Trophy, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getTournamentById, getTournamentEntriesCount, getTournamentEntries, getTournamentCourts, getTournamentUmpires } from "@/services/tournaments";
import { generateFixtures, generateNextRoundFixtures } from "@/services/fixtures";
import { getTournamentMatchesForBracket } from "@/services/bracket";
import { MatchList } from "@/components/MatchList";
import { FixtureView } from "@/components/FixtureView";
import { TournamentBracket } from "@/components/TournamentBracket";
import { TournamentLeaderboard } from "@/components/TournamentLeaderboard";
import { getCurrentRound, areAllMatchesCompleted } from "@/services/matches";
import { Entry } from "@/types/match";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateIdleStatusWithMatch, MatchForIdleCalc } from "@/utils/idleCalculations";
import { useState, useEffect, useMemo } from "react";

const TournamentManage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [aiModeEnabled, setAiModeEnabled] = useState(false);

  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => getTournamentById(tournamentId || ""),
    enabled: !!tournamentId,
  });

  const { data: entriesCount = 0, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["tournament-entries-count", tournamentId],
    queryFn: () => getTournamentEntriesCount(tournamentId || ""),
    enabled: !!tournamentId,
  });

  const { data: entries = [], isLoading: isLoadingEntriesList } = useQuery({
    queryKey: ["tournament-entries", tournamentId],
    queryFn: () => getTournamentEntries(tournamentId || ""),
    enabled: !!tournamentId,
  });

  const { data: courts = [], isLoading: isLoadingCourts } = useQuery({
    queryKey: ["tournament-courts", tournamentId],
    queryFn: () => getTournamentCourts(tournamentId || ""),
    enabled: !!tournamentId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const { data: umpires = [], isLoading: isLoadingUmpires } = useQuery({
    queryKey: ["tournament-umpires", tournamentId],
    queryFn: () => getTournamentUmpires(tournamentId || ""),
    enabled: !!tournamentId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const { data: matches = [], isLoading: isLoadingMatches, isError: isMatchesError } = useQuery({
    queryKey: ["tournament-matches", tournamentId],
    queryFn: () => getTournamentMatchesForBracket(tournamentId || ""),
    enabled: !!tournamentId,
    retry: 1,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Check current round and if all matches are completed (for knockout)
  const { data: currentRound, isLoading: isLoadingRound } = useQuery({
    queryKey: ["tournament-current-round", tournamentId],
    queryFn: () => getCurrentRound(tournamentId || ""),
    enabled: !!tournamentId && !!tournament && tournament.format === "knockouts",
  });

  const { data: canGenerateNextRound, isLoading: isLoadingCanGenerate } = useQuery({
    queryKey: ["tournament-can-generate-next", tournamentId, currentRound],
    queryFn: async () => {
      if (!tournamentId || !currentRound) return false;
      try {
        return await areAllMatchesCompleted(tournamentId, currentRound);
      } catch {
        return false;
      }
    },
    enabled: !!tournamentId && !!currentRound && !!tournament && tournament.format === "knockouts",
  });

  const isMaxEntriesReached =
    tournament && entriesCount >= tournament.max_entries;
  const hasMatches = matches.length > 0;
  const isKnockout = tournament?.format === "knockouts";

  const generateFixturesMutation = useMutation({
    mutationFn: () => generateFixtures(tournamentId || "", {}),
    onSuccess: (result) => {
      if (result.status === "ok") {
        queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-entries", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-entries-count", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-current-round", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-can-generate-next", tournamentId] });
        toast({
          title: "Success",
          description: `Generated ${result.created} fixtures successfully!`,
        });
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) => {
            toast({
              title: "Warning",
              description: warning,
              variant: "default",
            });
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate fixtures",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate fixtures",
        variant: "destructive",
      });
    },
  });

  const generateNextRoundMutation = useMutation({
    mutationFn: () => {
      if (!currentRound) throw new Error("No current round found");
      return generateNextRoundFixtures(tournamentId || "", currentRound, {});
    },
    onSuccess: (result) => {
      if (result.status === "ok") {
        queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-current-round", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-can-generate-next", tournamentId] });
        toast({
          title: "Success",
          description: `Generated ${result.created} next round fixtures successfully!`,
        });
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) => {
            toast({
              title: "Warning",
              description: warning,
              variant: "default",
            });
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate next round fixtures",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate next round fixtures",
        variant: "destructive",
      });
    },
  });

  // Update time every 30 seconds for real-time idle status calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      // Invalidate queries to refresh data from database
      queryClient.invalidateQueries({ queryKey: ["tournament-courts", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament-umpires", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [tournamentId, queryClient]);

  // Convert matches to format needed for idle calculations
  // This recalculates whenever matches or currentTime changes
  const matchesForIdleCalc: MatchForIdleCalc[] = useMemo(() => {
    const result = matches.map((m) => ({
      id: m.id,
      actual_start_time: m.actual_start_time || null,
      duration_minutes: m.duration_minutes || null,
    }));
    console.log("=== matchesForIdleCalc created ===", {
      totalMatches: matches.length,
      matchesForCalc: result.length,
      matchesWithStartTime: result.filter(m => m.actual_start_time).length,
      matchIds: result.map(m => m.id),
    });
    return result;
  }, [matches, currentTime]); // Recalculate when matches or time changes

  // Debug logging (remove in production)
  useEffect(() => {
    console.log("=== Tournament Manage Debug ===");
    console.log("Tournament ID:", tournamentId);
    console.log("Courts count:", courts.length);
    console.log("Umpires count:", umpires.length);
    console.log("Matches count:", matches.length);
    console.log("MatchesForIdleCalc count:", matchesForIdleCalc.length);
    
    if (courts.length > 0) {
      console.log("=== Courts Data ===", courts.map(c => ({
        id: c.id,
        name: c.court_name,
        is_idle: c.is_idle,
        last_assigned_start_time: c.last_assigned_start_time,
        last_assigned_match_id: c.last_assigned_match_id,
        hasStartTime: !!c.last_assigned_start_time,
      })));
      
      // Test calculation for each court
      courts.forEach(court => {
        const testStatus = calculateIdleStatusWithMatch(
          court.is_idle ?? true,
          court.last_assigned_start_time,
          court.last_assigned_match_id,
          matchesForIdleCalc
        );
        console.log(`=== Court "${court.court_name}" Calculation ===`, {
          input: {
            is_idle: court.is_idle,
            last_assigned_start_time: court.last_assigned_start_time,
            last_assigned_match_id: court.last_assigned_match_id,
          },
          calculatedStatus: testStatus,
        });
      });
    }
    
    if (umpires.length > 0) {
      console.log("=== Umpires Data ===", umpires.map(u => ({
        id: u.id,
        name: u.full_name,
        is_idle: u.is_idle,
        last_assigned_start_time: u.last_assigned_start_time,
        last_assigned_match_id: u.last_assigned_match_id,
        hasStartTime: !!u.last_assigned_start_time,
      })));
      
      // Test calculation for each umpire
      umpires.forEach(umpire => {
        const testStatus = calculateIdleStatusWithMatch(
          umpire.is_idle ?? true,
          umpire.last_assigned_start_time,
          umpire.last_assigned_match_id,
          matchesForIdleCalc
        );
        console.log(`=== Umpire "${umpire.full_name}" Calculation ===`, {
          input: {
            is_idle: umpire.is_idle,
            last_assigned_start_time: umpire.last_assigned_start_time,
            last_assigned_match_id: umpire.last_assigned_match_id,
          },
          calculatedStatus: testStatus,
        });
      });
    }
    
    if (matches.length > 0) {
      const startedMatches = matches.filter(m => m.actual_start_time);
      console.log("=== Matches Data ===", {
        total: matches.length,
        started: startedMatches.length,
        matchesWithStartTime: startedMatches.map(m => ({
          id: m.id,
          actual_start_time: m.actual_start_time,
          duration_minutes: m.duration_minutes,
        })),
      });
      
      console.log("=== All Matches for Calculation ===", matchesForIdleCalc);
    }
  }, [courts, umpires, matches, matchesForIdleCalc, tournamentId]);

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="w-full px-4">
          <div className="max-w-7xl mx-auto mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/host")}
              className="mb-6 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            {isLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <div className="text-center py-20">
                <p className="text-lg text-muted-foreground mb-4">
                  We couldn&apos;t load this tournament right now.
                </p>
                <Button onClick={() => navigate("/host")} className="button-gradient">
                  Back to Dashboard
                </Button>
              </div>
            )}

            {tournament && (
              <>
                <Card className="glass border-white/10 mb-6">
                  <CardHeader>
                    <CardTitle className="text-3xl">{tournament.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Bento Box Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Entry Details - Left (Largest) */}
                      <div className="lg:col-span-2 rounded-xl border border-white/10 bg-black/30 p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Entries</p>
                              {isLoadingEntries ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary mt-1" />
                              ) : (
                                <p className="text-2xl font-semibold">
                                  {entriesCount} / {tournament.max_entries}
                                </p>
                              )}
                            </div>
                          </div>
                          {isMaxEntriesReached && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Full
                            </Badge>
                          )}
                        </div>

                        {/* Entries List */}
                        <div className="flex flex-col">
                          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                            Entry Details
                          </h3>
                          {isLoadingEntriesList ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No entries yet
                            </p>
                          ) : (
                            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight: '600px' }}>
                              {entries.map((entry, index) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      {entry.player_id ? (
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">
                                            Player: {entry.player_id.slice(0, 8)}...
                                          </span>
                                        </div>
                                      ) : entry.team_id ? (
                                        <div className="flex items-center gap-2">
                                          <Users2 className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">
                                            Team: {entry.team_id.slice(0, 8)}...
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          Entry #{index + 1}
                                        </span>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Registered: {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-white/10"
                                  >
                                    {entry.status || "Active"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Two Equal Boxes */}
                      <div className="lg:col-span-1 flex flex-col gap-6">
                        {/* Assigned Courts */}
                        <div className="rounded-xl border border-white/10 bg-black/30 p-6 flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Assigned Courts
                            </h3>
                          </div>
                          {isLoadingCourts ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : courts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No courts assigned
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                              {courts.map((court) => {
                                // Calculate idle status for this court
                                const idleStatus = calculateIdleStatusWithMatch(
                                  court.is_idle ?? true,
                                  court.last_assigned_start_time,
                                  court.last_assigned_match_id,
                                  matchesForIdleCalc
                                );
                                
                                // Use calculated status or fall back to database value
                                const displayIsIdle = idleStatus.isIdle !== undefined 
                                  ? idleStatus.isIdle 
                                  : (court.is_idle ?? true);
                                
                                // Debug: log calculation for each court
                                if (court.last_assigned_match_id) {
                                  console.log(`Court "${court.court_name}" calculation:`, {
                                    courtData: {
                                      is_idle: court.is_idle,
                                      last_assigned_start_time: court.last_assigned_start_time,
                                      last_assigned_match_id: court.last_assigned_match_id,
                                    },
                                    calculatedStatus: idleStatus,
                                    displayIsIdle,
                                    matchFound: matchesForIdleCalc.find(m => m.id === court.last_assigned_match_id) || null,
                                  });
                                }
                                
                                return (
                                  <div
                                    key={court.id}
                                    className="p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{court.court_name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={
                                            displayIsIdle
                                              ? "text-xs border-green-500/30 bg-green-500/10 text-green-400"
                                              : "text-xs border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                          }
                                        >
                                          {displayIsIdle ? "Idle" : "Busy"}
                                        </Badge>
                                      </div>
                                    </div>
                                    {court.location && (
                                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                                        {court.location}
                                      </p>
                                    )}
                                    {!idleStatus.isIdle && (
                                      <div className="flex items-center gap-1 mt-2 ml-6 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {idleStatus.timeUntilIdleFormatted 
                                            ? `Free in ${idleStatus.timeUntilIdleFormatted}`
                                            : "Match in progress"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Assigned Umpires */}
                        <div className="rounded-xl border border-white/10 bg-black/30 p-6 flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <Gavel className="h-5 w-5 text-primary" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Assigned Umpires
                            </h3>
                          </div>
                          {isLoadingUmpires ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : umpires.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No umpires assigned
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                              {umpires.map((umpire) => {
                                // Calculate idle status for this umpire
                                const idleStatus = calculateIdleStatusWithMatch(
                                  umpire.is_idle ?? true,
                                  umpire.last_assigned_start_time,
                                  umpire.last_assigned_match_id,
                                  matchesForIdleCalc
                                );
                                
                                // Debug: log calculation for each umpire
                                if (umpire.last_assigned_match_id) {
                                  console.log(`Umpire "${umpire.full_name}" calculation:`, {
                                    umpireData: {
                                      is_idle: umpire.is_idle,
                                      last_assigned_start_time: umpire.last_assigned_start_time,
                                      last_assigned_match_id: umpire.last_assigned_match_id,
                                    },
                                    calculatedStatus: idleStatus,
                                    matchFound: matchesForIdleCalc.find(m => m.id === umpire.last_assigned_match_id) || null,
                                  });
                                }
                                
                                return (
                                  <div
                                    key={umpire.id}
                                    className="p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Gavel className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{umpire.full_name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={
                                            (idleStatus.isIdle !== undefined ? idleStatus.isIdle : (umpire.is_idle ?? true))
                                              ? "text-xs border-green-500/30 bg-green-500/10 text-green-400"
                                              : "text-xs border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                          }
                                        >
                                          {(idleStatus.isIdle !== undefined ? idleStatus.isIdle : (umpire.is_idle ?? true)) ? "Idle" : "Busy"}
                                        </Badge>
                                      </div>
                                    </div>
                                    {umpire.license_no && (
                                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                                        License: {umpire.license_no}
                                      </p>
                                    )}
                                    {umpire.contact && (
                                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                                        {umpire.contact}
                                      </p>
                                    )}
                                    {!(idleStatus.isIdle !== undefined ? idleStatus.isIdle : (umpire.is_idle ?? true)) && (
                                      <div className="flex items-center gap-1 mt-2 ml-6 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {idleStatus.timeUntilIdleFormatted 
                                            ? `Free in ${idleStatus.timeUntilIdleFormatted}`
                                            : "Match in progress"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Tournament Leaderboard */}
                        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Trophy className="h-4 w-4 text-primary" />
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Leaderboard
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            View the current standings for  this tournament
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLeaderboardOpen(true)}
                            className="w-full h-9 text-sm border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all"
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            View Leaderboard
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Generate Fixtures Button - Only show if no matches exist */}
                    {!hasMatches && (
                      <div className="flex flex-col items-center gap-4 mt-6">
                        <div className="flex items-center gap-4">
                          <Button
                            className={`${
                              isMaxEntriesReached
                                ? "button-gradient"
                                : "bg-gray-600/50 text-gray-400 cursor-not-allowed hover:bg-gray-600/50"
                            }`}
                            onClick={() => generateFixturesMutation.mutate()}
                            disabled={!isMaxEntriesReached || generateFixturesMutation.isPending}
                          >
                            {generateFixturesMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                Generate Fixtures
                                {!isMaxEntriesReached && (
                                  <span className="ml-2 text-xs">
                                    ({tournament.max_entries - entriesCount} more needed)
                                  </span>
                                )}
                              </>
                            )}
                          </Button>
                          
                          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-white/10 bg-black/30">
                            <Switch
                              id="ai-mode"
                              checked={aiModeEnabled}
                              onCheckedChange={setAiModeEnabled}
                            />
                            <Label
                              htmlFor="ai-mode"
                              className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                            >
                              <Sparkles className="h-4 w-4 text-primary" />
                              AI Mode
                            </Label>
                          </div>
                        </div>
                        {aiModeEnabled && (
                          <p className="text-xs text-muted-foreground text-center">
                            AI-powered scheduling will optimize match assignments and court utilization
                          </p>
                        )}
                      </div>
                    )}
                    {generateFixturesMutation.data && generateFixturesMutation.data.status === "ok" && (
                      <Alert className="mt-4 bg-green-500/10 border-green-500/20">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <AlertTitle>Fixtures Generated</AlertTitle>
                        <AlertDescription>
                          Successfully created {generateFixturesMutation.data.created} match
                          {generateFixturesMutation.data.created !== 1 ? "es" : ""}.
                        </AlertDescription>
                      </Alert>
                    )}
                    {generateFixturesMutation.data && generateFixturesMutation.data.status === "error" && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          {generateFixturesMutation.data.error || "Failed to generate fixtures"}
                        </AlertDescription>
                      </Alert>
                    )}
                </CardContent>
              </Card>
              </>
            )}
          </div>
        </section>

        {/* Match List */}
        {hasMatches && (
          <section className="w-full py-8">
            <div className="max-w-7xl mx-auto px-4 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Match Fixtures</h3>
                  <p className="text-sm text-muted-foreground">
                    All scheduled matches for this tournament
                  </p>
                </div>
                {isKnockout && currentRound && (
                  <Button
                    className={`${
                      canGenerateNextRound
                        ? "button-gradient"
                        : "bg-gray-600/50 text-gray-400 cursor-not-allowed hover:bg-gray-600/50"
                    }`}
                    onClick={() => generateNextRoundMutation.mutate()}
                    disabled={
                      !canGenerateNextRound ||
                      generateNextRoundMutation.isPending ||
                      isLoadingCanGenerate ||
                      isLoadingRound
                    }
                  >
                    {generateNextRoundMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Next Round
                        {currentRound && (
                          <span className="ml-2 text-xs">
                            ({currentRound})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                )}
              </div>
              {isKnockout && currentRound && (
                <div className="mb-4 text-sm text-muted-foreground">
                  Current Round: <span className="text-foreground font-medium">{currentRound}</span>
                  {canGenerateNextRound === false && (
                    <span className="ml-2 text-yellow-400">
                      (Complete all matches to generate next round)
                    </span>
                  )}
                </div>
              )}
            </div>
            {isLoadingMatches ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isMatchesError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Failed to load matches. Please try refreshing.
                </p>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] })}
                >
                  Retry
                </Button>
              </div>
            ) : tournament && (
              <div className="max-w-7xl mx-auto px-4">
                <Tabs defaultValue="fixtures" className="w-full">
                  <TabsList className={`grid w-full max-w-md mb-6 bg-black/30 border border-white/10 ${(tournament.format === "knockouts" || tournament.format === "double_elimination") ? "grid-cols-2" : "grid-cols-1"}`}>
                    <TabsTrigger value="fixtures" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                      Fixture View
                    </TabsTrigger>
                    {(tournament.format === "knockouts" || tournament.format === "double_elimination") && (
                      <TabsTrigger value="bracket" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                        Bracket View
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="fixtures" className="mt-0">
                    <FixtureView
                      matches={matches}
                      tournamentId={tournamentId || ""}
                      currentRound={currentRound || null}
                    />
                  </TabsContent>
                  
                  {(tournament.format === "knockouts" || tournament.format === "double_elimination") && (
                    <TabsContent value="bracket" className="mt-0">
                      <TournamentBracket 
                        matches={matches} 
                        tournamentFormat={tournament.format}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
      
      {/* Tournament Leaderboard Dialog */}
      {tournament && (
        <TournamentLeaderboard
          open={leaderboardOpen}
          onOpenChange={setLeaderboardOpen}
          tournamentName={tournament.name}
        />
      )}
    </div>
  );
};

export default TournamentManage;

