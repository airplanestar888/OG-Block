create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  x_user_id text not null unique,
  x_handle text not null unique,
  x_name text,
  x_avatar text,
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  address text not null,
  chain_id integer not null,
  verified_at timestamptz not null default now(),
  unique (user_id, address)
);

create index if not exists wallets_user_id_verified_at_idx on wallets(user_id, verified_at desc);
create index if not exists wallets_address_idx on wallets(lower(address));

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  score integer not null default 0,
  rank integer,
  is_og boolean not null default false,
  nft_count integer not null default 0,
  last_calculated_at timestamptz
);

create index if not exists scores_score_idx on scores(score desc, rank asc);

create table if not exists nft_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  contract_address text not null,
  token_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, contract_address, token_id)
);

create index if not exists nft_holdings_user_id_idx on nft_holdings(user_id);

create table if not exists og_allowlist (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  note text
);

create index if not exists og_allowlist_wallet_address_idx on og_allowlist(lower(wallet_address));

alter table users enable row level security;
alter table wallets enable row level security;
alter table scores enable row level security;
alter table nft_holdings enable row level security;
alter table og_allowlist enable row level security;

-- The app uses SUPABASE_SERVICE_ROLE_KEY on trusted Next.js API routes.
-- Keep public anon access locked down unless you later add explicit client-side policies.
