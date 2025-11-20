import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getTournamentById, getTournamentEntriesCount } from "@/services/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TournamentManage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();

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
                        onClick={() => {
                          // Placeholder - button does nothing for now
                        }}
                      >
                        Generate Fixtures
                      </Button>
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

