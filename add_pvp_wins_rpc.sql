-- RPC для счётчика PvP побед (используется в ачивках)
-- Запусти в Supabase SQL Editor

create or replace function public.increment_pvp_wins(uid uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set pvp_wins = coalesce(pvp_wins, 0) + 1 where id = uid;
end;
$$;
