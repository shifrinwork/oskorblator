"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { getRankForRating } from "@/lib/ranks";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────
type Category = "rating" | "games" | "referrals";
type Period   = "week"   | "month" | "alltime";

type Row = {
  uid: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  wins?: number;
  losses?: number;
  total_games?: number;
  game_count?: number;
  win_count?: number;
  ref_count?: number;
};

function sinceISO(period: Period): string {
  if (period === "week")  return new Date(Date.now() - 7  * 86_400_000).toISOString();
  if (period === "month") return new Date(Date.now() - 30 * 86_400_000).toISOString();
  return new Date(0).toISOString();
}

// ─────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [cat, setCat]       = useState<Category>("rating");
  const [per, setPer]       = useState<Period>("alltime");
  const [rows, setRows]     = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // ── Data fetching ──────────────────────────────────────────
  const load = useCallback(async (category: Category, period: Period) => {
    setLoading(true);
    let data: Row[] = [];
    try {
      if (category === "rating" && period === "alltime") {
        const { data: d } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, rating, wins, losses")
          .order("rating", { ascending: false })
          .limit(50);
        data = (d ?? []).map(p => ({
          uid: p.id, username: p.username, avatar_url: p.avatar_url,
          rating: p.rating, wins: p.wins, losses: p.losses,
        }));

      } else if (category === "games" && period === "alltime") {
        const { data: d } = await supabase.rpc("lb_top_games", { lim: 50 });
        data = (d ?? []) as Row[];

      } else if (category === "referrals" && period === "alltime") {
        const { data: d } = await supabase.rpc("lb_top_referrals", { lim: 50 });
        data = (d ?? []) as Row[];

      } else if (category === "referrals") {
        const { data: d } = await supabase.rpc("lb_referrals_since", {
          since: sinceISO(period), lim: 50,
        });
        data = (d ?? []) as Row[];

      } else {
        // (rating | games) × (week | month)
        const { data: d } = await supabase.rpc("lb_games_since", {
          since: sinceISO(period), lim: 50,
        });
        let r = (d ?? []) as Row[];
        // For "По рейтингу" re-sort by win count (most wins = best rating performance)
        if (category === "rating") {
          r = [...r].sort((a, b) => (Number(b.win_count) || 0) - (Number(a.win_count) || 0));
        }
        data = r;
      }
    } catch (e) {
      console.error("leaderboard fetch:", e);
    }
    setRows(data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(cat, per); }, [cat, per, load]);

  // ── Column config ──────────────────────────────────────────
  const col1Label =
    cat === "referrals"                   ? "Друзей" :
    cat === "rating" && per !== "alltime" ? "Побед"  :
    cat === "games"                       ? "Игр"    : "ОР";

  const col2Label =
    cat === "referrals"  ? "ОР"  :
    per !== "alltime"    ? (cat === "rating" ? "Игр" : "Побед") : "В/П";

  function getPrimary(row: Row): number {
    if (cat === "referrals")                        return Number(row.ref_count)   || 0;
    if (cat === "rating" && per !== "alltime")      return Number(row.win_count)   || 0;
    if (cat === "games"  && per === "alltime")      return Number(row.total_games) || 0;
    if (cat === "games")                            return Number(row.game_count)  || 0;
    return row.rating;
  }

  function getSecondary(row: Row): string {
    if (cat === "referrals") return `${row.rating} ОР`;
    if (per !== "alltime") {
      if (cat === "rating") return `${Number(row.game_count) || 0} игр`;
      return `${Number(row.win_count) || 0}В`;
    }
    return `${row.wins ?? 0}В / ${row.losses ?? 0}П`;
  }

  const medals = ["text-amber-400", "text-slate-400", "text-orange-700"];

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="text-center mb-6">
          <h1 className="text-3xl font-impact fire-text mb-1">ТАБЛИЦА РЕЙТИНГА</h1>
          <p className="text-slate-600 text-sm">Топ мастеров оскорблений</p>
        </div>

        {/* ── Фильтры ─────────────────────────────────────── */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4 mb-4 space-y-3">
          {/* Категория */}
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "rating"    as const, label: "⚡ По рейтингу"  },
              { id: "games"     as const, label: "🎮 По играм"     },
              { id: "referrals" as const, label: "👥 По рефералам" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setCat(id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  cat === id
                    ? "bg-orange-600 text-white"
                    : "bg-[#1e1e1e] text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Период */}
          <div className="flex gap-2">
            {([
              { id: "week"    as const, label: "Неделя"    },
              { id: "month"   as const, label: "Месяц"     },
              { id: "alltime" as const, label: "Всё время" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setPer(id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  per === id
                    ? "bg-slate-700 text-white"
                    : "bg-[#1a1a1a] text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Таблица ──────────────────────────────────────── */}
        {loading ? (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-12 text-center">
            <div className="text-orange-500 animate-pulse text-xl font-impact">ЗАГРУЗКА...</div>
          </div>

        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-12 text-center">
            <div className="text-5xl mb-4">
              {cat === "referrals" ? "👥" : cat === "games" ? "🎮" : "🏆"}
            </div>
            <p className="text-slate-500 mb-4">
              {per !== "alltime"
                ? "За этот период нет активности"
                : "Рейтинг пуст. Будь первым!"}
            </p>
            {per === "alltime" && (
              <Link
                href="/register"
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-sm transition-colors inline-block"
              >
                Зарегистрироваться
              </Link>
            )}
          </div>

        ) : (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden">
            {/* Заголовок колонок */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#1e1e1e] text-xs text-slate-600 font-medium uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Игрок</div>
              <div className="col-span-3">Ранг</div>
              <div className="col-span-1 text-right">{col1Label}</div>
              <div className="col-span-2 text-right">{col2Label}</div>
            </div>

            {rows.map((row, i) => {
              const rank = getRankForRating(row.rating);
              return (
                <div
                  key={row.uid}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#1e1e1e] last:border-0 hover:bg-white/[0.02] transition-colors ${
                    i < 3 ? "bg-amber-950/5" : ""
                  }`}
                >
                  {/* Позиция */}
                  <div className={`col-span-1 flex items-center font-bold text-sm ${medals[i] ?? "text-slate-600"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>

                  {/* Игрок */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-orange-900/40 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 flex-shrink-0 overflow-hidden">
                      {row.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
                        : row.username[0].toUpperCase()
                      }
                    </div>
                    <span className="text-sm text-slate-300 truncate font-medium">
                      {row.username}
                    </span>
                  </div>

                  {/* Ранг */}
                  <div className={`col-span-3 flex items-center gap-1 text-xs ${rank.color}`}>
                    <span>{rank.emoji}</span>
                    <span className="truncate hidden sm:block">{rank.name}</span>
                  </div>

                  {/* Основная метрика */}
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="text-sm font-impact text-orange-400 tabular-nums">
                      {getPrimary(row)}
                    </span>
                  </div>

                  {/* Вторичная метрика */}
                  <div className="col-span-2 flex items-center justify-end text-xs text-slate-500 tabular-nums">
                    {getSecondary(row)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-700 mt-6">
          {per === "week"    ? "Топ за 7 дней"  :
           per === "month"   ? "Топ за 30 дней" :
                               "Топ 50 игроков · Всё время"}
        </p>
      </div>
    </div>
  );
}
