import { useState, useEffect } from "react";

interface TimerCircleProps {
  duration: number; // seconds
  onComplete: () => void;
}

export default function TimerCircle({ duration, onComplete }: TimerCircleProps) {
  const [elapsed, setElapsed] = useState(0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = elapsed / duration;

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
    <div className="flex flex-col items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <text x="60" y="65" textAnchor="middle" className="fill-foreground text-lg" fontSize="18">
          {Math.max(0, duration - elapsed)}
        </text>
      </svg>
    </div>
  );
}
