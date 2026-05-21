import { createClient } from "@supabase/supabase-js";
import { getRankForRating } from "@/lib/ranks";
import Navbar from "@/components/Navbar";
import Link from "next/link";

async function getTopPlayers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, rating, wins, losses")
    .order("rating", { ascending: false })
    .limit(50);
  return data || [];
}

export const revalidate = 60;

export default async function LeaderboardPage() {
  const players = await getTopPlayers();

  const medalColors = [
    "text-amber-400",
    "text-slate-400",
    "text-orange-700",
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-impact fire-text mb-1">ТАБЛИЦА РЕЙТИНГА</h1>
          <p className="text-slate-600 text-sm">Топ мастеров оскорблений</p>
        </div>

        {players.length === 0 ? (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-12 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-slate-500 mb-4">Рейтинг пуст. Будь первым!</p>
            <Link href="/register" className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-sm transition-colors inline-block">
              Зарегистрироваться
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#1e1e1e] text-xs text-slate-600 font-medium uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Игрок</div>
              <div className="col-span-3">Ранг</div>
              <div className="col-span-1 text-right">ОР</div>
              <div className="col-span-2 text-right">В/П</div>
            </div>

            {players.map((player, i) => {
              const rank = getRankForRating(player.rating);
              const winRate = player.wins + player.losses > 0
                ? Math.round((player.wins / (player.wins + player.losses)) * 100)
                : 0;

              return (
                <div
                  key={player.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#1e1e1e] last:border-0 hover:bg-white/[0.02] transition-colors ${i < 3 ? "bg-amber-950/5" : ""}`}
                >
                  {/* Position */}
                  <div className={`col-span-1 flex items-center font-bold text-sm ${medalColors[i] ?? "text-slate-600"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>

                  {/* Player */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-orange-900/40 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 flex-shrink-0">
                      {player.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-300 truncate font-medium">{player.username}</span>
                  </div>

                  {/* Rank */}
                  <div className={`col-span-3 flex items-center gap-1 text-xs ${rank.color}`}>
                    <span>{rank.emoji}</span>
                    <span className="truncate hidden sm:block">{rank.name}</span>
                  </div>

                  {/* Rating */}
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="text-sm font-impact text-orange-400 tabular-nums">{player.rating}</span>
                  </div>

                  {/* Win/Loss */}
                  <div className="col-span-2 flex items-center justify-end gap-1 text-xs">
                    <span className="text-green-500">{player.wins}В</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-red-500">{player.losses}П</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-700 mt-6">
          Обновляется каждую минуту · Топ 50 игроков
        </p>
      </div>
    </div>
  );
}
