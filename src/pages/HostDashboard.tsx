import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Plus, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getOrganizerTournaments } from "@/services/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const HostDashboard = () => {
  const { organizerName, logout } = useAuth();
  const navigate = useNavigate();

  const { data: tournaments = [], isLoading, isError } = useQuery({
    queryKey: ["organizer-tournaments", organizerName],
    queryFn: () => getOrganizerTournaments(organizerName || ""),
    enabled: !!organizerName,
  });

  const handleLogout = () => {
    logout();
    navigate("/host/login");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="container px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-semibold mb-2">Organizer Dashboard</h1>
                <p className="text-muted-foreground text-lg">
                  Manage your tournaments and events
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/host/tournaments/new")}
                  className="button-gradient"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tournament
                </Button>
                <Button variant="outline" onClick={handleLogout} className="border-white/10">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <div className="text-center py-20">
                <p className="text-lg text-muted-foreground mb-4">
                  We couldn&apos;t load your tournaments right now.
                </p>
                <Button onClick={() => window.location.reload()} className="button-gradient">
                  Retry
                </Button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                {tournaments.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl font-semibold mb-3">No tournaments found</p>
                    <p className="text-muted-foreground mb-6">
                      Get started by creating your first tournament.
                    </p>
                    <Button
                      onClick={() => navigate("/host/tournaments/new")}
                      className="button-gradient"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tournament
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {tournaments.map((tournament) => (
                      <Card
                        key={tournament.id}
                        className="bg-[#0C0C0C] border-white/5 hover:border-primary/50 transition-all duration-300 flex flex-col"
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={tournament.image_url}
                            alt={tournament.name}
                            className="object-cover w-full h-full"
                            loading="lazy"
                          />
                          <Badge className="absolute top-4 left-4 bg-black/70 text-white rounded-full px-3 py-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {tournament.city}
                          </Badge>
                          <Badge
                            variant={tournament.is_active ? "default" : "secondary"}
                            className="absolute top-4 right-4 rounded-full px-3 py-1"
                          >
                            {tournament.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardHeader className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-xl">{tournament.name}</CardTitle>
                            <Badge variant="outline" className="rounded-full">
                              {tournament.sport}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {tournament.category} • {tournament.format} •{" "}
                            {tournament.is_team_based ? "Team" : "Individual"}
                          </p>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>
                              {format(new Date(tournament.start_date), "MMM d, yyyy")} –{" "}
                              {format(new Date(tournament.end_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl border border-white/5 p-3 bg-white/5">
                              <p className="text-muted-foreground text-xs mb-1">Prize Pool</p>
                              <p className="font-semibold">{formatCurrency(tournament.prize_pool)}</p>
                            </div>
                            <div className="rounded-xl border border-white/5 p-3 bg-white/5">
                              <p className="text-muted-foreground text-xs mb-1">Registration Fee</p>
                              <p className="font-semibold">
                                {formatCurrency(tournament.registration_fee)}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Venue: {tournament.venue}</p>
                            {tournament.is_team_based && (
                              <p>Max players per team: {tournament.max_players_per_team}</p>
                            )}
                            <p>Max entries: {tournament.max_entries}</p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            onClick={() => navigate(`/host/tournaments/${tournament.id}`)}
                            className="button-gradient w-full"
                          >
                            Manage
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HostDashboard;

