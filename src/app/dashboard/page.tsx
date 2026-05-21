"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getRankForRating } from "@/lib/ranks";
import RankBadge from "@/components/RankBadge";
import Navbar from "@/components/Navbar";
import type { Profile } from "@/lib/supabase";
import Image from "next/image";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [topPlayers, setTopPlayers] = useState<Profile[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
    });
    supabase.from("profiles").select("*").order("rating", { ascending: false }).limit(5).then(({ data }) => {
      setTopPlayers(data || []);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-orange-500 animate-pulse text-2xl font-impact">ЗАГРУЗКА...</div>
      </div>
    );
  }

  if (!profile) return null;
  const rank = getRankForRating(profile.rating);
  const winRate = profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0;

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

        {/* Mini leaderboard */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-300">Топ игроков</h2>
            <Link href="/leaderboard" className="text-xs text-orange-400 hover:underline">
              Полный рейтинг →
            </Link>
          </div>
          <div className="space-y-2">
            {topPlayers.map((p, i) => {
              const r = getRankForRating(p.rating);
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[#1e1e1e] last:border-0">
                  <span className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-700" : "text-slate-600"}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-slate-300 truncate">{p.username}</span>
                  <span className={`text-xs ${r.color}`}>{r.emoji} {r.name}</span>
                  <span className="text-sm font-bold text-orange-400 tabular-nums">{p.rating}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
