-- Persistent rate limit counter table (works across serverless instances).
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_key_created_at_idx on rate_limits(key, created_at desc);

alter table rate_limits enable row level security;
