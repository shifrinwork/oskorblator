"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { scoreInsult, getBotInsult } from "@/lib/scoring";
import Timer from "@/components/Timer";
import Navbar from "@/components/Navbar";

type Phase = "ready" | "fighting" | "result";

export default function BotGamePage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [insult, setInsult] = useState("");
  const [playerScore, setPlayerScore] = useState(0);
  const [botInsult, setBotInsult] = useState("");
  const [botScore, setBotScore] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    });
  }, []);

  const startFight = () => {
    setInsult("");
    setPhase("fighting");
    setTimerRunning(true);
  };

  const finishFight = useCallback((submittedInsult?: string) => {
    setTimerRunning(false);
    const text = submittedInsult ?? insult;
    const pScore = scoreInsult(text);
    const bot = getBotInsult(pScore);
    setPlayerScore(pScore);
    setBotInsult(bot.text);
    setBotScore(bot.score);
    setPhase("result");
  }, [insult]);

  const handleTimerExpire = useCallback(() => {
    finishFight();
  }, [finishFight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insult.trim()) return;
    finishFight(insult);
  };

  const playerWon = playerScore > botScore;
  const draw = playerScore === botScore;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-sm">← Назад</Link>
          <h1 className="text-xl font-bold text-slate-300">Бой против бота</h1>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">Без рейтинга</span>
        </div>

        {phase === "ready" && (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-8 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-2">Встреть бота</h2>
            <p className="text-slate-500 mb-6">
              У тебя будет <span className="text-orange-400 font-bold">60 секунд</span> чтобы написать оскорбление.
              Чем оно мощнее — тем выше очки Ебейшей Силы!
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6 text-sm text-slate-500">
              <div className="rounded-lg bg-[#0a0a0a] p-3">
                <div className="text-xl mb-1">✍️</div>
                <div>Пиши оскорбление</div>
              </div>
              <div className="rounded-lg bg-[#0a0a0a] p-3">
                <div className="text-xl mb-1">⚡</div>
                <div>Получи оценку</div>
              </div>
              <div className="rounded-lg bg-[#0a0a0a] p-3">
                <div className="text-xl mb-1">🏆</div>
                <div>Победи бота</div>
              </div>
            </div>
            <button
              onClick={startFight}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-white text-lg transition-all hover:scale-105"
            >
              Начать схватку! 🔥
            </button>
          </div>
        )}

        {phase === "fighting" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-500/30 bg-[#0f0f0f] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-white">Напиши своё оскорбление!</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Система оценит его Ебейшую Силу</p>
                </div>
                <Timer seconds={60} onExpire={handleTimerExpire} running={timerRunning} />
              </div>
              <form onSubmit={handleSubmit}>
                <textarea
                  value={insult}
                  onChange={(e) => setInsult(e.target.value)}
                  placeholder="Твоё оскорбление здесь..."
                  rows={4}
                  maxLength={500}
                  autoFocus
                  className="insult-textarea w-full rounded-lg p-3 mb-3"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">{insult.length}/500 символов</span>
                  <button
                    type="submit"
                    disabled={!insult.trim()}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-bold text-sm transition-colors"
                  >
                    Нанести удар! ⚡
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="space-y-4">
            {/* Result banner */}
            <div className={`rounded-xl p-6 text-center border ${
              playerWon
                ? "border-green-500/30 bg-green-950/20"
                : draw
                ? "border-slate-500/30 bg-slate-900/20"
                : "border-red-500/30 bg-red-950/20"
            }`}>
              <div className="text-5xl mb-2">
                {playerWon ? "🏆" : draw ? "🤝" : "💀"}
              </div>
              <h2 className={`text-3xl font-impact mb-1 ${
                playerWon ? "text-green-400" : draw ? "text-slate-400" : "text-red-400"
              }`}>
                {playerWon ? "ПОБЕДА!" : draw ? "НИЧЬЯ!" : "ПОРАЖЕНИЕ!"}
              </h2>
              <p className="text-slate-500 text-sm">
                {playerWon
                  ? "Ты уничтожил бота своим словесным мастерством!"
                  : draw
                  ? "Вы оказались равны по мощи оскорбления!"
                  : "Бот оказался сильнее. Тренируйся!"}
              </p>
            </div>

            {/* Scores comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-orange-900/50 border border-orange-500/50 flex items-center justify-center text-xs font-bold text-orange-400">Я</div>
                  <span className="text-sm font-bold text-slate-300">Твой удар</span>
                </div>
                <p className="text-xs text-slate-500 italic mb-3 min-h-[40px]">
                  &ldquo;{insult || "(время вышло)"}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
                    <div
                      className="h-full score-bar-fill rounded-full transition-all duration-1000"
                      style={{ width: `${playerScore}%` }}
                    />
                  </div>
                  <span className={`text-lg font-impact ${playerWon ? "text-orange-400" : "text-slate-400"}`}>
                    {playerScore}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">очков ЕС</p>
              </div>

              <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600/50 flex items-center justify-center text-sm">🤖</div>
                  <span className="text-sm font-bold text-slate-300">Бот</span>
                </div>
                <p className="text-xs text-slate-500 italic mb-3 min-h-[40px]">
                  &ldquo;{botInsult}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-slate-600 to-slate-500 rounded-full transition-all duration-1000"
                      style={{ width: `${botScore}%` }}
                    />
                  </div>
                  <span className={`text-lg font-impact ${!playerWon && !draw ? "text-orange-400" : "text-slate-400"}`}>
                    {botScore}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">очков ЕС</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startFight}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-white transition-colors"
              >
                Реванш! 🔥
              </button>
              <Link
                href="/play/pvp"
                className="flex-1 py-3 rounded-xl border border-orange-500/30 hover:border-orange-500 text-orange-400 font-bold text-center transition-colors"
              >
                Против игрока ⚔️
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
