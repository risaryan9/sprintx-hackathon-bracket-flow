import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Check,
  Play,
  Clock,
  Calendar,
  MapPin,
  Trophy,
  User,
  Mail,
  Phone,
  Award,
  Briefcase,
  FileText,
  Search,
  AlertCircle,
  Gavel,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getUmpireMatchesByLicense,
  validateMatchCode,
  submitMatchScore,
  getMatchByCode,
  MatchScoreInput,
} from "@/services/umpires";
import { startMatch } from "@/services/matches";
import { autoUpdateIdleStatus } from "@/services/matchStatus";
import { parseAsUTC } from "@/utils/timestampParser";
import { MatchScoring } from "@/components/MatchScoring";
import { MatchTimer } from "@/components/MatchTimer";
import { BracketMatch } from "@/types/bracket";
import { useToast } from "@/hooks/use-toast";

const UmpireDashboard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [licenseNo, setLicenseNo] = useState("");
  const [submittedLicenseNo, setSubmittedLicenseNo] = useState<string | null>(null);
  const [matchCode, setMatchCode] = useState("");
  const [validatedMatch, setValidatedMatch] = useState<BracketMatch | null>(null);
  const [validatingMatchCode, setValidatingMatchCode] = useState(false);
  const [matchCodeError, setMatchCodeError] = useState<string | null>(null);
  const [startedMatches, setStartedMatches] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: umpireData, isLoading, isError, error } = useQuery({
    queryKey: ["umpire-matches", submittedLicenseNo],
    queryFn: () => getUmpireMatchesByLicense(submittedLicenseNo!),
    enabled: !!submittedLicenseNo,
    retry: false,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update startedMatches state when validated match is loaded
  useEffect(() => {
    if (validatedMatch?.actual_start_time) {
      setStartedMatches((prev) => new Set(prev).add(validatedMatch.id));
    }
  }, [validatedMatch]);

  // Auto-update idle status and refresh time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (submittedLicenseNo) {
        autoUpdateIdleStatus().then(() => {
          queryClient.invalidateQueries({ queryKey: ["umpire-matches", submittedLicenseNo] });
          if (validatedMatch) {
            // Refresh validated match (skip validation if already completed)
            handleMatchCodeSubmit(matchCode, validatedMatch.is_completed || false);
          }
        });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [submittedLicenseNo, queryClient, validatedMatch, matchCode]);

  // Calculate remaining time for a match
  const calculateRemainingTime = (match: BracketMatch): { minutesRemaining: number | null; isExpired: boolean } => {
    if (!match.actual_start_time || !match.duration_minutes) {
      return { minutesRemaining: null, isExpired: false };
    }

    try {
      const startTime = parseAsUTC(match.actual_start_time);
      
      if (!startTime) {
        return { minutesRemaining: null, isExpired: false };
      }

      const endTime = new Date(startTime.getTime() + match.duration_minutes * 60 * 1000);
      const timeRemainingMs = endTime.getTime() - currentTime.getTime();
      
      if (timeRemainingMs <= 0) {
        return { minutesRemaining: 0, isExpired: true };
      }

      return {
        minutesRemaining: Math.ceil(timeRemainingMs / (60 * 1000)),
        isExpired: false,
      };
    } catch (error) {
      console.error("Error calculating remaining time:", error);
      return { minutesRemaining: null, isExpired: false };
    }
  };

  // Format time remaining
  const formatTimeRemaining = (minutes: number | null): string => {
    if (minutes === null || minutes <= 0) return "Time expired";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (licenseNo.trim()) {
      setSubmittedLicenseNo(licenseNo.trim());
      setMatchCode("");
      setValidatedMatch(null);
      setMatchCodeError(null);
      setStartedMatches(new Set());
    }
  };

  const handleMatchCodeSubmit = async (code: string, skipValidation = false) => {
    if (!code.trim() || !umpireData) return;

    setValidatingMatchCode(true);
    setMatchCodeError(null);

    try {
      // Get match by code and verify it's assigned to this umpire
      const match = await getMatchByCode(code.trim(), umpireData.umpire.id);
      
      if (!match) {
        setMatchCodeError("Match code not found or not assigned to you.");
        setValidatedMatch(null);
        return;
      }

      // Skip validation if match is already completed or if explicitly requested
      if (skipValidation || match.is_completed) {
        setValidatedMatch(match);
        setMatchCodeError(null);
        if (!skipValidation) {
          toast({
            title: "Match loaded",
            description: "Match information has been loaded.",
          });
        }
      } else {
        // Validate the match code only for non-completed matches
        const isValid = await validateMatchCode(match.id, code.trim());
        
        if (isValid) {
          setValidatedMatch(match);
          setMatchCodeError(null);
          toast({
            title: "Match code validated",
            description: "You can now manage the match.",
          });
        } else {
          setMatchCodeError("Invalid match code. Please try again.");
          setValidatedMatch(null);
        }
      }
    } catch (err) {
      // If validation fails, try to fetch the match again to check if it's completed
      // If it's completed, we can still show it without validation
      try {
        const match = await getMatchByCode(code.trim(), umpireData.umpire.id);
        if (match && (skipValidation || match.is_completed)) {
          // If match is completed or we're skipping validation, show it anyway
          setValidatedMatch(match);
          setMatchCodeError(null);
        } else {
          // Otherwise, show the validation error
          setMatchCodeError(
            err instanceof Error ? err.message : "Failed to validate match code."
          );
          setValidatedMatch(null);
        }
      } catch (fetchError) {
        // If we can't even fetch the match, show the original error
        setMatchCodeError(
          err instanceof Error ? err.message : "Failed to validate match code."
        );
        setValidatedMatch(null);
      }
    } finally {
      setValidatingMatchCode(false);
    }
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
    if (!tournamentId || !umpireData) return "Unknown Tournament";
    return umpireData.tournamentNames[tournamentId] || `Tournament ${tournamentId.slice(0, 8)}`;
  };

  const getTournamentSport = (tournamentId: string | null) => {
    if (!tournamentId || !umpireData) return "";
    return umpireData.tournamentSports[tournamentId] || "";
  };

  const handleScoreSubmit = async (matchId: string, scoreInput: MatchScoreInput) => {
    if (!validatedMatch) return;

    try {
      await submitMatchScore(
        matchId,
        validatedMatch.entry1_id,
        validatedMatch.entry2_id,
        scoreInput
      );

      // Refresh match without validation (since it's now completed)
      await handleMatchCodeSubmit(matchCode, true);
      
      // Clear validated match and match code after showing success
      setTimeout(() => {
        setValidatedMatch(null);
        setMatchCode("");
      }, 2000);

      toast({
        title: "Match completed",
        description: "Match results have been submitted successfully.",
      });
    } catch (err) {
      throw err; // Re-throw to let MatchScoring handle it
    }
  };

  const handleScoreCancel = () => {
    setValidatedMatch(null);
    setMatchCode("");
  };

  const handleStartMatch = async (matchId: string) => {
    try {
      await startMatch(matchId);
      setStartedMatches((prev) => new Set(prev).add(matchId));
      
      // Refresh validated match (skip validation if already completed)
      await handleMatchCodeSubmit(matchCode, validatedMatch?.is_completed || false);
      
      toast({
        title: "Match Started",
        description: "Match timer has been started.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start match.",
        variant: "destructive",
      });
    }
  };

  // Parse sports_expertise JSON if it's a string
  const parseSportsExpertise = (expertise: string | null): string[] => {
    if (!expertise) return [];
    try {
      if (typeof expertise === 'string' && expertise.startsWith('[')) {
        return JSON.parse(expertise);
      }
      return expertise.split(',').map(s => s.trim());
    } catch {
      return expertise.split(',').map(s => s.trim());
    }
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="container px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                Umpire Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Enter your license number to access your dashboard
              </p>
            </div>

            {/* License Input Form */}
            {!submittedLicenseNo && (
              <Card className="glass border-white/10 mb-8 max-w-2xl mx-auto">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter your license number (e.g., IND-UMP-5099)"
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
                        "Access Dashboard"
                      )}
                    </Button>
                  </form>

                  {/* Error Message */}
                  {isError && submittedLicenseNo && (
                    <Alert variant="destructive" className="mt-4 bg-red-500/10 border-red-500/30">
                      <AlertDescription className="text-red-400">
                        {error instanceof Error
                          ? error.message
                          : "An error occurred while fetching your data."}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && submittedLicenseNo && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}

            {/* Dashboard - Two Column Layout */}
            {umpireData && !isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Umpire Profile */}
                <div className="lg:col-span-1">
                  <Card className="glass border-white/10 sticky top-24">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                          <Gavel className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{umpireData.umpire.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {umpireData.umpire.license_no}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Contact Info */}
                      <div className="space-y-2">
                        {umpireData.umpire.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{umpireData.umpire.email}</span>
                          </div>
                        )}
                        {umpireData.umpire.contact && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{umpireData.umpire.contact}</span>
                          </div>
                        )}
                      </div>

                      {/* Profile Details */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        {umpireData.umpire.age && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Age:</span>
                            <span className="font-medium">{umpireData.umpire.age} years</span>
                          </div>
                        )}
                        {umpireData.umpire.gender && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gender:</span>
                            <span className="font-medium capitalize">{umpireData.umpire.gender}</span>
                          </div>
                        )}
                        {umpireData.umpire.experience_years && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Experience:</span>
                            <span className="font-medium">{umpireData.umpire.experience_years} years</span>
                          </div>
                        )}
                        {umpireData.umpire.certification_level && (
                          <div className="flex items-center gap-2 text-sm">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Certification:</span>
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs capitalize">
                              {umpireData.umpire.certification_level}
                            </Badge>
                          </div>
                        )}
                        {umpireData.umpire.association && (
                          <div className="flex items-start gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="text-muted-foreground">Association:</span>
                              <p className="font-medium">{umpireData.umpire.association}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sports Expertise */}
                      {umpireData.umpire.sports_expertise && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Sports Expertise:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {parseSportsExpertise(umpireData.umpire.sports_expertise).map((sport, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary">
                                {sport}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {umpireData.umpire.bio && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Bio:</span>
                          </div>
                          <p className="text-sm text-foreground/80">{umpireData.umpire.bio}</p>
                        </div>
                      )}

                      {/* Status */}
                      <div className="pt-4 border-t border-white/10">
                        <Badge
                          variant="outline"
                          className={
                            umpireData.umpire.is_idle
                              ? "bg-green-500/20 text-green-400 border-green-500/50"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                          }
                        >
                          {umpireData.umpire.is_idle ? "Available" : "Busy"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Match Code Search */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Match Code Input */}
                  <Card className="glass border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Enter Match Code
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="match-code" className="text-sm font-medium mb-2 block">
                            Match Code
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="match-code"
                              type="text"
                              placeholder="Enter match code"
                              value={matchCode}
                              onChange={(e) => {
                                setMatchCode(e.target.value);
                                setMatchCodeError(null);
                              }}
                              disabled={validatingMatchCode}
                              className="flex-1 bg-black/40 border-white/10 font-mono"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && matchCode.trim()) {
                                  handleMatchCodeSubmit(matchCode);
                                }
                              }}
                            />
                            <Button
                              onClick={() => handleMatchCodeSubmit(matchCode)}
                              disabled={!matchCode.trim() || validatingMatchCode}
                              className="button-gradient"
                            >
                              {validatingMatchCode ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Validate
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {matchCodeError && (
                          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-400 text-sm">
                              {matchCodeError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {validatedMatch && (
                          <Alert className="bg-green-500/10 border-green-500/30">
                            <Check className="h-4 w-4 text-green-400" />
                            <AlertTitle className="text-green-400">Match Code Verified</AlertTitle>
                            <AlertDescription className="text-green-300 text-sm">
                              You can now manage this match.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Validated Match Display */}
                  {validatedMatch && (
                    <Card className="glass border-primary/30">
                      <CardContent className="p-6">
                        {/* Match Header */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-primary">
                                {getTournamentName(validatedMatch.tournament_id)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-2xl font-semibold text-foreground">
                                {validatedMatch.entry1_name || "TBD"}
                              </span>
                              <span className="text-muted-foreground px-2 font-medium">vs</span>
                              <span className="text-2xl font-semibold text-foreground">
                                {validatedMatch.entry2_name || "BYE"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {validatedMatch.round && (
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
                                {validatedMatch.round}
                              </Badge>
                            )}
                            {validatedMatch.is_completed ? (
                              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 text-xs">
                                Completed
                              </Badge>
                            ) : validatedMatch.actual_start_time ? (
                              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs">
                                Running
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs">
                                Upcoming
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Match Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">Scheduled Time:</span>
                              <span className="text-foreground">{formatTime(validatedMatch.scheduled_time)}</span>
                            </div>
                            {validatedMatch.court_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground font-medium">Court:</span>
                                <span className="text-primary font-medium">{validatedMatch.court_name}</span>
                              </div>
                            )}
                          </div>
                          {validatedMatch.actual_start_time && validatedMatch.duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground font-medium">Time Remaining:</span>
                              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs">
                                {(() => {
                                  const { minutesRemaining } = calculateRemainingTime(validatedMatch);
                                  return minutesRemaining !== null && minutesRemaining > 0
                                    ? formatTimeRemaining(minutesRemaining)
                                    : "Time expired";
                                })()}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Match Timer - Show if match is started */}
                        {validatedMatch.actual_start_time &&
                          validatedMatch.duration_minutes &&
                          validatedMatch.duration_minutes > 0 && (
                            <div className="mb-6">
                              <MatchTimer
                                durationMinutes={validatedMatch.duration_minutes}
                                actualStartTime={validatedMatch.actual_start_time || null}
                                autoStart={true}
                                onComplete={() => {
                                  toast({
                                    title: "Match Time Expired",
                                    description: "The match duration has been reached. Please submit the result.",
                                  });
                                  handleMatchCodeSubmit(matchCode);
                                }}
                              />
                            </div>
                          )}

                        {/* Start Match Button - Show if not started */}
                        {!validatedMatch.actual_start_time &&
                          validatedMatch.duration_minutes &&
                          validatedMatch.duration_minutes > 0 &&
                          !validatedMatch.is_completed && (
                            <div className="flex justify-center mb-6">
                              <Button onClick={() => handleStartMatch(validatedMatch.id)} className="button-gradient">
                                <Play className="h-4 w-4 mr-2" />
                                Start Match
                              </Button>
                            </div>
                          )}

                        {/* Scoring Interface */}
                        <div className="pt-6 border-t border-white/10">
                          <MatchScoring
                            match={validatedMatch}
                            sport={getTournamentSport(validatedMatch.tournament_id)}
                            onSubmit={(scoreInput) => handleScoreSubmit(validatedMatch.id, scoreInput)}
                            onCancel={handleScoreCancel}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* No Match Message */}
                  {!validatedMatch && !matchCodeError && umpireData.matches.length > 0 && (
                    <Card className="glass border-white/10">
                      <CardContent className="p-12 text-center">
                        <p className="text-lg font-semibold mb-2">Enter a match code</p>
                        <p className="text-muted-foreground">
                          You have {umpireData.matches.length} assigned match{umpireData.matches.length > 1 ? "es" : ""}. 
                          Enter the match code to manage it.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* No Matches Assigned */}
                  {!validatedMatch && umpireData.matches.length === 0 && (
                    <Card className="glass border-white/10">
                      <CardContent className="p-12 text-center">
                        <p className="text-lg font-semibold mb-2">No matches assigned</p>
                        <p className="text-muted-foreground">
                          You don't have any assigned matches at the moment.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default UmpireDashboard;
