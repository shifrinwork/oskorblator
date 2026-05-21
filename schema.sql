-- ============================================================
-- ОСКОРБЛЯТОР — Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  rating integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by everyone"
  on public.profiles for select using (true);

create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('bot', 'pvp', 'tournament')),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  player1_id uuid not null references public.profiles(id),
  player2_id uuid references public.profiles(id),
  player1_insult text,
  player2_insult text,
  player1_score integer,
  player2_score integer,
  winner_id uuid references public.profiles(id),
  tournament_id uuid,
  tournament_round integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.games enable row level security;

create policy "Games viewable by participants"
  on public.games for select
  using (auth.uid() = player1_id or auth.uid() = player2_id);

create policy "Leaderboard games viewable"
  on public.games for select
  using (status = 'finished');

create policy "Authenticated users create games"
  on public.games for insert
  with check (auth.uid() = player1_id);

create policy "Participants update games"
  on public.games for update
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Matchmaking queue
create table public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) unique,
  created_at timestamptz default now() not null
);

alter table public.matchmaking_queue enable row level security;

create policy "Queue: own row only"
  on public.matchmaking_queue for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Queue: read all for matchmaking"
  on public.matchmaking_queue for select
  using (true);

-- Tournaments
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'registration' check (status in ('registration', 'active', 'finished')),
  max_players integer not null default 8,
  current_round integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.tournaments enable row level security;

create policy "Tournaments viewable by everyone"
  on public.tournaments for select using (true);

create policy "Authenticated users create tournaments"
  on public.tournaments for insert
  with check (auth.uid() is not null);

create policy "Anyone can update tournament status"
  on public.tournaments for update
  using (true);

-- Tournament participants
create table public.tournament_participants (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  eliminated boolean not null default false,
  position integer,
  registered_at timestamptz default now() not null,
  primary key (tournament_id, user_id)
);

alter table public.tournament_participants enable row level security;

create policy "Tournament participants viewable by everyone"
  on public.tournament_participants for select using (true);

create policy "Users join tournaments"
  on public.tournament_participants for insert
  with check (auth.uid() = user_id);

create policy "System can update participants"
  on public.tournament_participants for update
  using (true);

-- ============================================================
-- Helper RPC functions for rating updates
-- ============================================================

create or replace function public.increment_rating(uid uuid, delta integer)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set rating = greatest(0, rating + delta)
  where id = uid;
end;
$$;

create or replace function public.increment_wins(uid uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set wins = wins + 1 where id = uid;
end;
$$;

create or replace function public.increment_losses(uid uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set losses = losses + 1 where id = uid;
end;
$$;

-- Enable realtime for key tables
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.matchmaking_queue;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_participants;

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
