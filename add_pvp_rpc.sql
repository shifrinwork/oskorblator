-- Атомарно создаёт игру и удаляет обоих игроков из очереди.
-- Security definer = выполняется от имени владельца БД,
-- обходя RLS (иначе игрок не может удалить чужую запись из очереди).
create or replace function public.create_pvp_match(p1_id uuid, p2_id uuid)
returns uuid language plpgsql security definer as $$
declare
  new_game_id uuid;
begin
  -- Создаём игру
  insert into public.games (mode, status, player1_id, player2_id)
  values ('pvp', 'active', p1_id, p2_id)
  returning id into new_game_id;

  -- Удаляем обоих из очереди
  delete from public.matchmaking_queue
  where user_id in (p1_id, p2_id);

  return new_game_id;
end;
$$;
