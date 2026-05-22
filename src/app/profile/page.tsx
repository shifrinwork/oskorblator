"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getRankForRating, getRatingProgressPercent } from "@/lib/ranks";
import {
  ACHIEVEMENTS, FRAMES, getBestFrame,
  checkAndUpdateAchievements, getUnlockedTier, getNextTier,
} from "@/lib/achievements";
import type { FrameStyle } from "@/lib/achievements";
import AvatarFrame from "@/components/AvatarFrame";
import Navbar from "@/components/Navbar";

type UserAchievement = {
  achievement_id: string;
  current_tier: number;
  progress: number;
};

type FullProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  wins: number;
  losses: number;
  pvp_wins: number;
  bot_wins: number;
  bot_games: number;
  streak_days: number;
  max_insult_score: number;
  referral_code: string;
  active_frame: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [refCount, setRefCount] = useState(0);
  const [activeFrame, setActiveFrame] = useState<FrameStyle>(FRAMES.default);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!p) return;
    setProfile(p as FullProfile);

    const { data: refCountData } = await supabase.rpc("get_referral_count", { uid: user.id });
    const rc = (refCountData as number) ?? 0;
    setRefCount(rc);

    const { data: ach } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id);

    const achList = (ach ?? []) as UserAchievement[];
    setAchievements(achList);

    // Активная рамка
    const frame = FRAMES[p.active_frame] ?? getBestFrame(achList);
    setActiveFrame(frame);

    // Проверяем достижения
    const totalGames = (p.wins ?? 0) + (p.losses ?? 0) + (p.bot_games ?? 0);
    const stats = {
      total_games: totalGames,
      pvp_wins: p.pvp_wins ?? 0,
      bot_wins: p.bot_wins ?? 0,
      max_insult_score: p.max_insult_score ?? 0,
      streak_days: p.streak_days ?? 0,
      referral_count: rc,
    };

    const unlocked = await checkAndUpdateAchievements(supabase, user.id, stats);
    if (unlocked.length > 0) {
      setNewlyUnlocked(unlocked);
      // Перезагружаем достижения
      const { data: refreshed } = await supabase
        .from("user_achievements").select("*").eq("user_id", user.id);
      setAchievements((refreshed ?? []) as UserAchievement[]);
    }

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const setFrame = async (frameId: string) => {
    if (!profile) return;
    await supabase.from("profiles").update({ active_frame: frameId }).eq("id", profile.id);
    setActiveFrame(FRAMES[frameId] ?? FRAMES.default);
    setProfile(prev => prev ? { ...prev, active_frame: frameId } : prev);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Показываем превью немедленно
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Добавляем cache-buster чтобы браузер не держал старую картинку
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: freshUrl }).eq("id", profile.id);
      setProfile(prev => prev ? { ...prev, avatar_url: freshUrl } : prev);
      setAvatarPreview(null); // сбрасываем превью — теперь используется avatar_url
    } catch (err) {
      console.error("Avatar upload error:", err);
      setAvatarPreview(null); // откатываем превью
    } finally {
      setAvatarUploading(false);
      // сбрасываем input чтобы можно было выбрать тот же файл повторно
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyReferral = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/register?ref=${profile.referral_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-orange-500 animate-pulse text-2xl font-impact">ЗАГРУЗКА...</div>
    </div>
  );

  if (!profile) return null;

  const rank = getRankForRating(profile.rating);
  const rankProgress = getRatingProgressPercent(profile.rating);
  const totalGames = (profile.wins ?? 0) + (profile.losses ?? 0) + (profile.bot_games ?? 0);

  // Список разблокированных рамок
  const unlockedFrameIds = new Set<string>(["default"]);
  for (const ua of achievements) {
    const ach = ACHIEVEMENTS.find(a => a.id === ua.achievement_id);
    if (!ach) continue;
    for (const tier of ach.tiers) {
      if (tier.tier <= ua.current_tier) unlockedFrameIds.add(tier.frame.id);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Новые достижения — уведомление */}
        {newlyUnlocked.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <p className="text-amber-400 font-bold text-sm mb-1">🏆 Новые достижения разблокированы!</p>
            {newlyUnlocked.map((u, i) => (
              <p key={i} className="text-amber-300 text-xs">• {u}</p>
            ))}
          </div>
        )}

        {/* Профиль */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Аватарка — кликабельная для замены фото */}
            <div className="relative group flex-shrink-0">
              <AvatarFrame
                username={profile.username}
                avatarUrl={avatarPreview ?? profile.avatar_url}
                frame={activeFrame}
                size={80}
              />
              {/* Hover-оверлей */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
                title="Сменить аватарку"
              >
                {avatarUploading
                  ? <span className="text-xl animate-spin">⏳</span>
                  : <span className="text-xl">📷</span>
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm ${rank.color}`}>{rank.emoji} {rank.name}</span>
                <span className="text-slate-600">·</span>
                <span className="text-sm text-orange-400 font-bold">{profile.rating} ОР</span>
              </div>
              <div className="mt-2 h-1.5 w-48 rounded-full bg-[#1e1e1e] overflow-hidden">
                <div className="h-full score-bar-fill" style={{ width: `${rankProgress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { v: totalGames,       l: "Игр",     c: "text-slate-300" },
                { v: profile.wins,     l: "Побед",   c: "text-green-400" },
                { v: profile.losses,   l: "Поражений", c: "text-red-400" },
                { v: profile.streak_days, l: "Стрик", c: "text-orange-400" },
              ].map(({ v, l, c }) => (
                <div key={l}>
                  <div className={`text-xl font-impact ${c}`}>{v}</div>
                  <div className="text-xs text-slate-600">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Реферальная ссылка */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-5">
          <h2 className="font-bold text-slate-300 mb-1">👥 Реферальная ссылка</h2>
          <p className="text-xs text-slate-600 mb-3">
            Пригласи друзей — получи достижение «Командир Орды» и эксклюзивную золотую рамку
          </p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] text-xs text-slate-500 truncate font-mono">
              {typeof window !== "undefined"
                ? `${window.location.origin}/register?ref=${profile.referral_code}`
                : `oskorblator.vercel.app/register?ref=${profile.referral_code}`}
            </div>
            <button
              onClick={copyReferral}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-sm font-bold transition-colors whitespace-nowrap"
            >
              {copied ? "Скопировано ✓" : "Копировать"}
            </button>
          </div>
          <p className="text-xs text-slate-700 mt-2">
            Приглашено друзей: <span className="text-orange-400 font-bold">{refCount}</span>
          </p>
        </div>

        {/* Выбор активной рамки */}
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-5">
          <h2 className="font-bold text-slate-300 mb-3">🖼️ Активная рамка</h2>
          <div className="flex flex-wrap gap-3">
            {Array.from(unlockedFrameIds).map(frameId => {
              const f = FRAMES[frameId];
              if (!f) return null;
              const isActive = profile.active_frame === frameId;
              return (
                <button
                  key={frameId}
                  onClick={() => setFrame(frameId)}
                  title={f.label}
                  className={`rounded-xl p-2 border transition-all ${
                    isActive
                      ? "border-orange-500 bg-orange-950/20"
                      : "border-[#2e2e2e] hover:border-[#3e3e3e]"
                  }`}
                >
                  <AvatarFrame
                    username={profile.username}
                    avatarUrl={profile.avatar_url}
                    frame={f}
                    size={48}
                  />
                  <p className="text-xs text-slate-500 mt-1 text-center max-w-[60px] truncate">{f.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Достижения */}
        <div>
          <h2 className="font-bold text-slate-300 mb-3">🏆 Достижения</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map(ach => {
              const ua = achievements.find(a => a.achievement_id === ach.id);
              const currentTier = ua?.current_tier ?? 0;
              const progress = ua?.progress ?? 0;
              const nextTier = getNextTier(ach, currentTier);
              const maxTier = ach.tiers[ach.tiers.length - 1].tier;
              const isDone = currentTier >= maxTier;
              const pct = nextTier
                ? Math.min(100, Math.round((progress / nextTier.requirement) * 100))
                : 100;

              return (
                <div
                  key={ach.id}
                  className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{ach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-200 text-sm">{ach.name}</p>
                      <p className="text-xs text-slate-600">{ach.description}</p>
                    </div>
                    {currentTier > 0 && (
                      <div className="flex-shrink-0">
                        <AvatarFrame
                          username={profile.username}
                          avatarUrl={profile.avatar_url}
                          frame={ach.tiers[currentTier - 1].frame}
                          size={36}
                        />
                      </div>
                    )}
                  </div>

                  {/* Тиры */}
                  <div className="flex gap-1 mb-2">
                    {ach.tiers.map(t => (
                      <div
                        key={t.tier}
                        title={`${t.label} (${t.requirement})`}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                          t.tier <= currentTier
                            ? "bg-orange-500"
                            : "bg-[#2e2e2e]"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Прогресс */}
                  {!isDone && nextTier ? (
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>
                          {currentTier > 0
                            ? `Тир ${currentTier}: ${ach.tiers[currentTier-1].label}`
                            : "Не открыто"}
                        </span>
                        <span>{progress} / {nextTier.requirement}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#1e1e1e] overflow-hidden">
                        <div
                          className="h-full score-bar-fill transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Следующее: <span className="text-slate-400">{nextTier.label}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-400">✓ Максимальный тир достигнут!</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-400 transition-colors">
            ← В главное меню
          </Link>
        </div>
      </div>
    </div>
  );
}
