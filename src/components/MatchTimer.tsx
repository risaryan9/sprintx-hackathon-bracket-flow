import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchTimerProps {
  durationMinutes: number;
  onComplete?: () => void;
}

export const MatchTimer = ({
  durationMinutes,
  onComplete,
}: MatchTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60); // in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning && !isPaused) {
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
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, onComplete]);

  const handleStart = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      setIsRunning(true);
      setIsPaused(false);
    } else if (isPaused) {
      // Resume from where we paused
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(durationMinutes * 60);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  };

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

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button
                size="sm"
                onClick={handleStart}
                className="button-gradient"
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePause}
                    className="glass border-white/10"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleStart}
                    className="button-gradient"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStop}
                  className="glass border-white/10"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
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

