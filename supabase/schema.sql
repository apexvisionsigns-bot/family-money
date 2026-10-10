-- FAMILY FINANCE APP : schema + roles + security
-- Supabase > SQL Editor > paste > Run

-- 1. PROFILES (role per user) ------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','member','viewer')),
  created_at timestamptz default now()
);

-- every new login gets a profile with the lowest role (viewer)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- helper: current user's role
create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- 2. ACCOUNTS ----------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- e.g. "BOC Savings" (no account numbers!)
  opening_balance numeric(14,2) not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- 3. CATEGORIES --------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('income','expense'))
);

insert into public.categories (name, kind) values
  ('Salary','income'), ('Freelance','income'), ('Other income','income'),
  ('Food','expense'), ('Transport','expense'), ('Bills','expense'),
  ('Family','expense'), ('Health','expense'), ('Savings','expense'),
  ('Other','expense');

-- 4. TRANSACTIONS ------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id),
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  tx_date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
create index on public.transactions (account_id, tx_date);
create index on public.transactions (tx_date);

-- live balance per account (updates automatically on every transaction)
create view public.account_balances with (security_invoker = true) as
select a.id, a.name, a.opening_balance,
  a.opening_balance
  + coalesce(sum(case when t.kind='income' then t.amount else -t.amount end), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- 5. EVENTS (shared schedule) ------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles(id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  note text,
  created_at timestamptz default now()
);
create index on public.events (starts_at);

-- 6. DREAMS ------------------------------------------------------
create table public.dreams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_age int,
  target_amount numeric(14,2),
  saved_amount numeric(14,2) not null default 0,
  note text,
  photo_path text,                          -- path inside storage bucket
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- 7. ROW LEVEL SECURITY ------------------------------------------
alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.events       enable row level security;
alter table public.dreams       enable row level security;

-- profiles: see yourself; admin & member see everyone; only admin edits roles
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.my_role() in ('admin','member'));
create policy "profiles admin update" on public.profiles for update
  using (public.my_role() = 'admin');

-- money tables: everyone logged in can READ (amma included)
create policy "accounts read" on public.accounts for select
  using (public.my_role() in ('admin','member','viewer'));
create policy "categories read" on public.categories for select
  using (public.my_role() in ('admin','member','viewer'));
create policy "transactions read" on public.transactions for select
  using (public.my_role() in ('admin','member','viewer'));

-- admin & member can add / edit; ONLY admin can delete
create policy "accounts write" on public.accounts for insert
  with check (public.my_role() in ('admin','member'));
create policy "accounts edit" on public.accounts for update
  using (public.my_role() in ('admin','member'));
create policy "accounts delete" on public.accounts for delete
  using (public.my_role() = 'admin');

create policy "categories write" on public.categories for insert
  with check (public.my_role() in ('admin','member'));
create policy "categories delete" on public.categories for delete
  using (public.my_role() = 'admin');

create policy "transactions write" on public.transactions for insert
  with check (public.my_role() in ('admin','member'));
create policy "transactions edit" on public.transactions for update
  using (public.my_role() in ('admin','member'));
create policy "transactions delete" on public.transactions for delete
  using (public.my_role() = 'admin');

-- schedule + dreams: admin & member only (viewer sees nothing)
create policy "events all" on public.events for all
  using (public.my_role() in ('admin','member'))
  with check (public.my_role() in ('admin','member'));
create policy "dreams all" on public.dreams for all
  using (public.my_role() in ('admin','member'))
  with check (public.my_role() in ('admin','member'));

-- 8. STORAGE for dream photos (private bucket) -------------------
insert into storage.buckets (id, name, public)
values ('dream-photos', 'dream-photos', false)
on conflict do nothing;

create policy "dream photos read" on storage.objects for select
  using (bucket_id = 'dream-photos' and public.my_role() in ('admin','member'));
create policy "dream photos upload" on storage.objects for insert
  with check (bucket_id = 'dream-photos' and public.my_role() in ('admin','member'));
create policy "dream photos delete" on storage.objects for delete
  using (bucket_id = 'dream-photos' and public.my_role() = 'admin');

-- 9. AFTER you create the 3 logins, set roles (run once, use real emails)
-- update public.profiles set role = 'admin'  where id = (select id from auth.users where email = 'YOUR_EMAIL');
-- update public.profiles set role = 'member' where id = (select id from auth.users where email = 'WIFE_EMAIL');
-- (amma stays 'viewer' by default)
