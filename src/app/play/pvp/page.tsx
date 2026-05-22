"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { scoreInsult, getBotInsult } from "@/lib/scoring";
import { WIN_POINTS, LOSS_POINTS, getRankForRating } from "@/lib/ranks";
import { checkAndUpdateAchievements } from "@/lib/achievements";
import Timer from "@/components/Timer";
import Navbar from "@/components/Navbar";
import type { Profile, Game } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Ghost-opponent helpers ────────────────────────────────────
const G_ADJ = [
  "Кровавый","Злобный","Бешеный","Ядовитый","Дикий","Тёмный","Безумный",
  "Лютый","Страшный","Грозный","Матёрый","Шальной","Яростный","Коварный",
  "Лихой","Свирепый","Буйный","Дерзкий","Зверский","Беспощадный",
];
const G_NAMES = [
  "Вася","Петя","Колян","Серёга","Дима","Антоха","Сашок","Миша",
  "Женька","Ромка","Витёк","Пашок","Лёха","Толян","Борян","Костян",
  "Тёма","Артёмка","Гришка","Вовик",
];
const G_SFX = ["666","228","_pro","","_real","_pvp","2077","_gg","_og","322"];

function ghostNick() {
  const r = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  return r(G_ADJ) + r(G_NAMES) + r(G_SFX);
}
function ghostRating(my: number) {
  return Math.max(0, my + Math.floor(Math.random() * 400) - 200);
}
function ghostScore(rating: number): number {
  const bands: [number, number, number, number][] = [
    [0,    200,  10, 24], [200,  400,  20, 34], [400,  650,  30, 49],
    [650,  1000, 45, 64], [1000, 1400, 55, 74], [1400, 1900, 65, 79],
    [1900, 2500, 70, 89], [2500, Infinity, 80, 99],
  ];
  const [,, lo, hi] = bands.find(([a, b]) => rating >= a && rating < b) ?? bands[0];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ─────────────────────────────────────────────────────────────

type Phase = "lobby" | "searching" | "fighting" | "result";

export default function PvPPage() {
  const [phase, setPhase]                     = useState<Phase>("lobby");
  const [profile, setProfile]                 = useState<Profile | null>(null);
  const [opponent, setOpponent]               = useState<Profile | null>(null);
  const [game, setGame]                       = useState<Game | null>(null);
  const [insult, setInsult]                   = useState("");
  const [timerRunning, setTimerRunning]       = useState(false);
  const [submitted, setSubmitted]             = useState(false);
  // ── Bug 3 fix: track opponent submission separately ──
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [ratingChange, setRatingChange]       = useState(0);
  const [isGhostMatch, setIsGhostMatch]       = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [searchSecs, setSearchSecs]           = useState(0);
  const [matchFoundFlash, setMatchFoundFlash] = useState(false);

  const profileRef    = useRef<Profile | null>(null);
  const gameFoundRef  = useRef(false);
  const gameRef       = useRef<Game | null>(null);
  const submittedRef  = useRef(false);
  const insultRef     = useRef("");
  const matchChanRef  = useRef<RealtimeChannel | null>(null);
  const gameChanRef   = useRef<RealtimeChannel | null>(null);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Bug 1/2 fix: force-resolve stuck games ──
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGhostRef    = useRef(false);
  const ghostScoreRef = useRef(0);
  const ghostInsultRef = useRef("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);
  useEffect(() => { insultRef.current = insult; }, [insult]);

  const clearAllTimers = useCallback(() => {
    if (ghostTimerRef.current)   { clearTimeout(ghostTimerRef.current);   ghostTimerRef.current   = null; }
    if (resolveTimerRef.current) { clearTimeout(resolveTimerRef.current); resolveTimerRef.current = null; }
    if (countdownRef.current)    { clearInterval(countdownRef.current);   countdownRef.current    = null; }
    if (stuckTimerRef.current)   { clearTimeout(stuckTimerRef.current);   stuckTimerRef.current   = null; }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => { setProfile(data); profileRef.current = data; });
    });
    return () => {
      matchChanRef.current?.unsubscribe();
      gameChanRef.current?.unsubscribe();
      clearAllTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Bug 1/2: force-resolve if opponent disappeared ────────
  const forceResolveIfStuck = useCallback(async () => {
    const g  = gameRef.current;
    const me = profileRef.current;
    if (!g || !me) return;

    // Fetch fresh state to avoid acting on stale data
    const { data: fresh } = await supabase
      .from("games").select("*").eq("id", g.id).single();

    // Abort if game already resolved or this game is no longer active
    if (!fresh || fresh.status === "finished" || gameRef.current?.id !== g.id) return;

    const isP1    = me.id === fresh.player1_id;
    const myIns   = isP1 ? fresh.player1_insult : fresh.player2_insult;
    const oppIns  = isP1 ? fresh.player2_insult : fresh.player1_insult;
    const myField = isP1 ? "player1_insult" : "player2_insult";
    const opField = isP1 ? "player2_insult" : "player1_insult";

    if (oppIns !== null) return; // Opponent did submit — game should resolve via realtime soon

    const updates: Record<string, string> = { [opField]: "" };
    if (myIns === null) updates[myField] = ""; // also submit empty for me if I haven't

    // Use .neq("status","finished") as optimistic lock against double-execution
    const { data: updated } = await supabase
      .from("games")
      .update(updates)
      .eq("id", fresh.id)
      .neq("status", "finished")
      .select().single();

    if (updated) {
      const ug = updated as Game;
      setGame(ug);
      gameRef.current = ug;
      resolveGame(ug);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ghost fight: resolve ──────────────────────────────────
  const resolveGhostFight = useCallback(async (playerInsult: string) => {
    const me = profileRef.current;
    if (!me) return;

    if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }

    const playerScore = scoreInsult(playerInsult);
    const botScore    = ghostScoreRef.current;
    const botInsult   = ghostInsultRef.current;
    const won         = playerScore > botScore;
    const draw        = playerScore === botScore;

    const delta = won ? WIN_POINTS : draw ? 0 : LOSS_POINTS;
    setRatingChange(delta);

    // ── Сохраняем в Скорбные Анналы ────────────────────────
    if (playerInsult.trim() && playerScore > 0) {
      supabase.from("insult_records").insert({
        insult: playerInsult,
        score: playerScore,
        author_id: me.id,
      }).then();
    }

    const fakeGame = {
      id: "ghost-" + Date.now(),
      player1_id: me.id,
      player2_id: "ghost",
      player1_insult: playerInsult,
      player2_insult: botInsult,
      player1_score: playerScore,
      player2_score: botScore,
      winner_id: won ? me.id : !draw ? "ghost" : null,
      status: "finished",
    } as unknown as Game;

    setGame(fakeGame);
    gameRef.current = fakeGame;
    setPhase("result");

    await supabase.rpc("update_streak", { uid: me.id });
    if (won) {
      await supabase.rpc("increment_rating",   { uid: me.id, delta: WIN_POINTS });
      await supabase.rpc("increment_wins",     { uid: me.id });
      await supabase.rpc("increment_pvp_wins", { uid: me.id });
    } else if (!draw) {
      await supabase.rpc("increment_rating",   { uid: me.id, delta: LOSS_POINTS });
      await supabase.rpc("increment_losses",   { uid: me.id });
    }

    const { data: updatedP } = await supabase.from("profiles").select("*").eq("id", me.id).single();
    if (updatedP) {
      const { data: rc } = await supabase.rpc("get_referral_count", { uid: me.id });
      const stats = {
        total_games: (updatedP.wins ?? 0) + (updatedP.losses ?? 0) + (updatedP.bot_games ?? 0),
        pvp_wins:    updatedP.pvp_wins ?? 0,
        bot_wins:    updatedP.bot_wins ?? 0,
        max_insult_score: Math.max(playerScore, updatedP.max_insult_score ?? 0),
        streak_days: updatedP.streak_days ?? 1,
        referral_count: (rc as number) ?? 0,
      };
      const unlocked = await checkAndUpdateAchievements(supabase, me.id, stats);
      if (unlocked.length > 0) setNewAchievements(unlocked);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ghost fight: start ────────────────────────────────────
  const startGhostFight = useCallback(() => {
    const me = profileRef.current;
    if (!me || gameFoundRef.current) return;
    gameFoundRef.current = true;

    supabase.from("matchmaking_queue").delete().eq("user_id", me.id);
    matchChanRef.current?.unsubscribe();
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }

    const fakeRating = ghostRating(me.rating);
    const fakeName   = ghostNick();
    const fakeScore  = ghostScore(fakeRating);
    const fakeInsult = getBotInsult(fakeScore).text;

    ghostScoreRef.current  = fakeScore;
    ghostInsultRef.current = fakeInsult;
    isGhostRef.current     = true;
    setIsGhostMatch(true);

    setOpponent({
      id: "ghost", username: fakeName, avatar_url: null,
      rating: fakeRating, wins: 0, losses: 0,
    } as unknown as Profile);

    setMatchFoundFlash(true);
    setTimeout(() => {
      setMatchFoundFlash(false);
      setPhase("fighting");
      setTimerRunning(true);
    }, 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Real PvP: subscribe to game updates ──────────────────
  const resolveGame = useCallback(async (g: Game) => {
    const me = profileRef.current;
    if (!me || !g.player1_insult || !g.player2_insult) return;

    // Clear stuck timer — game is resolving normally
    if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }

    const score1   = scoreInsult(g.player1_insult);
    const score2   = scoreInsult(g.player2_insult);
    const winnerId = score1 > score2 ? g.player1_id : score2 > score1 ? g.player2_id : null;

    await supabase.from("games").update({
      player1_score: score1, player2_score: score2,
      winner_id: winnerId, status: "finished",
    }).eq("id", g.id);

    const isP1     = me.id === g.player1_id;
    const myScore  = isP1 ? score1 : score2;
    const theirScore = isP1 ? score2 : score1;
    const theirId  = isP1 ? g.player2_id! : g.player1_id;

    // ── Сохраняем в Скорбные Анналы (fire-and-forget) ───────
    const myInsult = (isP1 ? g.player1_insult : g.player2_insult) ?? "";
    if (myInsult.trim() && myScore > 0) {
      supabase.from("insult_records").insert({
        insult: myInsult,
        score: myScore,
        author_id: me.id,
      }).then();
    }

    if (myScore > theirScore) {
      setRatingChange(WIN_POINTS);
      await supabase.rpc("increment_rating",   { uid: me.id,   delta: WIN_POINTS });
      await supabase.rpc("increment_wins",     { uid: me.id });
      await supabase.rpc("increment_pvp_wins", { uid: me.id });
      await supabase.rpc("increment_rating",   { uid: theirId, delta: LOSS_POINTS });
      await supabase.rpc("increment_losses",   { uid: theirId });
    } else if (theirScore > myScore) {
      setRatingChange(LOSS_POINTS);
      await supabase.rpc("increment_rating",   { uid: me.id,   delta: LOSS_POINTS });
      await supabase.rpc("increment_losses",   { uid: me.id });
      await supabase.rpc("increment_rating",   { uid: theirId, delta: WIN_POINTS });
      await supabase.rpc("increment_wins",     { uid: theirId });
      await supabase.rpc("increment_pvp_wins", { uid: theirId });
    }
    setPhase("result");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribeToGame = useCallback((gameId: string) => {
    gameChanRef.current = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        ({ new: updated }: { new: unknown }) => {
          const g = updated as Game;
          setGame(g);
          gameRef.current = g;

          // ── Bug 3 fix: detect opponent submission via DB state ──
          const me = profileRef.current;
          if (me) {
            const oppInsult = me.id === g.player1_id ? g.player2_insult : g.player1_insult;
            if (oppInsult !== null) setOpponentSubmitted(true);
          }

          if (g.player1_insult !== null && g.player2_insult !== null && g.status !== "finished") {
            resolveGame(g);
          }
        }
      )
      .subscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveGame]);

  // ── Real PvP: match found ─────────────────────────────────
  const handleGameFound = useCallback(async (g: Game) => {
    if (gameFoundRef.current) return;
    gameFoundRef.current = true;

    if (ghostTimerRef.current) { clearTimeout(ghostTimerRef.current); ghostTimerRef.current = null; }
    if (countdownRef.current)  { clearInterval(countdownRef.current);  countdownRef.current  = null; }
    matchChanRef.current?.unsubscribe();

    setGame(g);
    gameRef.current = g;

    const me = profileRef.current;
    const opponentId = g.player1_id === me?.id ? g.player2_id : g.player1_id;
    if (opponentId) {
      const { data: opp } = await supabase
        .from("profiles").select("*").eq("id", opponentId).single();
      setOpponent(opp);
    }

    setMatchFoundFlash(true);
    setTimeout(() => {
      setMatchFoundFlash(false);
      setPhase("fighting");
      setTimerRunning(true);
      subscribeToGame(g.id);

      // ── Bug 1/2 fix: if opponent never submits, force-resolve after 65s ──
      stuckTimerRef.current = setTimeout(() => forceResolveIfStuck(), 65000);
    }, 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToGame, forceResolveIfStuck]);

  // ── Join matchmaking ──────────────────────────────────────
  const joinMatchmaking = async () => {
    const me = profileRef.current;
    if (!me) return;
    gameFoundRef.current = false;
    isGhostRef.current   = false;
    setIsGhostMatch(false);
    setMatchFoundFlash(false);
    setSearchSecs(0);
    setOpponentSubmitted(false);
    setPhase("searching");

    await supabase.from("matchmaking_queue").delete().eq("user_id", me.id);

    matchChanRef.current = supabase
      .channel(`matchmaking-${me.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: `player1_id=eq.${me.id}` },
        ({ new: g }: { new: unknown }) => handleGameFound(g as Game))
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: `player2_id=eq.${me.id}` },
        ({ new: g }: { new: unknown }) => handleGameFound(g as Game))
      .subscribe();

    // ── Bug 1 fix: clean up stale queue entries before looking ──
    await supabase.rpc("clean_matchmaking_queue");
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
        p1_id: opponentId, p2_id: me.id,
      });
      if (!error && newGameId) {
        const { data: newGame } = await supabase
          .from("games").select("*").eq("id", newGameId).single();
        if (newGame) { handleGameFound(newGame as Game); return; }
      }
    }

    // No immediate match — start countdown and ghost timer
    countdownRef.current = setInterval(() => setSearchSecs(s => s + 1), 1000);
    ghostTimerRef.current = setTimeout(() => {
      if (!gameFoundRef.current) startGhostFight();
    }, 20000);
  };

  // ── Submit insult ─────────────────────────────────────────
  const submitInsult = useCallback(async (text?: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setTimerRunning(false);

    const finalText = text ?? insultRef.current;

    // ── Ghost fight path ──
    if (isGhostRef.current) {
      const delay = 1500 + Math.random() * 2500; // 1.5–4s
      resolveTimerRef.current = setTimeout(() => {
        // ── Bug 3 fix: mark ghost opponent as submitted just before resolving ──
        setOpponentSubmitted(true);
        setTimeout(() => resolveGhostFight(finalText), 400);
      }, delay);
      return;
    }

    // ── Real PvP path ──
    const g  = gameRef.current;
    const me = profileRef.current;
    if (!g || !me) return;

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
  }, [resolveGame, resolveGhostFight]);

  const handleTimerExpire = useCallback(() => submitInsult(""), [submitInsult]);

  const leaveQueue = async () => {
    const me = profileRef.current;
    if (me) await supabase.from("matchmaking_queue").delete().eq("user_id", me.id);
    matchChanRef.current?.unsubscribe();
    clearAllTimers();
    gameFoundRef.current = false;
    setPhase("lobby");
    setSearchSecs(0);
    setMatchFoundFlash(false);
  };

  const resetGame = () => {
    clearAllTimers();
    gameFoundRef.current = false;
    submittedRef.current = false;
    isGhostRef.current   = false;
    insultRef.current    = "";
    gameRef.current      = null; // explicit clear so stuck timer guard works
    setPhase("lobby");
    setGame(null);
    setOpponent(null);
    setInsult("");
    setSubmitted(false);
    setOpponentSubmitted(false);
    setRatingChange(0);
    setIsGhostMatch(false);
    setNewAchievements([]);
    setSearchSecs(0);
    setMatchFoundFlash(false);
  };

  // ── Derived display values ────────────────────────────────
  const myScore   = game && profile
    ? (profile.id === game.player1_id ? game.player1_score : game.player2_score) : null;
  const oppScore  = game && profile
    ? (profile.id === game.player1_id ? game.player2_score : game.player1_score) : null;
  const myInsult  = game && profile
    ? (profile.id === game.player1_id ? game.player1_insult : game.player2_insult) : null;
  const oppInsult = game && profile
    ? (profile.id === game.player1_id ? game.player2_insult : game.player1_insult) : null;
  const iWon  = myScore !== null && oppScore !== null && myScore > oppScore;
  const isDraw = myScore !== null && oppScore !== null && myScore === oppScore;
  const oppRank = opponent ? getRankForRating(opponent.rating) : null;

  // ─────────────────────────────────────────────────────────

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

        {/* ── Lobby ── */}
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

        {/* ── Searching ── */}
        {phase === "searching" && (
          <div className="rounded-xl border border-orange-500/20 bg-[#0f0f0f] p-8 text-center">
            {matchFoundFlash ? (
              <>
                <div className="text-5xl mb-4">🔥</div>
                <h2 className="text-xl font-bold text-green-400 mb-2">Соперник найден!</h2>
                <p className="text-slate-500">Готовимся к бою...</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4 animate-bounce">🔍</div>
                <h2 className="text-xl font-bold text-white mb-2">Ищем соперника...</h2>
                <p className="text-slate-500 mb-1">Ожидаем пока кто-то примет вызов</p>
                <p className="text-xs text-slate-700 mb-6">Поиск идёт уже {searchSecs}с</p>
                <div className="flex gap-2 justify-center mb-6">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <button onClick={leaveQueue}
                  className="text-sm text-slate-600 hover:text-slate-400 transition-colors">
                  Отмена
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Fighting ── */}
        {phase === "fighting" && (
          <div className="space-y-4">
            {/* Opponent banner — Bug 3 fix: use opponentSubmitted */}
            {opponent && (
              <div className="flex items-center gap-3 rounded-xl border border-red-900/30 bg-red-950/10 p-3">
                <div className="w-8 h-8 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center text-xs font-bold text-red-400">
                  {opponent.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-red-400 block truncate">{opponent.username}</span>
                  {oppRank && (
                    <span className={`text-xs ${oppRank.color}`}>
                      {oppRank.emoji} {oppRank.name} · {opponent.rating} ОР
                    </span>
                  )}
                </div>
                {/* ── Bug 3: this now shows OPPONENT's status, not mine ── */}
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                  opponentSubmitted
                    ? "bg-green-950/50 text-green-400 border border-green-800/30"
                    : "bg-slate-800/50 text-slate-400 border border-slate-700/30 animate-pulse"
                }`}>
                  {opponentSubmitted ? "Написал ✓" : "Пишет..."}
                </span>
              </div>
            )}

            {/* Input area */}
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

        {/* ── Result ── */}
        {phase === "result" && game && (
          <div className="space-y-4">
            {newAchievements.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
                <p className="text-amber-400 font-bold text-sm mb-1">🏆 Новые достижения!</p>
                {newAchievements.map((u, i) => <p key={i} className="text-amber-300 text-xs">• {u}</p>)}
              </div>
            )}

            <div className={`rounded-xl p-6 text-center border ${
              iWon  ? "border-green-500/30 bg-green-950/20"
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
              {isGhostMatch && (
                <p className="text-xs text-slate-600 mt-2">засчитано как PvP бой</p>
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
              <button onClick={resetGame}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-white transition-colors">
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
