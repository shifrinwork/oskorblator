-- Возвращает email пользователя по его нику.
-- Нужно для входа по нику (клиент получает email → логинится стандартно).
-- Security definer — имеет доступ к auth.users.
create or replace function public.get_email_by_username(uname text)
returns text language plpgsql security definer as $$
declare
  user_email text;
begin
  select u.email into user_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = uname
  limit 1;
  return user_email;
end;
$$;
