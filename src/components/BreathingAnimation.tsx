import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface BreathingAnimationProps {
  duration: number; // seconds
  onComplete: () => void;
  skippable?: boolean;
}

export default function BreathingAnimation({ duration, onComplete, skippable = true }: BreathingAnimationProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= duration) {
          clearInterval(interval);
          onComplete();
          return duration;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="relative flex items-center justify-center">
        <div
          className="w-32 h-32 rounded-full bg-primary/20 border-2 border-primary/40"
          style={{
            animation: "breathe 4s ease-in-out infinite",
          }}
        />
        <span className="absolute text-sm text-muted-foreground">
          {Math.max(0, duration - elapsed)}s
        </span>
      </div>
      <p className="text-muted-foreground text-sm">Andas lugnt...</p>
      {skippable && (
        <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
          Hoppa över
        </Button>
      )}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
