"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getRankForRating } from "@/lib/ranks";
import type { Profile } from "@/lib/supabase";
import Image from "next/image";

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const rank = profile ? getRankForRating(profile.rating) : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1e1e1e] bg-[#080808]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={profile ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="text-xl font-impact fire-text tracking-wider">ОСКОРБЛЯТОР</span>
          <span className="text-orange-500 text-sm">🔥</span>
        </Link>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-orange-400 transition-colors hidden sm:block">
                Рейтинг
              </Link>
              <Link href="/dashboard" className="flex items-center gap-2 text-sm">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    width={28}
                    height={28}
                    className="rounded-full border border-orange-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-orange-900/50 border border-orange-500/50 flex items-center justify-center text-xs font-bold text-orange-400">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:block text-slate-300">{profile.username}</span>
                {rank && (
                  <span className={`hidden sm:block text-xs ${rank.color}`}>
                    {rank.emoji} {rank.name}
                  </span>
                )}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 border border-transparent hover:border-red-800 rounded"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-slate-400 hover:text-orange-400 transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="text-sm px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded transition-colors font-medium"
              >
                Играть
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
