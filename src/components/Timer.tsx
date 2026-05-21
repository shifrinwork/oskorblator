"use client";
import { useEffect, useState, useRef } from "react";
import clsx from "clsx";

interface TimerProps {
  seconds: number;
  onExpire: () => void;
  running: boolean;
}

export default function Timer({ seconds, onExpire, running }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    expiredRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onExpire]);

  const isWarning = remaining <= 10;
  const isCritical = remaining <= 5;
  const progress = (remaining / seconds) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={clsx(
          "text-4xl font-impact tabular-nums transition-colors",
          isCritical && "text-red-500 timer-warning",
          isWarning && !isCritical && "text-orange-400",
          !isWarning && "text-slate-300"
        )}
      >
        {remaining < 10 ? `0:0${remaining}` : `0:${remaining}`}
      </div>
      <div className="w-32 h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-1000",
            isCritical && "bg-red-600",
            isWarning && !isCritical && "bg-orange-500",
            !isWarning && "score-bar-fill"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      {isCritical && remaining > 0 && (
        <p className="text-red-400 text-xs font-bold animate-pulse">ТОРОПИСЬ!</p>
      )}
    </div>
  );
}
