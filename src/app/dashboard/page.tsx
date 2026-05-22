"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getRankForRating } from "@/lib/ranks";
import RankBadge from "@/components/RankBadge";
import Navbar from "@/components/Navbar";
import type { Profile } from "@/lib/supabase";
import Image from "next/image";

// ── Leaderboard types (shared with /leaderboard page) ─────────
type Category = "rating" | "games" | "referrals";
type Period   = "week"   | "month" | "alltime";

type LbRow = {
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

export default function DashboardPage() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);

  // Mini leaderboard state
  const [lbCat, setLbCat]       = useState<Category>("rating");
  const [lbPer, setLbPer]       = useState<Period>("alltime");
  const [miniRows, setMiniRows] = useState<LbRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  const router   = useRouter();
  const supabase = createClient();

  // ── Load mini-leaderboard ──────────────────────────────────
  const loadMini = useCallback(async (category: Category, period: Period) => {
    setLbLoading(true);
    let data: LbRow[] = [];
    try {
      if (category === "rating" && period === "alltime") {
        const { data: d } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, rating, wins, losses")
          .order("rating", { ascending: false })
          .limit(5);
        data = (d ?? []).map(p => ({
          uid: p.id, username: p.username, avatar_url: p.avatar_url,
          rating: p.rating, wins: p.wins, losses: p.losses,
        }));

      } else if (category === "games" && period === "alltime") {
        const { data: d } = await supabase.rpc("lb_top_games", { lim: 5 });
        data = (d ?? []) as LbRow[];

      } else if (category === "referrals" && period === "alltime") {
        const { data: d } = await supabase.rpc("lb_top_referrals", { lim: 5 });
        data = (d ?? []) as LbRow[];

      } else if (category === "referrals") {
        const { data: d } = await supabase.rpc("lb_referrals_since", {
          since: sinceISO(period), lim: 5,
        });
        data = (d ?? []) as LbRow[];

      } else {
        const { data: d } = await supabase.rpc("lb_games_since", {
          since: sinceISO(period), lim: 5,
        });
        let r = (d ?? []) as LbRow[];
        if (category === "rating") {
          r = [...r].sort((a, b) => (Number(b.win_count) || 0) - (Number(a.win_count) || 0));
        }
        data = r;
      }
    } catch (e) {
      console.error("mini-lb fetch:", e);
    }
    setMiniRows(data);
    setLbLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadMini(lbCat, lbPer); }, [lbCat, lbPer, loadMini]);

  // ── Load profile ───────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-orange-500 animate-pulse text-2xl font-impact">ЗАГРУЗКА...</div>
      </div>
    );
  }

  if (!profile) return null;
  const rank    = getRankForRating(profile.rating);
  const winRate = profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0;

  // ── Mini-leaderboard helpers ───────────────────────────────
  function getMiniMetric(row: LbRow): number {
    if (lbCat === "referrals")                        return Number(row.ref_count)   || 0;
    if (lbCat === "rating" && lbPer !== "alltime")    return Number(row.win_count)   || 0;
    if (lbCat === "games"  && lbPer === "alltime")    return Number(row.total_games) || 0;
    if (lbCat === "games")                            return Number(row.game_count)  || 0;
    return row.rating;
  }

  const metricSuffix =
    lbCat === "referrals"                  ? " 👥" :
    lbCat === "rating" && lbPer !== "alltime" ? " 🏆" :
    lbCat === "games"                      ? " 🎮" : " ОР";

  const medals = ["text-amber-400", "text-slate-400", "text-orange-700"];

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Player card */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-orange-500/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-orange-900/50 border-2 border-orange-500/50 flex items-center justify-center text-2xl font-bold text-orange-400">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{profile.username}</h1>
                <RankBadge rating={profile.rating} size="sm" />
              </div>
            </div>
            <div className="sm:ml-auto grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-impact text-orange-400">{profile.rating}</div>
                <div className="text-xs text-slate-600">Очки рейтинга</div>
              </div>
              <div>
                <div className="text-2xl font-impact text-green-400">{profile.wins}</div>
                <div className="text-xs text-slate-600">Побед</div>
              </div>
              <div>
                <div className="text-2xl font-impact text-slate-400">{profile.losses}</div>
                <div className="text-xs text-slate-600">Поражений</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <RankBadge rating={profile.rating} showProgress />
          </div>
          {profile.wins + profile.losses > 0 && (
            <p className="text-xs text-slate-600 mt-2">
              Винрейт: {winRate}% — {profile.wins + profile.losses} игр сыграно
            </p>
          )}
        </div>

        {/* Game modes */}
        <div>
          <h2 className="text-lg font-bold text-slate-300 mb-4">Выбери режим боя</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/play/bot" className="game-card rounded-xl p-5 group cursor-pointer transition-all hover:scale-[1.02]">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="font-bold text-white mb-1">Против бота</h3>
              <p className="text-sm text-slate-500 mb-3">Разомнись без риска рейтинга</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Без рейтинга</span>
              </div>
            </Link>
            <Link href="/play/pvp" className="game-card rounded-xl p-5 group cursor-pointer transition-all hover:scale-[1.02]">
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="font-bold text-white mb-1">PvP бой</h3>
              <p className="text-sm text-slate-500 mb-3">60 сек. Один победитель.</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-950/50 text-orange-400 border border-orange-800/30">
                  +{25} / {-20} ОР
                </span>
              </div>
            </Link>
            <Link href="/play/tournament" className="game-card rounded-xl p-5 group cursor-pointer transition-all hover:scale-[1.02]">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="font-bold text-white mb-1">Турнир</h3>
              <p className="text-sm text-slate-500 mb-3">Сетка на выбывание</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/30">
                  Трофей победителю
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Mini leaderboard ──────────────────────────────── */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-5">

          {/* Header + category tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-300">Топ игроков</h2>
              <Link href="/leaderboard" className="text-xs text-orange-400 hover:underline">
                Полный рейтинг →
              </Link>
            </div>
            <div className="flex gap-1 flex-wrap">
              {([
                { id: "rating"    as const, label: "⚡ Рейтинг"  },
                { id: "games"     as const, label: "🎮 Игры"     },
                { id: "referrals" as const, label: "👥 Реферал." },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setLbCat(id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    lbCat === id
                      ? "bg-orange-600 text-white"
                      : "bg-[#1e1e1e] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period tabs */}
          <div className="flex gap-1 mb-4">
            {([
              { id: "week"    as const, label: "Неделя"    },
              { id: "month"   as const, label: "Месяц"     },
              { id: "alltime" as const, label: "Всё время" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setLbPer(id)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                  lbPer === id
                    ? "bg-[#2e2e2e] text-slate-200"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rows */}
          {lbLoading ? (
            <div className="text-center text-slate-600 text-xs py-4 animate-pulse">Загрузка...</div>
          ) : miniRows.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-3">
              {lbPer !== "alltime" ? "За этот период нет активности" : "Нет данных"}
            </div>
          ) : (
            <div className="space-y-1">
              {miniRows.map((row, i) => {
                const r      = getRankForRating(row.rating);
                const metric = getMiniMetric(row);
                return (
                  <div
                    key={row.uid}
                    className="flex items-center gap-3 py-2 border-b border-[#1e1e1e] last:border-0"
                  >
                    <span className={`w-5 text-center text-sm font-bold ${
                      medals[i] ?? "text-slate-600"
                    }`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-300 truncate">{row.username}</span>
                    <span className={`text-xs ${r.color} hidden sm:inline`}>{r.emoji} {r.name}</span>
                    <span className="text-sm font-bold text-orange-400 tabular-nums">
                      {metric}<span className="text-xs font-normal text-slate-500">{metricSuffix}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
