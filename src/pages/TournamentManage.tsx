import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Users, CheckCircle2, AlertCircle, User, Users2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getTournamentById, getTournamentEntriesCount, getTournamentEntries } from "@/services/tournaments";
import { generateFixtures } from "@/services/fixtures";
import { getTournamentMatchesForBracket } from "@/services/bracket";
import { MatchList } from "@/components/MatchList";
import { Entry } from "@/types/match";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TournamentManage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: matches = [], isLoading: isLoadingMatches, isError: isMatchesError } = useQuery({
    queryKey: ["tournament-matches", tournamentId],
    queryFn: () => getTournamentMatchesForBracket(tournamentId || ""),
    enabled: !!tournamentId,
    retry: 1,
  });

  const isMaxEntriesReached =
    tournament && entriesCount >= tournament.max_entries;
  const hasMatches = matches.length > 0;

  const generateFixturesMutation = useMutation({
    mutationFn: () => generateFixtures(tournamentId || "", {}),
    onSuccess: (result) => {
      if (result.status === "ok") {
        queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-entries", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-entries-count", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
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

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="w-full px-4">
          <div className="max-w-4xl mx-auto mb-8">
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
                  <div className="rounded-xl border border-white/10 bg-black/30 p-6">
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
                    <div className="mb-6">
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
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
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

                    {/* Generate Fixtures Button - Only show if no matches exist */}
                    {!hasMatches && (
                      <div className="flex justify-center">
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
                  </div>
                </CardContent>
              </Card>
              </>
            )}
          </div>
        </section>

        {/* Match List */}
        {hasMatches && (
          <section className="w-full py-8">
            <div className="max-w-4xl mx-auto px-4 mb-8">
              <h3 className="text-2xl font-semibold mb-2">Match Fixtures</h3>
              <p className="text-sm text-muted-foreground">
                All scheduled matches for this tournament
              </p>
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
            ) : (
              <MatchList matches={matches} />
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TournamentManage;

