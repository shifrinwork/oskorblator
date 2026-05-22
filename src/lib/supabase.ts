"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Profile = {
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
  last_played_date: string | null;
  max_insult_score: number;
  referral_code: string;
  active_frame: string;
  created_at: string;
};

export type Game = {
  id: string;
  mode: "bot" | "pvp" | "tournament";
  status: "waiting" | "active" | "finished";
  player1_id: string;
  player2_id: string | null;
  player1_insult: string | null;
  player2_insult: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  tournament_id: string | null;
  tournament_round: number | null;
  created_at: string;
  updated_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  status: "registration" | "active" | "finished";
  max_players: number;
  current_round: number;
  created_at: string;
};
