import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseAsUTC } from "@/utils/timestampParser";

interface MatchTimerProps {
  durationMinutes: number;
  onComplete?: () => void;
  autoStart?: boolean; // Auto-start the timer when component mounts
  actualStartTime?: string | null; // Actual start time from database - if provided, calculates remaining time
}

export const MatchTimer = ({
  durationMinutes,
  onComplete,
  autoStart = false,
  actualStartTime = null,
}: MatchTimerProps) => {
  // Calculate initial remaining time based on actual start time if provided
  const calculateInitialRemainingTime = (): number => {
    if (actualStartTime) {
      const startTime = parseAsUTC(actualStartTime);
      if (startTime) {
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
        const now = new Date();
        const remainingMs = endTime.getTime() - now.getTime();
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        return remainingSeconds;
      }
    }
    // Default to full duration if no start time or calculation fails
    return durationMinutes * 60;
  };

  const [isRunning, setIsRunning] = useState(autoStart); // Auto-start if autoStart is true
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(calculateInitialRemainingTime()); // in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Auto-start when component mounts if autoStart is true and match has started
  useEffect(() => {
    if (autoStart && !isRunning && timeRemaining > 0) {
      setIsRunning(true);
      startTimeRef.current = Date.now();
    }
  }, [autoStart]); // Only run once on mount

  // Timer logic: sync with database time if actualStartTime provided, otherwise countdown
  useEffect(() => {
    if (isRunning && !isPaused) {
      if (actualStartTime) {
        // Sync with actual start time from database every second
        // This ensures accuracy even if user refreshes the page
        const syncInterval = setInterval(() => {
          const startTime = parseAsUTC(actualStartTime);
          if (startTime) {
            const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
            const now = new Date();
            const remainingMs = endTime.getTime() - now.getTime();
            const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
            
            setTimeRemaining(remainingSeconds);
            
            if (remainingSeconds <= 0) {
              setIsRunning(false);
              setIsPaused(false);
              if (onComplete) {
                onComplete();
              }
            }
          }
        }, 1000);

        return () => clearInterval(syncInterval);
      } else {
        // Standard countdown if no actualStartTime provided
        intervalRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              setIsRunning(false);
              setIsPaused(false);
              if (onComplete) {
                onComplete();
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      }
    } else {
      // Clean up intervals when paused or stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRunning, isPaused, onComplete, actualStartTime, durationMinutes]);

  // Timer controls removed - timer runs automatically and cannot be paused/stopped
  // Removed handleStart, handlePause, and handleStop functions

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeRemaining <= 300; // Less than 5 minutes
  const isVeryLowTime = timeRemaining <= 60; // Less than 1 minute

  return (
    <Card className="glass border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all",
                isVeryLowTime
                  ? "border-red-500 bg-red-500/20 animate-pulse"
                  : isLowTime
                  ? "border-yellow-500 bg-yellow-500/20"
                  : "border-primary bg-primary/20"
              )}
            >
              <Clock
                className={cn(
                  "h-6 w-6",
                  isVeryLowTime
                    ? "text-red-400"
                    : isLowTime
                    ? "text-yellow-400"
                    : "text-primary"
                )}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Match Timer</p>
              <p
                className={cn(
                  "text-2xl font-mono font-bold",
                  isVeryLowTime
                    ? "text-red-400"
                    : isLowTime
                    ? "text-yellow-400"
                    : "text-foreground"
                )}
              >
                {formatTime(timeRemaining)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRunning && !isPaused
                  ? "Running"
                  : isPaused
                  ? "Paused"
                  : "Stopped"}
              </p>
            </div>
          </div>

          {/* Timer controls removed - timer runs automatically and cannot be paused/stopped */}
        </div>

        {timeRemaining === 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <Badge className="w-full justify-center bg-red-500/20 text-red-400 border-red-500/30">
              Match Time Expired
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


