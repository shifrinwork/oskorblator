-- Лидерборды по винрейту
-- Запусти в Supabase SQL Editor

-- Топ по винрейту: все время (минимум 5 игр)
create or replace function public.lb_winrate_all(lim int default 50)
returns table(
  uid uuid, username text, avatar_url text, rating int,
  wins int, losses int, winrate float
) language sql security definer as $$
  select
    id, username, avatar_url, rating, wins, losses,
    round(wins::numeric * 100.0 / (wins + losses), 1)::float as winrate
  from public.profiles
  where wins + losses >= 5
  order by wins::numeric / (wins + losses) desc,
           (wins + losses) desc
  limit lim;
$$;

-- Топ по винрейту за период (минимум 3 игры)
create or replace function public.lb_winrate_since(
  since timestamptz,
  lim   int default 50
) returns table(
  uid uuid, username text, avatar_url text, rating int,
  game_count bigint, win_count bigint, winrate float
) language sql security definer as $$
  select
    p.id, p.username, p.avatar_url, p.rating,
    count(g.id)::bigint                                         as game_count,
    count(g.id) filter (where g.winner_id = p.id)::bigint      as win_count,
    round(
      count(g.id) filter (where g.winner_id = p.id)::numeric
        * 100.0 / nullif(count(g.id), 0),
      1
    )::float as winrate
  from public.profiles p
  join public.games g
    on (g.player1_id = p.id or g.player2_id = p.id)
    and g.status = 'finished'
    and g.created_at >= since
  group by p.id, p.username, p.avatar_url, p.rating
  having count(g.id) >= 3
  order by
    count(g.id) filter (where g.winner_id = p.id)::numeric
      / nullif(count(g.id), 0) desc,
    count(g.id) desc
  limit lim;
$$;
