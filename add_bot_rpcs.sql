-- RPC-функции для подсчёта игр и побед против бота
-- Выполни этот файл в Supabase SQL Editor

create or replace function public.increment_bot_games(uid uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set bot_games = coalesce(bot_games, 0) + 1 where id = uid;
end;
$$;

create or replace function public.increment_bot_wins(uid uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set bot_wins = coalesce(bot_wins, 0) + 1 where id = uid;
end;
$$;
