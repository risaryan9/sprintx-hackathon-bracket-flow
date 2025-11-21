import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Eye, EyeOff, Calendar, MapPin, Trophy, User } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getUmpireMatchesByLicense } from "@/services/umpires";
import { BracketMatch } from "@/types/bracket";

const UmpireDashboard = () => {
  const [licenseNo, setLicenseNo] = useState("");
  const [submittedLicenseNo, setSubmittedLicenseNo] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["umpire-matches", submittedLicenseNo],
    queryFn: () => getUmpireMatchesByLicense(submittedLicenseNo!),
    enabled: !!submittedLicenseNo,
    retry: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (licenseNo.trim()) {
      setSubmittedLicenseNo(licenseNo.trim());
      setRevealedCodes(new Set()); // Reset revealed codes on new search
    }
  };

  const toggleRevealCode = (matchId: string) => {
    setRevealedCodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "TBD";
    try {
      return format(new Date(timeStr), "MMM d, yyyy h:mm a");
    } catch {
      return timeStr;
    }
  };

  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId || !data) return "Unknown Tournament";
    return data.tournamentNames[tournamentId] || `Tournament ${tournamentId.slice(0, 8)}`;
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="container px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                Umpire Match Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Enter your license number to view all upcoming matches assigned to you
              </p>
            </div>

            {/* License Input Form */}
            <Card className="glass border-white/10 mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter your license number"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="bg-black/40 border-white/10 h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="button-gradient h-12 px-8"
                    disabled={!licenseNo.trim() || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "View Matches"
                    )}
                  </Button>
                </form>

                {/* Error Message */}
                {isError && submittedLicenseNo && (
                  <Alert variant="destructive" className="mt-4 bg-red-500/10 border-red-500/30">
                    <AlertDescription className="text-red-400">
                      {error instanceof Error
                        ? error.message
                        : "An error occurred while fetching your matches."}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && submittedLicenseNo && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}

            {/* Matches Display */}
            {data && !isLoading && (
              <>
                {/* Umpire Info */}
                <Card className="glass border-white/10 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{data.umpire.full_name}</h2>
                        <p className="text-sm text-muted-foreground">
                          License: {data.umpire.license_no}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Matches List */}
                {data.matches.length === 0 ? (
                  <Card className="glass border-white/10">
                    <CardContent className="p-12 text-center">
                      <p className="text-lg font-semibold mb-2">No upcoming matches assigned</p>
                      <p className="text-muted-foreground">
                        You don't have any upcoming matches at the moment.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold">Upcoming Matches</h2>
                      <Badge
                        variant="outline"
                        className="border-white/20 bg-white/5 text-white/80"
                      >
                        {data.matches.length} {data.matches.length === 1 ? "match" : "matches"}
                      </Badge>
                    </div>

                    {data.matches.map((match) => {
                      const tournamentName = getTournamentName(match.tournament_id);
                      const isCodeRevealed = revealedCodes.has(match.id);

                      return (
                        <Card
                          key={match.id}
                          className="glass border-white/10 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
                        >
                          <CardContent className="p-6">
                            {/* Match Header */}
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium text-primary">
                                    {tournamentName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xl font-semibold text-foreground">
                                    {match.entry1_name || "TBD"}
                                  </span>
                                  <span className="text-muted-foreground px-2 font-medium">vs</span>
                                  <span className="text-xl font-semibold text-foreground">
                                    {match.entry2_name || "BYE"}
                                  </span>
                                </div>
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
                                <Badge
                                  variant="outline"
                                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs"
                                >
                                  Upcoming
                                </Badge>
                              </div>
                            </div>

                            {/* Match Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground font-medium">
                                    Scheduled Time:
                                  </span>
                                  <span className="text-foreground">
                                    {formatTime(match.scheduled_time)}
                                  </span>
                                </div>
                                {match.court_name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground font-medium">Court:</span>
                                    <span className="text-primary font-medium">
                                      {match.court_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                {match.match_order && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground font-medium">
                                      Match Order:
                                    </span>
                                    <span className="text-foreground ml-2">
                                      {match.match_order}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Match Code Section */}
                            {match.match_code && (
                              <div className="pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Match Code:
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRevealCode(match.id)}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    {isCodeRevealed ? (
                                      <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Hide Code
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Reveal Code
                                      </>
                                    )}
                                  </Button>
                                </div>
                                {isCodeRevealed && (
                                  <div className="mt-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                                    <code className="text-primary font-mono font-semibold">
                                      {match.match_code}
                                    </code>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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

export default UmpireDashboard;

