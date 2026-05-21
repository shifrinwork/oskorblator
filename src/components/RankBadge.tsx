import { getRankForRating, getRatingProgressPercent, getNextRank } from "@/lib/ranks";
import clsx from "clsx";

interface RankBadgeProps {
  rating: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RankBadge({
  rating,
  showProgress = false,
  size = "md",
}: RankBadgeProps) {
  const rank = getRankForRating(rating);
  const next = getNextRank(rating);
  const progress = getRatingProgressPercent(rating);

  return (
    <div className="flex flex-col gap-1">
      <div
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium",
          rank.bgColor,
          size === "sm" && "text-xs px-2 py-0.5",
          size === "lg" && "text-base px-4 py-2"
        )}
      >
        <span>{rank.emoji}</span>
        <span className={rank.color}>{rank.name}</span>
      </div>
      {showProgress && next && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{rating} ОР</span>
            <span>
              {next.minRating} ОР → {next.emoji} {next.name}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
            <div
              className="h-full score-bar-fill rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {showProgress && !next && (
        <p className="text-xs text-amber-400">Максимальный ранг достигнут 👑</p>
      )}
    </div>
  );
}
