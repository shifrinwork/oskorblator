"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { getRankForRating } from "@/lib/ranks";
import Navbar from "@/components/Navbar";

// ── Types ─────────────────────────────────────────────────────
type Category = "rating" | "games" | "winrate" | "friends";
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
  winrate?: number;
};

function sinceISO(period: Period): string {
  if (period === "week")  return new Date(Date.now() - 7  * 86_400_000).toISOString();
  if (period === "month") return new Date(Date.now() - 30 * 86_400_000).toISOString();
  return new Date(0).toISOString();
}

// ─────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [cat, setCat]         = useState<Category>("rating");
  const [per, setPer]         = useState<Period>("alltime");
  const [rows, setRows]       = useState<LbRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Current user's referral code (optional — for friends tab)
  const [myRefCode, setMyRefCode] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);

  const supabase = createClient();

  // ── Load current user's ref code ──────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single()
        .then(({ data }) => { if (data) setMyRefCode(data.referral_code); });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyRef = useCallback(() => {
    if (!myRefCode) return;
    const url = `${window.location.origin}/register?ref=${myRefCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    });
  }, [myRefCode]);

  // ── Data fetching ──────────────────────────────────────────
  const load = useCallback(async (category: Category, period: Period) => {
    setLoading(true);
    let data: LbRow[] = [];
    try {
      if (category === "rating") {
        // Рейтинг всегда за все время
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
        data = (d ?? []) as LbRow[];

      } else if (category === "games") {
        const { data: d } = await supabase.rpc("lb_games_since", {
          since: sinceISO(period), lim: 50,
        });
        data = (d ?? []) as LbRow[];

      } else if (category === "winrate" && period === "alltime") {
        const { data: d } = await supabase.rpc("lb_winrate_all", { lim: 50 });
        data = (d ?? []) as LbRow[];

      } else if (category === "winrate") {
        const { data: d } = await supabase.rpc("lb_winrate_since", {
          since: sinceISO(period), lim: 50,
        });
        data = (d ?? []) as LbRow[];

      } else if (category === "friends" && period === "alltime") {
        const { data: d } = await supabase.rpc("lb_top_referrals", { lim: 50 });
        data = (d ?? []) as LbRow[];

      } else if (category === "friends") {
        const { data: d } = await supabase.rpc("lb_referrals_since", {
          since: sinceISO(period), lim: 50,
        });
        data = (d ?? []) as LbRow[];
      }
    } catch (e) {
      console.error("lb fetch:", e);
    }
    setRows(data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(cat, per); }, [cat, per, load]);

  // При переключении на «По рейтингу» — сбрасываем период
  const handleCatChange = (newCat: Category) => {
    if (newCat === "rating") setPer("alltime");
    setCat(newCat);
  };

  // ── Column config ──────────────────────────────────────────
  const col1Label =
    cat === "friends" ? "Друзей" :
    cat === "winrate" ? "Винрейт" :
    cat === "games"   ? "Игр" : "ОР";

  const col2Label =
    cat === "friends" ? "ОР" :
    cat === "winrate" ? "Игр" :
    per !== "alltime" ? "Побед" : "В/П";

  function getMetrics(row: LbRow): { primary: string; secondary: string } {
    if (cat === "friends") return {
      primary:   String(Number(row.ref_count) || 0),
      secondary: `${row.rating} ОР`,
    };
    if (cat === "winrate") {
      const games = per === "alltime"
        ? (row.wins ?? 0) + (row.losses ?? 0)
        : Number(row.game_count) || 0;
      return {
        primary:   `${Number(row.winrate ?? 0).toFixed(1)}%`,
        secondary: `${games} игр`,
      };
    }
    if (cat === "games" && per === "alltime") return {
      primary:   String(Number(row.total_games) || 0),
      secondary: `${row.wins ?? 0}В / ${row.losses ?? 0}П`,
    };
    if (cat === "games") return {
      primary:   String(Number(row.game_count) || 0),
      secondary: `${Number(row.win_count) || 0}В`,
    };
    // rating — always alltime
    return {
      primary:   String(row.rating),
      secondary: `${row.wins ?? 0}В / ${row.losses ?? 0}П`,
    };
  }

  const medals = ["text-amber-400", "text-slate-400", "text-orange-700"];

  // ── Referral link block ────────────────────────────────────
  const refUrl = myRefCode
    ? (typeof window !== "undefined" ? `${window.location.origin}/register?ref=${myRefCode}` : "")
    : null;

  const RefLinkBlock = () => {
    if (!refUrl) return null;
    return (
      <div className="flex items-center gap-2 mt-1">
        <code className="flex-1 text-xs text-orange-400 font-mono truncate bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2e2e2e]">
          {refUrl}
        </code>
        <button
          onClick={copyRef}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold transition-colors"
        >
          {refCopied ? "Скопировано ✓" : "Копировать"}
        </button>
      </div>
    );
  };

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
              { id: "rating"  as const, label: "⚡ По рейтингу"  },
              { id: "games"   as const, label: "🎮 По играм"     },
              { id: "winrate" as const, label: "🏆 По винрейту"  },
              { id: "friends" as const, label: "👥 По друзьям"   },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleCatChange(id)}
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

          {/* Период — скрыт для «По рейтингу» */}
          {cat !== "rating" && (
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
          )}
        </div>

        {/* ── Таблица / пусто ──────────────────────────────── */}
        {loading ? (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-12 text-center">
            <div className="text-orange-500 animate-pulse text-xl font-impact">ЗАГРУЗКА...</div>
          </div>

        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-10 text-center">
            <div className="text-5xl mb-4">
              {cat === "friends" ? "👥" : cat === "winrate" ? "🏆" : cat === "games" ? "🎮" : "⚡"}
            </div>

            {cat === "friends" ? (
              <>
                <p className="text-slate-400 font-bold mb-1">
                  {per !== "alltime" ? "За этот период никто не пригласил друзей" : "Никто ещё не пригласил друзей"}
                </p>
                <p className="text-slate-600 text-sm mb-5">Будь первым — пригласи друга!</p>
                <div className="max-w-sm mx-auto text-left">
                  <p className="text-xs text-slate-500 mb-1">Твоя реферальная ссылка:</p>
                  <RefLinkBlock />
                </div>
              </>
            ) : cat === "winrate" ? (
              <>
                <p className="text-slate-500">
                  {per !== "alltime"
                    ? "За этот период недостаточно игр (нужно минимум 3)"
                    : "Недостаточно данных (нужно минимум 5 игр)"}
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-500">
                  {per !== "alltime" ? "За этот период нет активности" : "Рейтинг пуст. Будь первым!"}
                </p>
              </>
            )}
          </div>

        ) : (
          <>
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
                const { primary, secondary } = getMetrics(row);
                return (
                  <div
                    key={row.uid}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#1e1e1e] last:border-0 hover:bg-white/[0.02] transition-colors ${
                      i < 3 ? "bg-amber-950/5" : ""
                    }`}
                  >
                    <div className={`col-span-1 flex items-center font-bold text-sm ${medals[i] ?? "text-slate-600"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </div>

                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-orange-900/40 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 flex-shrink-0 overflow-hidden">
                        {row.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
                          : row.username[0].toUpperCase()
                        }
                      </div>
                      <span className="text-sm text-slate-300 truncate font-medium">{row.username}</span>
                    </div>

                    <div className={`col-span-3 flex items-center gap-1 text-xs ${rank.color}`}>
                      <span>{rank.emoji}</span>
                      <span className="truncate hidden sm:block">{rank.name}</span>
                    </div>

                    <div className="col-span-1 flex items-center justify-end">
                      <span className="text-sm font-impact text-orange-400 tabular-nums">{primary}</span>
                    </div>

                    <div className="col-span-2 flex items-center justify-end text-xs text-slate-500 tabular-nums">
                      {secondary}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Реферальная ссылка под таблицей «По друзьям» */}
            {cat === "friends" && (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4 mt-3">
                <p className="text-xs text-slate-500 mb-2">👥 Твоя реферальная ссылка:</p>
                {refUrl
                  ? <RefLinkBlock />
                  : <p className="text-xs text-slate-600">Войди в аккаунт, чтобы получить реферальную ссылку</p>
                }
              </div>
            )}
          </>
        )}

        {/* Сноска */}
        <p className="text-center text-xs text-slate-700 mt-6">
          {cat === "rating" ? "Топ 50 · Текущий рейтинг" :
           per === "week"   ? "Топ за 7 дней" :
           per === "month"  ? "Топ за 30 дней" :
                              "Топ 50 · Всё время"}
          {cat === "winrate" && per === "alltime" && " · мин. 5 игр"}
          {cat === "winrate" && per !== "alltime" && " · мин. 3 игры"}
        </p>
      </div>
    </div>
  );
}
