import { Trophy, Medal, Award, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getTournamentLeaderboard, LeaderboardEntry } from "@/services/tournaments";

interface TournamentLeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentName: string;
  tournamentId: string;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <Trophy className="h-4 w-4 text-muted-foreground" />;
};

const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (rank === 2) return "bg-gray-400/20 text-gray-300 border-gray-400/30";
  if (rank === 3) return "bg-amber-600/20 text-amber-400 border-amber-600/30";
  return "bg-primary/20 text-primary border-primary/30";
};

export const TournamentLeaderboard = ({
  open,
  onOpenChange,
  tournamentName,
  tournamentId,
}: TournamentLeaderboardProps) => {
  const { data: leaderboard = [], isLoading, isError } = useQuery({
    queryKey: ["tournament-leaderboard", tournamentId],
    queryFn: () => getTournamentLeaderboard(tournamentId),
    enabled: open && !!tournamentId,
  });

  // Calculate total matches (each match is counted twice, once per player)
  const totalMatches = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.matchesPlayed, 0) / 2)
    : 0;

  // Calculate total wins for win rate calculation
  const totalWins = leaderboard.reduce((sum, entry) => sum + entry.wins, 0);
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-black/95 backdrop-blur-xl max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl text-white">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-2xl font-semibold text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Tournament Leaderboard
          </DialogTitle>
          <p className="text-sm text-gray-300 mt-1">{tournamentName}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 mb-3 px-4 py-2 rounded-lg bg-white/5 border border-white/5">
            <div className="col-span-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Rank
            </div>
            <div className="col-span-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Player
            </div>
            <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
              Wins
            </div>
            <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
              Losses
            </div>
            <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
              Points
            </div>
          </div>

          {/* Leaderboard Entries */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading leaderboard...
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-red-400">
              Failed to load leaderboard
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed matches yet
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all duration-200"
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      {entry.rank}
                    </div>
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Player Name */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {entry.playerName}
                      </span>
                      {entry.rank <= 3 && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${getRankBadgeColor(entry.rank)}`}
                        >
                          {entry.rank === 1
                            ? "Champion"
                            : entry.rank === 2
                            ? "Runner-up"
                            : "Third Place"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Wins */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-green-400">
                      {entry.wins}
                    </span>
                  </div>

                  {/* Losses */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-red-400">
                      {entry.losses}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-bold text-primary">
                      {entry.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Players
              </p>
              <p className="text-lg font-semibold text-white">
                {leaderboard.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Matches Played
              </p>
              <p className="text-lg font-semibold text-white">
                {totalMatches}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Win Rate
              </p>
              <p className="text-lg font-semibold text-white">
                {winRate}%
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

