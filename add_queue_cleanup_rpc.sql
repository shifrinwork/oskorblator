-- Удаляет устаревшие записи в очереди матчмейкинга
-- (игроки, закрывшие сайт до того как нашли соперника)
-- Запусти в Supabase SQL Editor

create or replace function public.clean_matchmaking_queue()
returns void language plpgsql security definer as $$
begin
  -- Удаляем записи старше 30 секунд:
  -- за это время честный игрок либо нашёл соперника,
  -- либо получил ghost-бой и покинул очередь
  delete from public.matchmaking_queue
  where created_at < now() - interval '30 seconds';
end;
$$;
