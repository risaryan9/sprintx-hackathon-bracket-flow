import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trophy, XCircle } from "lucide-react";
import { BracketMatch } from "@/types/bracket";
import { MatchScoreInput } from "@/services/umpires";
import { cn } from "@/lib/utils";

interface MatchScoringProps {
  match: BracketMatch;
  sport: string;
  onSubmit: (scoreInput: MatchScoreInput) => Promise<void>;
  onCancel: () => void;
}

const getScoringType = (sport: string): "goals" | "points" | "winner-only" => {
  const sportLower = sport.toLowerCase();
  if (sportLower === "football" || sportLower === "soccer") {
    return "goals";
  }
  if (
    sportLower === "badminton" ||
    sportLower === "table tennis" ||
    sportLower === "volleyball" ||
    sportLower === "tennis"
  ) {
    return "points";
  }
  // Chess, boxing, etc.
  return "winner-only";
};

export const MatchScoring = ({
  match,
  sport,
  onSubmit,
  onCancel,
}: MatchScoringProps) => {
  const scoringType = getScoringType(sport);
  const [entry1Score, setEntry1Score] = useState<string>("");
  const [entry2Score, setEntry2Score] = useState<string>("");
  const [winnerEntryId, setWinnerEntryId] = useState<string | null>(null);
  const [entry1Disqualified, setEntry1Disqualified] = useState(false);
  const [entry2Disqualified, setEntry2Disqualified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Validate scores if required
    if (scoringType === "goals" || scoringType === "points") {
      if (!entry1Score.trim() || !entry2Score.trim()) {
        setError("Please enter scores for both entries.");
        return;
      }
      const score1 = parseInt(entry1Score);
      const score2 = parseInt(entry2Score);
      if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
        setError("Scores must be valid non-negative numbers.");
        return;
      }
    }

    // Validate winner selection
    if (!entry1Disqualified && !entry2Disqualified && !winnerEntryId) {
      setError("Please select a winner.");
      return;
    }

    // If disqualification is set, winner is auto-assigned
    if (entry1Disqualified && entry2Disqualified) {
      setError("Both entries cannot be disqualified.");
      return;
    }

    setIsSubmitting(true);
    try {
      const scoreInput: MatchScoreInput = {
        entry1_score:
          scoringType !== "winner-only" && entry1Score.trim()
            ? parseInt(entry1Score)
            : null,
        entry2_score:
          scoringType !== "winner-only" && entry2Score.trim()
            ? parseInt(entry2Score)
            : null,
        winner_entry_id: winnerEntryId,
        entry1_disqualified: entry1Disqualified,
        entry2_disqualified: entry2Disqualified,
      };

      await onSubmit(scoreInput);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit match score."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-assign winner on disqualification
  const handleDisqualificationChange = (
    entry: "entry1" | "entry2",
    disqualified: boolean
  ) => {
    if (entry === "entry1") {
      setEntry1Disqualified(disqualified);
      if (disqualified) {
        setWinnerEntryId(match.entry2_id);
        setEntry2Disqualified(false);
      }
    } else {
      setEntry2Disqualified(disqualified);
      if (disqualified) {
        setWinnerEntryId(match.entry1_id);
        setEntry1Disqualified(false);
      }
    }
  };

  const scoreLabel = scoringType === "goals" ? "Goals" : "Points";
  const scorePlaceholder = scoringType === "goals" ? "0" : "0";

  return (
    <Card className="glass border-primary/30 mt-4">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Enter Match Results</h3>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Scoring Inputs for Goals/Points */}
          {(scoringType === "goals" || scoringType === "points") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry1-score" className="text-sm font-medium">
                  {match.entry1_name || "Entry 1"} - {scoreLabel}
                </Label>
                <Input
                  id="entry1-score"
                  type="number"
                  min="0"
                  placeholder={scorePlaceholder}
                  value={entry1Score}
                  onChange={(e) => setEntry1Score(e.target.value)}
                  disabled={isSubmitting || entry1Disqualified}
                  className={cn(
                    "bg-black/40 border-white/10",
                    entry1Disqualified && "opacity-50"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry2-score" className="text-sm font-medium">
                  {match.entry2_name || "Entry 2"} - {scoreLabel}
                </Label>
                <Input
                  id="entry2-score"
                  type="number"
                  min="0"
                  placeholder={scorePlaceholder}
                  value={entry2Score}
                  onChange={(e) => setEntry2Score(e.target.value)}
                  disabled={isSubmitting || entry2Disqualified}
                  className={cn(
                    "bg-black/40 border-white/10",
                    entry2Disqualified && "opacity-50"
                  )}
                />
              </div>
            </div>
          )}

          {/* Disqualification Checkboxes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Disqualifications</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dq-entry1"
                  checked={entry1Disqualified}
                  onCheckedChange={(checked) =>
                    handleDisqualificationChange("entry1", checked === true)
                  }
                  disabled={isSubmitting || entry2Disqualified}
                />
                <Label
                  htmlFor="dq-entry1"
                  className={cn(
                    "text-sm font-normal cursor-pointer",
                    entry1Disqualified && "text-red-400"
                  )}
                >
                  {match.entry1_name || "Entry 1"} Disqualified
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dq-entry2"
                  checked={entry2Disqualified}
                  onCheckedChange={(checked) =>
                    handleDisqualificationChange("entry2", checked === true)
                  }
                  disabled={isSubmitting || entry1Disqualified}
                />
                <Label
                  htmlFor="dq-entry2"
                  className={cn(
                    "text-sm font-normal cursor-pointer",
                    entry2Disqualified && "text-red-400"
                  )}
                >
                  {match.entry2_name || "Entry 2"} Disqualified
                </Label>
              </div>
            </div>
          </div>

          {/* Winner Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Winner</Label>
            {entry1Disqualified || entry2Disqualified ? (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Winner automatically assigned due to disqualification:{" "}
                  <span className="text-primary font-semibold">
                    {entry1Disqualified
                      ? match.entry2_name || "Entry 2"
                      : match.entry1_name || "Entry 1"}
                  </span>
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                {match.entry1_id && match.entry1_name && (
                  <Button
                    variant={winnerEntryId === match.entry1_id ? "default" : "outline"}
                    onClick={() => setWinnerEntryId(match.entry1_id!)}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1",
                      winnerEntryId === match.entry1_id
                        ? "bg-primary text-white border-primary"
                        : "glass border-white/10 hover:border-primary/50 hover:bg-primary/10"
                    )}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {match.entry1_name}
                  </Button>
                )}
                {match.entry2_id && match.entry2_name && (
                  <Button
                    variant={winnerEntryId === match.entry2_id ? "default" : "outline"}
                    onClick={() => setWinnerEntryId(match.entry2_id!)}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1",
                      winnerEntryId === match.entry2_id
                        ? "bg-primary text-white border-primary"
                        : "glass border-white/10 hover:border-primary/50 hover:bg-primary/10"
                    )}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {match.entry2_name}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 glass border-white/10"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 button-gradient"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Finalize Match
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

