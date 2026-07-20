create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  x_user_id text not null unique,
  x_handle text not null unique,
  x_name text,
  x_avatar text,
  profile_role text not null default 'human' check (profile_role in ('human', 'agent')),
  created_at timestamptz not null default now()
);

alter table users add column if not exists profile_role text not null default 'human';
alter table users drop constraint if exists users_profile_role_check;
alter table users add constraint users_profile_role_check check (profile_role in ('human', 'agent'));

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  address text not null,
  chain_id integer not null,
  wallet_slot text not null default 'human' check (wallet_slot in ('human', 'agent')),
  verified_at timestamptz not null default now(),
  unique (user_id, wallet_slot)
);

alter table wallets add column if not exists wallet_slot text not null default 'human';
alter table wallets drop constraint if exists wallets_wallet_slot_check;
alter table wallets add constraint wallets_wallet_slot_check check (wallet_slot in ('human', 'agent'));
alter table wallets drop constraint if exists wallets_user_id_address_key;
create unique index if not exists wallets_user_id_wallet_slot_key on wallets(user_id, wallet_slot);

create index if not exists wallets_user_id_verified_at_idx on wallets(user_id, verified_at desc);
create index if not exists wallets_user_id_slot_verified_at_idx on wallets(user_id, wallet_slot, verified_at desc);
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

create table if not exists nft_blocklist (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contract', 'creator')),
  value text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (kind, value)
);

create index if not exists nft_blocklist_kind_value_idx on nft_blocklist(kind, lower(value));

alter table users enable row level security;
alter table wallets enable row level security;
alter table scores enable row level security;
alter table nft_holdings enable row level security;
alter table og_allowlist enable row level security;
alter table nft_blocklist enable row level security;

-- The app uses SUPABASE_SERVICE_ROLE_KEY on trusted Next.js API routes.
-- Keep public anon access locked down unless you later add explicit client-side policies.
