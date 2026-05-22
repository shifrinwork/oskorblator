-- Лидерборды по категориям и периодам
-- Запусти в Supabase SQL Editor

-- 1. Топ по суммарным играм (все время)
create or replace function public.lb_top_games(lim int default 50)
returns table(
  uid uuid, username text, avatar_url text, rating int,
  wins int, losses int, total_games bigint
) language sql security definer as $$
  select
    id, username, avatar_url, rating, wins, losses,
    (wins + losses + coalesce(bot_games, 0))::bigint as total_games
  from public.profiles
  order by (wins + losses + coalesce(bot_games, 0)) desc
  limit lim;
$$;

-- 2. Топ по рефералам (все время)
create or replace function public.lb_top_referrals(lim int default 50)
returns table(
  uid uuid, username text, avatar_url text, rating int,
  wins int, losses int, ref_count bigint
) language sql security definer as $$
  select
    p.id, p.username, p.avatar_url, p.rating, p.wins, p.losses,
    count(r.id)::bigint as ref_count
  from public.profiles p
  join public.referrals r on r.referrer_id = p.id
  group by p.id, p.username, p.avatar_url, p.rating, p.wins, p.losses
  order by ref_count desc
  limit lim;
$$;

-- 3. Топ по играм + победам за период (используется и для "По рейтингу за неделю/месяц")
create or replace function public.lb_games_since(
  since timestamptz,
  lim   int default 50
) returns table(
  uid uuid, username text, avatar_url text, rating int,
  game_count bigint, win_count bigint
) language sql security definer as $$
  select
    p.id, p.username, p.avatar_url, p.rating,
    count(g.id)::bigint                                         as game_count,
    count(g.id) filter (where g.winner_id = p.id)::bigint      as win_count
  from public.profiles p
  join public.games g
    on (g.player1_id = p.id or g.player2_id = p.id)
    and g.status = 'finished'
    and g.created_at >= since
  group by p.id, p.username, p.avatar_url, p.rating
  order by game_count desc
  limit lim;
$$;

-- 4. Топ по рефералам за период
create or replace function public.lb_referrals_since(
  since timestamptz,
  lim   int default 50
) returns table(
  uid uuid, username text, avatar_url text, rating int,
  wins int, losses int, ref_count bigint
) language sql security definer as $$
  select
    p.id, p.username, p.avatar_url, p.rating, p.wins, p.losses,
    count(r.id)::bigint as ref_count
  from public.profiles p
  join public.referrals r on r.referrer_id = p.id and r.created_at >= since
  group by p.id, p.username, p.avatar_url, p.rating, p.wins, p.losses
  order by ref_count desc
  limit lim;
$$;
