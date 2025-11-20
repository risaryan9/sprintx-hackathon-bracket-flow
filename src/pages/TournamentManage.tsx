import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getTournamentById } from "@/services/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TournamentManage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();

  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => getTournamentById(tournamentId || ""),
    enabled: !!tournamentId,
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

