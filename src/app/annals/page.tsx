"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Period   = "day" | "week" | "month" | "alltime";
type SortMode = "score" | "votes";

type InsultRecord = {
  id: string;
  insult: string;
  score: number;
  created_at: string;
  likes: number;
  dislikes: number;
  my_vote: number | null; // 1 | -1 | null
};

function sinceISO(period: Period): string {
  if (period === "day")   return new Date(Date.now() -       86_400_000).toISOString();
  if (period === "week")  return new Date(Date.now() -   7 * 86_400_000).toISOString();
  if (period === "month") return new Date(Date.now() -  30 * 86_400_000).toISOString();
  return new Date(0).toISOString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "только что";
  if (mins  < 60)  return `${mins} мин. назад`;
  if (hours < 24)  return `${hours} ч. назад`;
  if (days  < 30)  return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function scoreMeta(score: number): { color: string; badge: string } {
  if (score >= 90) return { color: "text-amber-300",  badge: "⚡ Легенда"    };
  if (score >= 75) return { color: "text-orange-400", badge: "🔥 Мастер"     };
  if (score >= 60) return { color: "text-red-400",    badge: "💀 Грозный"    };
  if (score >= 45) return { color: "text-rose-500",   badge: "🗡 Острый"     };
  if (score >= 30) return { color: "text-slate-300",  badge: "😤 Крепкий"    };
  return               { color: "text-slate-500",  badge: "😐 Слабенький" };
}

export default function AnnalsPage() {
  const [period,   setPeriod]   = useState<Period>("alltime");
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [records,  setRecords]  = useState<InsultRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [userId,   setUserId]   = useState<string | null>(null);
  const [voting,   setVoting]   = useState<Record<string, boolean>>({});
  const supabase = createClient();

  // Загружаем текущего пользователя
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (per: Period, sort: SortMode) => {
    setLoading(true);
    try {
      const uid = userId ?? null;
      const { data } = await supabase.rpc("top_insults_scored", {
        since:   sinceISO(per),
        lim:     100,
        uid,
        sort_by: sort,
      });
      setRecords((data ?? []) as InsultRecord[]);
    } catch (e) {
      console.error("annals fetch:", e);
      setRecords([]);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => { load(period, sortMode); }, [period, sortMode, load]);

  // ── Голосование ──────────────────────────────────────────────
  const handleVote = async (insultId: string, clickedVote: 1 | -1) => {
    if (!userId) return;
    if (voting[insultId]) return;

    const record = records.find(r => r.id === insultId);
    if (!record) return;

    const currentVote = record.my_vote ?? 0;
    const newVote: 0 | 1 | -1 = currentVote === clickedVote ? 0 : clickedVote;

    // Оптимистичное обновление
    setRecords(prev => prev.map(r => {
      if (r.id !== insultId) return r;
      const oldLike    = currentVote === 1  ? 1 : 0;
      const oldDislike = currentVote === -1 ? 1 : 0;
      const newLike    = newVote === 1  ? 1 : 0;
      const newDislike = newVote === -1 ? 1 : 0;
      return {
        ...r,
        likes:    r.likes    + newLike    - oldLike,
        dislikes: r.dislikes + newDislike - oldDislike,
        my_vote:  newVote === 0 ? null : newVote,
      };
    }));

    setVoting(v => ({ ...v, [insultId]: true }));
    try {
      await supabase.rpc("vote_insult", {
        p_insult_id: insultId,
        p_uid:       userId,
        p_vote:      newVote,
      });
    } catch (e) {
      console.error("vote error:", e);
      load(period, sortMode); // откат при ошибке
    } finally {
      setVoting(v => ({ ...v, [insultId]: false }));
    }
  };

  const periods: { id: Period; label: string }[] = [
    { id: "day",     label: "24 часа"   },
    { id: "week",    label: "Неделя"    },
    { id: "month",   label: "Месяц"     },
    { id: "alltime", label: "Всё время" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Шапка ─────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-impact fire-text mb-2 tracking-widest">
            СКОРБНЫЕ АННАЛЫ
          </h1>
          <p className="text-slate-600 text-sm">
            Зал Позора и Мастерства · Лучшие оскорбления всех времён
          </p>
        </div>

        {/* ── Режим сортировки ──────────────────────────────── */}
        <div className="flex justify-center gap-2 mb-3">
          <button
            onClick={() => setSortMode("score")}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              sortMode === "score"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-900/40"
                : "bg-[#1e1e1e] text-slate-400 hover:text-slate-200 hover:bg-[#2a2a2a]"
            }`}
          >
            ⚡ По очкам ЕС
          </button>
          <button
            onClick={() => setSortMode("votes")}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              sortMode === "votes"
                ? "bg-pink-700 text-white shadow-lg shadow-pink-900/40"
                : "bg-[#1e1e1e] text-slate-400 hover:text-slate-200 hover:bg-[#2a2a2a]"
            }`}
          >
            👍 По голосам
          </button>
        </div>

        {/* ── Период ────────────────────────────────────────── */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {periods.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                period === id
                  ? "bg-[#2e2e2e] text-slate-200 ring-1 ring-slate-600/50"
                  : "bg-[#1a1a1a] text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Контент ───────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="text-orange-500 animate-pulse text-2xl font-impact tracking-widest">
              ЛИСТАЕМ АННАЛЫ...
            </div>
          </div>

        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📜</div>
            <p className="text-slate-400 text-lg font-bold mb-2">Анналы молчат</p>
            <p className="text-slate-600 text-sm mb-6">
              {period !== "alltime"
                ? "За этот период ещё не записано ни одного достойного оскорбления"
                : "Вступи в бой и оставь след в истории!"}
            </p>
            <Link
              href="/play/pvp"
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-sm transition-colors inline-block"
            >
              Вступить в бой ⚔️
            </Link>
          </div>

        ) : (
          <div className="space-y-3">
            {records.map((rec, i) => {
              const meta       = scoreMeta(rec.score);
              const isTop3     = i < 3;
              const net        = rec.likes - rec.dislikes;
              const isVotingThis = voting[rec.id];

              return (
                <div
                  key={rec.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    i === 0
                      ? "border-amber-500/50 bg-gradient-to-r from-amber-950/20 to-[#0f0f0f]"
                      : i === 1
                      ? "border-slate-500/30 bg-gradient-to-r from-slate-900/40 to-[#0f0f0f]"
                      : i === 2
                      ? "border-orange-700/30 bg-gradient-to-r from-orange-950/15 to-[#0f0f0f]"
                      : "border-[#1e1e1e] bg-[#0f0f0f] hover:border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Позиция */}
                    <div className="flex-shrink-0 w-8 text-center pt-0.5">
                      {i === 0 ? <span className="text-xl">🥇</span>
                      : i === 1 ? <span className="text-xl">🥈</span>
                      : i === 2 ? <span className="text-xl">🥉</span>
                      : <span className="text-sm font-bold text-slate-600">{i + 1}</span>}
                    </div>

                    {/* Текст + мета */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${isTop3 ? "text-slate-100" : "text-slate-300"} italic`}>
                        «{rec.insult}»
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.badge}</span>
                        <span className="text-slate-700 text-xs">·</span>
                        <span className="text-xs text-slate-700">{timeAgo(rec.created_at)}</span>
                        <span className="text-slate-700 text-xs">·</span>
                        {/* Кнопки голосования */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleVote(rec.id, 1)}
                            disabled={!userId || isVotingThis}
                            title={userId ? "Нравится" : "Войди чтобы голосовать"}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-all disabled:cursor-default ${
                              rec.my_vote === 1
                                ? "bg-green-900/60 text-green-400 border border-green-700/50"
                                : userId
                                ? "text-slate-500 hover:text-green-400 hover:bg-green-900/30 border border-transparent hover:border-green-900/50"
                                : "text-slate-600 opacity-50"
                            }`}
                          >
                            👍 <span className="tabular-nums">{rec.likes}</span>
                          </button>
                          <button
                            onClick={() => handleVote(rec.id, -1)}
                            disabled={!userId || isVotingThis}
                            title={userId ? "Не нравится" : "Войди чтобы голосовать"}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-all disabled:cursor-default ${
                              rec.my_vote === -1
                                ? "bg-red-900/60 text-red-400 border border-red-700/50"
                                : userId
                                ? "text-slate-500 hover:text-red-400 hover:bg-red-900/30 border border-transparent hover:border-red-900/50"
                                : "text-slate-600 opacity-50"
                            }`}
                          >
                            👎 <span className="tabular-nums">{rec.dislikes}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Очки ЕС + нетто-рейтинг */}
                    <div className="flex-shrink-0 text-right pl-2">
                      <div className={`text-2xl font-impact tabular-nums ${
                        i === 0 ? "text-amber-300" :
                        i === 1 ? "text-slate-300" :
                        i === 2 ? "text-orange-600" : "text-orange-400"
                      }`}>
                        {rec.score}
                      </div>
                      <div className="text-xs text-slate-600">ЕС</div>
                      {sortMode === "votes" && (
                        <div className={`text-xs font-bold tabular-nums mt-0.5 ${
                          net > 0 ? "text-green-500" : net < 0 ? "text-red-500" : "text-slate-600"
                        }`}>
                          {net > 0 ? `+${net}` : net}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Сноска */}
        {!loading && records.length > 0 && (
          <p className="text-center text-xs text-slate-700 mt-8">
            Показано {records.length} записей · ЕС = Единицы Силы
            {!userId && (
              <span className="ml-2">·{" "}
                <Link href="/login" className="text-orange-500 hover:underline">Войди</Link>
                {" "}чтобы голосовать
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
