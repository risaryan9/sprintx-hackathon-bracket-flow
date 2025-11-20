import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Users, CheckCircle2, AlertCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getTournamentById, getTournamentEntriesCount } from "@/services/tournaments";
import { generateFixtures } from "@/services/fixtures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

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
    queryKey: ["tournament-entries", tournamentId],
    queryFn: () => getTournamentEntriesCount(tournamentId || ""),
    enabled: !!tournamentId,
  });

  const isMaxEntriesReached =
    tournament && entriesCount >= tournament.max_entries;

  const generateFixturesMutation = useMutation({
    mutationFn: () => generateFixtures(tournamentId || "", {}),
    onSuccess: (result) => {
      if (result.status === "ok") {
        queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
        queryClient.invalidateQueries({ queryKey: ["tournament-entries", tournamentId] });
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
        <section className="container px-4">
          <div className="max-w-4xl mx-auto">
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
              <Card className="glass border-white/10">
                <CardHeader>
                  <CardTitle className="text-3xl">{tournament.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                    <div className="flex items-center justify-between mb-4">
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
                    {isMaxEntriesReached && (
                      <Button
                        className="button-gradient w-full mt-4"
                        onClick={() => generateFixturesMutation.mutate()}
                        disabled={generateFixturesMutation.isPending}
                      >
                        {generateFixturesMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate Fixtures"
                        )}
                      </Button>
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
                  <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                    <p className="text-lg text-muted-foreground">
                      Detailed tournament management dashboards for fixtures, schedules, and
                      participants are coming soon.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TournamentManage;

