"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { scoreInsult } from "@/lib/scoring";
import Timer from "@/components/Timer";
import Navbar from "@/components/Navbar";
import type { Profile, Tournament, Game } from "@/lib/supabase";

type TournamentParticipant = {
  tournament_id: string;
  user_id: string;
  eliminated: boolean;
  profiles: Profile;
};

type Phase = "list" | "waiting" | "fighting" | "bracket" | "finished";

export default function TournamentPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [myGame, setMyGame] = useState<Game | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<Phase>("list");
  const [insult, setInsult] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
    });
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .in("status", ["registration", "active"])
      .order("created_at", { ascending: false });
    setTournaments(data || []);
  };

  const loadParticipants = async (tournamentId: string) => {
    const { data } = await supabase
      .from("tournament_participants")
      .select("*, profiles(*)")
      .eq("tournament_id", tournamentId);
    setParticipants((data as unknown as TournamentParticipant[]) || []);
  };

  const createTournament = async () => {
    if (!newTournamentName.trim() || !profile) return;
    setCreating(true);
    const { data } = await supabase
      .from("tournaments")
      .insert({ name: newTournamentName.trim(), max_players: 8 })
      .select()
      .single();
    if (data) {
      await joinTournament(data as Tournament);
    }
    setCreating(false);
    setNewTournamentName("");
  };

  const joinTournament = async (tournament: Tournament) => {
    if (!profile) return;
    await supabase.from("tournament_participants").upsert({
      tournament_id: tournament.id,
      user_id: profile.id,
    });
    setActiveTournament(tournament);
    await loadParticipants(tournament.id);
    setPhase("waiting");
    subscribeToTournament(tournament.id);
  };

  const startTournament = async () => {
    if (!activeTournament || participants.length < 2) return;
    await supabase.from("tournaments").update({ status: "active", current_round: 1 }).eq("id", activeTournament.id);

    // Create first round matches
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      await supabase.from("games").insert({
        mode: "tournament",
        status: "active",
        player1_id: shuffled[i].user_id,
        player2_id: shuffled[i + 1].user_id,
        tournament_id: activeTournament.id,
        tournament_round: 1,
      });
    }
  };

  const subscribeToTournament = (tournamentId: string) => {
    supabase
      .channel(`tournament:${tournamentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "games",
        filter: `tournament_id=eq.${tournamentId}`,
      }, async ({ new: g }) => {
        if (!profile) return;
        const game = g as Game;
        if (game.player1_id === profile.id || game.player2_id === profile.id) {
          setMyGame(game);
          const oppId = game.player1_id === profile.id ? game.player2_id : game.player1_id;
          if (oppId) {
            const { data: opp } = await supabase.from("profiles").select("*").eq("id", oppId).single();
            setOpponent(opp);
          }
          setPhase("fighting");
          setTimerRunning(true);
          setSubmitted(false);
          setInsult("");
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${tournamentId}` },
        ({ new: t }) => { setActiveTournament(t as Tournament); })
      .subscribe();
  };

  const submitInsult = useCallback(async (text?: string) => {
    if (!myGame || !profile || submitted) return;
    setSubmitted(true);
    setTimerRunning(false);
    const finalText = text ?? insult;
    const field = profile.id === myGame.player1_id ? "player1_insult" : "player2_insult";
    const { data: updated } = await supabase.from("games").update({ [field]: finalText || "" }).eq("id", myGame.id).select().single();
    if (updated) {
      const g = updated as Game;
      if (g.player1_insult !== null && g.player2_insult !== null) {
        const s1 = scoreInsult(g.player1_insult);
        const s2 = scoreInsult(g.player2_insult);
        const winnerId = s1 > s2 ? g.player1_id : s2 > s1 ? g.player2_id : g.player1_id;
        const loserId = winnerId === g.player1_id ? g.player2_id : g.player1_id;
        await supabase.from("games").update({ player1_score: s1, player2_score: s2, winner_id: winnerId, status: "finished" }).eq("id", g.id);
        if (loserId) await supabase.from("tournament_participants").update({ eliminated: true }).match({ tournament_id: g.tournament_id, user_id: loserId });
        setMyGame({ ...g, player1_score: s1, player2_score: s2, winner_id: winnerId, status: "finished" });
        setPhase("bracket");
      }
    }
  }, [myGame, profile, submitted, insult]);

  const myScore = myGame && profile ? (profile.id === myGame.player1_id ? myGame.player1_score : myGame.player2_score) : null;
  const oppScore = myGame && profile ? (profile.id === myGame.player1_id ? myGame.player2_score : myGame.player1_score) : null;
  const iWon = myGame?.winner_id === profile?.id;
  const isEliminated = activeTournament && participants.find(p => p.user_id === profile?.id)?.eliminated;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-sm">← Назад</Link>
          <h1 className="text-xl font-bold text-slate-300">🏆 Турниры</h1>
        </div>

        {phase === "list" && (
          <div className="space-y-4">
            {/* Create tournament */}
            <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-5">
              <h2 className="font-bold text-slate-300 mb-3">Создать турнир</h2>
              <div className="flex gap-2">
                <input
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="Название турнира..."
                  maxLength={40}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] focus:border-orange-500 focus:outline-none text-slate-200 text-sm"
                />
                <button
                  onClick={createTournament}
                  disabled={creating || !newTournamentName.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 rounded-lg text-sm font-bold transition-colors"
                >
                  Создать
                </button>
              </div>
            </div>

            {/* Existing tournaments */}
            <div>
              <h2 className="font-bold text-slate-300 mb-3">Открытые турниры</h2>
              {tournaments.length === 0 ? (
                <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-8 text-center text-slate-600">
                  Нет активных турниров. Создай первый!
                </div>
              ) : (
                <div className="space-y-2">
                  {tournaments.map((t) => (
                    <div key={t.id} className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">{t.name}</p>
                        <p className="text-xs text-slate-600">
                          {t.status === "registration" ? "Регистрация открыта" : "Идёт бой"}
                          {" · "}до {t.max_players} игроков
                        </p>
                      </div>
                      <button
                        onClick={() => joinTournament(t)}
                        disabled={t.status !== "registration"}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-colors"
                      >
                        {t.status === "registration" ? "Вступить" : "Смотреть"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "waiting" && activeTournament && (
          <div className="rounded-xl border border-orange-500/20 bg-[#0f0f0f] p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">⏳</div>
              <h2 className="text-xl font-bold text-white">{activeTournament.name}</h2>
              <p className="text-slate-500 text-sm mt-1">Ожидание игроков</p>
            </div>
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 py-2 border-b border-[#1e1e1e] last:border-0">
                  <span className="text-green-400 text-xs">●</span>
                  <span className="text-sm text-slate-300">{p.profiles?.username ?? "..."}</span>
                  {p.user_id === profile?.id && <span className="text-xs text-orange-400">(ты)</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 text-center">
              {participants.length} / {activeTournament.max_players} игроков
              {participants.length < 2 && " — нужно минимум 2"}
            </p>
            {participants[0]?.user_id === profile?.id && participants.length >= 2 && (
              <button
                onClick={startTournament}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-colors"
              >
                Начать турнир! 🏆
              </button>
            )}
          </div>
        )}

        {phase === "fighting" && myGame && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-amber-900/30 bg-amber-950/10 p-3">
              <span className="text-sm text-amber-400 font-bold">🏆 Турнир · Раунд {myGame.tournament_round}</span>
              <span className="text-sm text-slate-400">vs {opponent?.username}</span>
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-[#0f0f0f] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-white">{submitted ? "Ожидаем соперника..." : "Напиши оскорбление!"}</h2>
                  <p className="text-xs text-slate-600">{submitted ? "Отправлено ✓" : "60 секунд. Побеждает сильнейший!"}</p>
                </div>
                <Timer seconds={60} onExpire={() => submitInsult("")} running={timerRunning} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); submitInsult(insult); }}>
                <textarea
                  value={insult}
                  onChange={(e) => setInsult(e.target.value)}
                  placeholder="Твоё оскорбление..."
                  rows={4}
                  maxLength={500}
                  disabled={submitted}
                  autoFocus={!submitted}
                  className="insult-textarea w-full rounded-lg p-3 mb-3 disabled:opacity-50"
                />
                <div className="flex justify-end">
                  <button type="submit" disabled={!insult.trim() || submitted} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 rounded-lg font-bold text-sm transition-colors">
                    {submitted ? "Отправлено ✓" : "Нанести удар! ⚡"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {phase === "bracket" && myGame && (
          <div className="space-y-4">
            <div className={`rounded-xl p-6 text-center border ${iWon ? "border-green-500/30 bg-green-950/20" : "border-red-500/30 bg-red-950/20"}`}>
              <div className="text-5xl mb-2">{iWon ? "🏆" : "💀"}</div>
              <h2 className={`text-3xl font-impact ${iWon ? "text-green-400" : "text-red-400"}`}>
                {iWon ? "ПРОХОДИШЬ ДАЛЬШЕ!" : "ВЫБИТ!"}
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                {iWon ? `Твой счёт: ${myScore} vs ${oppScore}` : `Противник: ${oppScore} vs ${myScore}`}
              </p>
            </div>
            {iWon ? (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4 text-center text-slate-500 text-sm">
                Ожидай следующего раунда...
              </div>
            ) : (
              <Link href="/dashboard" className="block w-full py-3 rounded-xl bg-[#1e1e1e] hover:bg-[#2e2e2e] text-slate-300 font-bold text-center transition-colors">
                В главное меню
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
