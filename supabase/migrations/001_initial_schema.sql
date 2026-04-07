-- ============================================================
-- SalesPal — Initial Schema
-- Good Vibes AI · v1.0
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type campaign_status as enum (
  'draft',
  'extracting_icp',
  'angle_selected',
  'fetching_companies',
  'preview_ready',
  'active',
  'exported',
  'archived'
);

create type contact_tier as enum (
  'decision_maker',
  'influencer',
  'noise'
);

create type outreach_channel as enum (
  'email',
  'linkedin',
  'call'
);

create type export_type as enum (
  'csv',
  'pdf'
);

create type credit_action as enum (
  'trial_grant',
  'pack_purchase',
  'company_fetch',
  'contact_unlock',
  'outreach_generation',
  'refund'
);

-- ============================================================
-- TABLES
-- ============================================================

-- users
-- Extends Supabase auth.users. One row per verified business account.
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  domain          text not null,
  email_verified  boolean not null default false,
  credits_balance integer not null default 0 check (credits_balance >= 0),
  created_at      timestamptz not null default now()
);

-- campaigns
create table public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  name            text not null,
  status          campaign_status not null default 'draft',
  icp_json        jsonb,
  angle_selected  text,
  stats_result    jsonb,
  created_at      timestamptz not null default now()
);

-- companies
create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  business_id     text not null,              -- Explorium business ID
  name            text not null,
  domain          text,
  qualified       boolean not null default false,
  credits_charged integer not null default 0,
  created_at      timestamptz not null default now()
);

-- leads
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  prospect_id     text not null,              -- Explorium prospect ID
  full_name       text not null,
  job_title       text,
  linkedin_url    text,
  email           text,                       -- null until unlocked
  phone           text,                       -- null until unlocked
  tier            contact_tier not null default 'influencer',
  unlocked        boolean not null default false,
  credits_charged integer not null default 0,
  created_at      timestamptz not null default now()
);

-- outreach_sequences
create table public.outreach_sequences (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  channel         outreach_channel not null,
  touch_num       smallint not null check (touch_num >= 1),
  subject         text,                       -- email only
  body            text not null,
  credits_charged integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (lead_id, channel, touch_num)
);

-- credit_transactions
create table public.credit_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  action          credit_action not null,
  credits_delta   integer not null,           -- positive = add, negative = spend
  explorium_cost  numeric(10, 4) default 0,   -- our actual cost in USD
  reference_id    uuid,                       -- optional: campaign/lead/company id
  created_at      timestamptz not null default now()
);

-- exports
create table public.exports (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  type            export_type not null default 'csv',
  file_url        text not null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- campaigns
create index idx_campaigns_user_id        on public.campaigns(user_id);
create index idx_campaigns_status         on public.campaigns(status);
create index idx_campaigns_created_at     on public.campaigns(created_at desc);

-- companies
create index idx_companies_campaign_id    on public.companies(campaign_id);
create index idx_companies_business_id    on public.companies(business_id);
create index idx_companies_qualified      on public.companies(qualified);

-- leads
create index idx_leads_campaign_id        on public.leads(campaign_id);
create index idx_leads_company_id         on public.leads(company_id);
create index idx_leads_tier               on public.leads(tier);
create index idx_leads_unlocked           on public.leads(unlocked);
create index idx_leads_prospect_id        on public.leads(prospect_id);

-- outreach_sequences
create index idx_outreach_lead_id         on public.outreach_sequences(lead_id);
create index idx_outreach_channel         on public.outreach_sequences(channel);

-- credit_transactions
create index idx_credit_tx_user_id        on public.credit_transactions(user_id);
create index idx_credit_tx_action         on public.credit_transactions(action);
create index idx_credit_tx_created_at     on public.credit_transactions(created_at desc);

-- exports
create index idx_exports_campaign_id      on public.exports(campaign_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users               enable row level security;
alter table public.campaigns           enable row level security;
alter table public.companies           enable row level security;
alter table public.leads               enable row level security;
alter table public.outreach_sequences  enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.exports             enable row level security;

-- ---------- users ----------

create policy "users: select own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users: insert own row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users: update own row"
  on public.users for update
  using (auth.uid() = id);

-- ---------- campaigns ----------

create policy "campaigns: select own"
  on public.campaigns for select
  using (auth.uid() = user_id);

create policy "campaigns: insert own"
  on public.campaigns for insert
  with check (auth.uid() = user_id);

create policy "campaigns: update own"
  on public.campaigns for update
  using (auth.uid() = user_id);

create policy "campaigns: delete own"
  on public.campaigns for delete
  using (auth.uid() = user_id);

-- ---------- companies ----------

create policy "companies: select via campaign"
  on public.companies for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "companies: insert via campaign"
  on public.companies for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "companies: update via campaign"
  on public.companies for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "companies: delete via campaign"
  on public.companies for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

-- ---------- leads ----------

create policy "leads: select via campaign"
  on public.leads for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "leads: insert via campaign"
  on public.leads for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "leads: update via campaign"
  on public.leads for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "leads: delete via campaign"
  on public.leads for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

-- ---------- outreach_sequences ----------

create policy "outreach: select via lead"
  on public.outreach_sequences for select
  using (
    exists (
      select 1 from public.leads l
      join public.campaigns c on c.id = l.campaign_id
      where l.id = lead_id and c.user_id = auth.uid()
    )
  );

create policy "outreach: insert via lead"
  on public.outreach_sequences for insert
  with check (
    exists (
      select 1 from public.leads l
      join public.campaigns c on c.id = l.campaign_id
      where l.id = lead_id and c.user_id = auth.uid()
    )
  );

create policy "outreach: update via lead"
  on public.outreach_sequences for update
  using (
    exists (
      select 1 from public.leads l
      join public.campaigns c on c.id = l.campaign_id
      where l.id = lead_id and c.user_id = auth.uid()
    )
  );

create policy "outreach: delete via lead"
  on public.outreach_sequences for delete
  using (
    exists (
      select 1 from public.leads l
      join public.campaigns c on c.id = l.campaign_id
      where l.id = lead_id and c.user_id = auth.uid()
    )
  );

-- ---------- credit_transactions ----------

create policy "credit_transactions: select own"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- Inserts only via service role (server-side), never from client
-- No insert/update/delete policies for authenticated users

-- ---------- exports ----------

create policy "exports: select via campaign"
  on public.exports for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

create policy "exports: insert via campaign"
  on public.exports for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER FUNCTION: deduct credits (runs as security definer)
-- Called server-side via service role. Validates balance before
-- deducting to enforce the credits_balance >= 0 constraint.
-- ============================================================

create or replace function public.deduct_credits(
  p_user_id       uuid,
  p_amount        integer,
  p_action        credit_action,
  p_explorium_cost numeric default 0,
  p_reference_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set credits_balance = credits_balance - p_amount
  where id = p_user_id
    and credits_balance >= p_amount;

  if not found then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_transactions
    (user_id, action, credits_delta, explorium_cost, reference_id)
  values
    (p_user_id, p_action, -p_amount, p_explorium_cost, p_reference_id);
end;
$$;

-- ============================================================
-- HELPER FUNCTION: add credits (pack purchase or trial grant)
-- ============================================================

create or replace function public.add_credits(
  p_user_id      uuid,
  p_amount       integer,
  p_action       credit_action,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set credits_balance = credits_balance + p_amount
  where id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;

  insert into public.credit_transactions
    (user_id, action, credits_delta, reference_id)
  values
    (p_user_id, p_action, p_amount, p_reference_id);
end;
$$;
