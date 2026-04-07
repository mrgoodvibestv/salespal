-- ============================================================
-- SalesPal — Auto-provision public.users on auth signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, domain, email_verified, credits_balance, created_at)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 2),
    new.email_confirmed_at is not null,
    10,  -- free trial credits
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
