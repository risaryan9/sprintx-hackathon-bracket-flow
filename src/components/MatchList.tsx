import { BracketMatch } from "@/types/bracket";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchListProps {
  matches: BracketMatch[];
}

export const MatchList = ({ matches }: MatchListProps) => {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No matches available.</p>
      </div>
    );
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "TBD";
    try {
      return new Date(timeStr).toLocaleString();
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="space-y-4">
        {matches.map((match) => (
          <Card
            key={match.id}
            className="glass border-white/10 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
          >
            <CardContent className="p-6">
              {/* Top Section: Player Names & Round */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-semibold text-foreground">
                    {match.entry1_name || "TBD"}
                  </span>
                  <span className="text-muted-foreground px-2 font-medium">vs</span>
                  <span className="text-xl font-semibold text-foreground">
                    {match.entry2_name || "BYE"}
                  </span>
                </div>
                {match.round && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-xs"
                  >
                    {match.round}
                  </Badge>
                )}
              </div>

              {/* Bottom Section: Match Details */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
                {(match.court_name || match.court_id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Court:</span>
                    <span className="text-primary font-medium">
                      {match.court_name || `Court ${match.court_id?.slice(0, 8)}`}
                    </span>
                  </div>
                )}
                {(match.umpire_name || match.umpire_id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Umpire:</span>
                    <span className="text-primary font-medium">
                      {match.umpire_name || `Umpire ${match.umpire_id?.slice(0, 8)}`}
                    </span>
                  </div>
                )}
                {match.scheduled_time && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Time:</span>
                    <span className="text-foreground">{formatTime(match.scheduled_time)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MatchList;

