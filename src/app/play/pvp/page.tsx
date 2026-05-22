"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { scoreInsult } from "@/lib/scoring";
import { WIN_POINTS, LOSS_POINTS } from "@/lib/ranks";
import Timer from "@/components/Timer";
import Navbar from "@/components/Navbar";
import type { Profile, Game } from "@/lib/supabase";

type Phase = "lobby" | "searching" | "fighting" | "result";

export default function PvPPage() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [insult, setInsult] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratingChange, setRatingChange] = useState(0);

  const profileRef = useRef<Profile | null>(null);
  const gameFoundRef = useRef(false);
  const gameRef = useRef<Game | null>(null);
  const submittedRef = useRef(false);
  const insultRef = useRef("");
  const matchChanRef = useRef<ReturnType<typeof createClient> | null>(null);
  const gameChanRef = useRef<ReturnType<typeof createClient> | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);
  useEffect(() => { insultRef.current = insult; }, [insult]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => { setProfile(data); profileRef.current = data; });
    });
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matchChanRef.current as any)?.unsubscribe();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gameChanRef.current as any)?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribeToGame = useCallback((gameId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameChanRef.current as any) = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      }, ({ new: updated }: { new: unknown }) => {
        const g = updated as Game;
        setGame(g);
        gameRef.current = g;
        if (g.player1_insult !== null && g.player2_insult !== null && g.status !== "finished") {
          resolveGame(g);
        }
      })
      .subscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveGame = useCallback(async (g: Game) => {
    const me = profileRef.current;
    if (!me || !g.player1_insult || !g.player2_insult) return;

    const score1 = scoreInsult(g.player1_insult);
    const score2 = scoreInsult(g.player2_insult);
    const winnerId = score1 > score2 ? g.player1_id : score2 > score1 ? g.player2_id : null;

    await supabase.from("games").update({
      player1_score: score1,
      player2_score: score2,
      winner_id: winnerId,
      status: "finished",
    }).eq("id", g.id);

    const isP1 = me.id === g.player1_id;
    const myScore = isP1 ? score1 : score2;
    const theirScore = isP1 ? score2 : score1;
    const theirId = isP1 ? g.player2_id! : g.player1_id;

    if (myScore > theirScore) {
      setRatingChange(WIN_POINTS);
      await supabase.rpc("increment_rating", { uid: me.id, delta: WIN_POINTS });
      await supabase.rpc("increment_wins", { uid: me.id });
      await supabase.rpc("increment_rating", { uid: theirId, delta: LOSS_POINTS });
      await supabase.rpc("increment_losses", { uid: theirId });
    } else if (theirScore > myScore) {
      setRatingChange(LOSS_POINTS);
      await supabase.rpc("increment_rating", { uid: me.id, delta: LOSS_POINTS });
      await supabase.rpc("increment_losses", { uid: me.id });
      await supabase.rpc("increment_rating", { uid: theirId, delta: WIN_POINTS });
      await supabase.rpc("increment_wins", { uid: theirId });
    }
    setPhase("result");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGameFound = useCallback(async (g: Game) => {
    if (gameFoundRef.current) return;
    gameFoundRef.current = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matchChanRef.current as any)?.unsubscribe();

    setGame(g);
    gameRef.current = g;

    const me = profileRef.current;
    const opponentId = g.player1_id === me?.id ? g.player2_id : g.player1_id;
    if (opponentId) {
      const { data: opp } = await supabase
        .from("profiles").select("*").eq("id", opponentId).single();
      setOpponent(opp);
    }
    setPhase("fighting");
    setTimerRunning(true);
    subscribeToGame(g.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToGame]);

  const joinMatchmaking = async () => {
    const me = profileRef.current;
    if (!me) return;
    gameFoundRef.current = false;
    setPhase("searching");

    await supabase.from("matchmaking_queue").delete().eq("user_id", me.id);

    // Подписка ДО вставки в очередь
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matchChanRef.current as any) = supabase
      .channel(`matchmaking-${me.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "games",
        filter: `player1_id=eq.${me.id}`,
      }, ({ new: g }: { new: unknown }) => handleGameFound(g as Game))
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "games",
        filter: `player2_id=eq.${me.id}`,
      }, ({ new: g }: { new: unknown }) => handleGameFound(g as Game))
      .subscribe();

    await supabase.from("matchmaking_queue").insert({ user_id: me.id });

    const { data: queue } = await supabase
      .from("matchmaking_queue")
      .select("user_id")
      .neq("user_id", me.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (queue && queue.length > 0) {
      const opponentId = queue[0].user_id;
      const { data: newGameId, error } = await supabase.rpc("create_pvp_match", {
        p1_id: opponentId,
        p2_id: me.id,
      });
      if (!error && newGameId) {
        const { data: newGame } = await supabase
          .from("games").select("*").eq("id", newGameId).single();
        if (newGame) handleGameFound(newGame as Game);
      }
    }
  };

  const submitInsult = useCallback(async (text?: string) => {
    const g = gameRef.current;
    const me = profileRef.current;
    if (!g || !me || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setTimerRunning(false);

    const finalText = text ?? insultRef.current;
    const field = me.id === g.player1_id ? "player1_insult" : "player2_insult";

    const { data: updated } = await supabase
      .from("games").update({ [field]: finalText || "" })
      .eq("id", g.id).select().single();

    if (updated) {
      const ug = updated as Game;
      setGame(ug);
      gameRef.current = ug;
      if (ug.player1_insult !== null && ug.player2_insult !== null) {
        resolveGame(ug);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveGame]);

  const handleTimerExpire = useCallback(() => submitInsult(""), [submitInsult]);

  const leaveQueue = async () => {
    const me = profileRef.current;
    if (me) await supabase.from("matchmaking_queue").delete().eq("user_id", me.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matchChanRef.current as any)?.unsubscribe();
    gameFoundRef.current = false;
    setPhase("lobby");
  };

  const resetGame = () => {
    gameFoundRef.current = false;
    submittedRef.current = false;
    setPhase("lobby");
    setGame(null);
    setOpponent(null);
    setInsult("");
    setSubmitted(false);
    setRatingChange(0);
    insultRef.current = "";
  };

  const myScore = game && profile
    ? (profile.id === game.player1_id ? game.player1_score : game.player2_score) : null;
  const oppScore = game && profile
    ? (profile.id === game.player1_id ? game.player2_score : game.player1_score) : null;
  const myInsult = game && profile
    ? (profile.id === game.player1_id ? game.player1_insult : game.player2_insult) : null;
  const oppInsult = game && profile
    ? (profile.id === game.player1_id ? game.player2_insult : game.player1_insult) : null;
  const iWon = myScore !== null && oppScore !== null && myScore > oppScore;
  const isDraw = myScore !== null && oppScore !== null && myScore === oppScore;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-sm">← Назад</Link>
          <h1 className="text-xl font-bold text-slate-300">PvP бой</h1>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-950/50 text-orange-400 border border-orange-800/30">
            +{WIN_POINTS} / {LOSS_POINTS} ОР
          </span>
        </div>

        {phase === "lobby" && (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-8 text-center">
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-2xl font-bold text-white mb-2">PvP Битва</h2>
            <p className="text-slate-500 mb-6">
              Мы найдём тебе соперника. У обоих будет{" "}
              <span className="text-orange-400 font-bold">60 секунд</span> написать оскорбление.
              Кто наберёт больше очков Ебейшей Силы — победит!
            </p>
            <button
              onClick={joinMatchmaking}
              disabled={!profile}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-white text-lg transition-all hover:scale-105 disabled:opacity-50"
            >
              Найти соперника ⚔️
            </button>
          </div>
        )}

        {phase === "searching" && (
          <div className="rounded-xl border border-orange-500/20 bg-[#0f0f0f] p-8 text-center">
            <div className="text-5xl mb-4 animate-bounce">🔍</div>
            <h2 className="text-xl font-bold text-white mb-2">Ищем соперника...</h2>
            <p className="text-slate-500 mb-6">Ожидаем пока кто-то примет вызов</p>
            <div className="flex gap-2 justify-center mb-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <button onClick={leaveQueue} className="text-sm text-slate-600 hover:text-slate-400 transition-colors">
              Отмена
            </button>
          </div>
        )}

        {phase === "fighting" && (
          <div className="space-y-4">
            {opponent && (
              <div className="flex items-center justify-between rounded-xl border border-red-900/30 bg-red-950/10 p-3">
                <span className="text-sm text-slate-400">Соперник:</span>
                <span className="font-bold text-red-400">{opponent.username}</span>
                <span className="text-xs text-slate-600">{submitted ? "Уже написал..." : "Пишет..."}</span>
              </div>
            )}
            <div className="rounded-xl border border-orange-500/30 bg-[#0f0f0f] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-white">
                    {submitted ? "Ожидаем соперника..." : "Напиши своё оскорбление!"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {submitted ? "Оскорбление отправлено ✓" : "Система оценит его Ебейшую Силу"}
                  </p>
                </div>
                <Timer seconds={60} onExpire={handleTimerExpire} running={timerRunning} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); submitInsult(insult); }}>
                <textarea
                  value={insult}
                  onChange={(e) => { setInsult(e.target.value); insultRef.current = e.target.value; }}
                  placeholder="Твоё оскорбление здесь..."
                  rows={4}
                  maxLength={500}
                  disabled={submitted}
                  autoFocus={!submitted}
                  className="insult-textarea w-full rounded-lg p-3 mb-3 disabled:opacity-50"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">{insult.length}/500</span>
                  <button
                    type="submit"
                    disabled={!insult.trim() || submitted}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-bold text-sm transition-colors"
                  >
                    {submitted ? "Отправлено ✓" : "Нанести удар! ⚡"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {phase === "result" && game && (
          <div className="space-y-4">
            <div className={`rounded-xl p-6 text-center border ${
              iWon ? "border-green-500/30 bg-green-950/20"
              : isDraw ? "border-slate-500/30 bg-slate-900/20"
              : "border-red-500/30 bg-red-950/20"
            }`}>
              <div className="text-5xl mb-2">{iWon ? "🏆" : isDraw ? "🤝" : "💀"}</div>
              <h2 className={`text-3xl font-impact mb-1 ${
                iWon ? "text-green-400" : isDraw ? "text-slate-400" : "text-red-400"
              }`}>
                {iWon ? "ПОБЕДА!" : isDraw ? "НИЧЬЯ!" : "ПОРАЖЕНИЕ!"}
              </h2>
              {ratingChange !== 0 && (
                <div className={`text-xl font-bold mt-1 ${ratingChange > 0 ? "text-green-400" : "text-red-400"}`}>
                  {ratingChange > 0 ? "+" : ""}{ratingChange} ОР
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4">
                <p className="text-xs text-slate-500 font-bold mb-1">Ты</p>
                <p className="text-xs text-slate-500 italic mb-2 min-h-[36px]">
                  &ldquo;{myInsult || "(не успел)"}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
                    <div className="h-full score-bar-fill" style={{ width: `${myScore ?? 0}%` }} />
                  </div>
                  <span className={`font-impact text-lg ${iWon ? "text-orange-400" : "text-slate-400"}`}>
                    {myScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4">
                <p className="text-xs text-slate-500 font-bold mb-1">{opponent?.username ?? "Соперник"}</p>
                <p className="text-xs text-slate-500 italic mb-2 min-h-[36px]">
                  &ldquo;{oppInsult || "(не успел)"}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-800 to-red-600"
                      style={{ width: `${oppScore ?? 0}%` }} />
                  </div>
                  <span className={`font-impact text-lg ${!iWon && !isDraw ? "text-orange-400" : "text-slate-400"}`}>
                    {oppScore ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetGame}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-white transition-colors"
              >
                Реванш! 🔥
              </button>
              <Link href="/leaderboard"
                className="flex-1 py-3 rounded-xl border border-[#2e2e2e] hover:border-orange-500/50 text-slate-400 font-bold text-center transition-colors">
                Рейтинг
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
