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
alter table users add column if not exists avatar_checked_at timestamptz;
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

create table if not exists og_card_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  wallet_address text not null,
  claimed_at timestamptz not null default now(),
  unique (wallet_address),
  unique (user_id)
);

create index if not exists og_card_claims_user_id_idx on og_card_claims (user_id);

create table if not exists app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  old_score integer not null default 0,
  new_score integer not null default 0,
  points_delta integer not null default 0,
  old_nft_count integer not null default 0,
  new_nft_count integer not null default 0,
  nft_delta integer not null default 0,
  old_rank integer,
  new_rank integer,
  event_type text not null default 'score_updated' check (event_type in ('initial_score', 'nft_added', 'nft_removed', 'score_updated', 'wallet_connected', 'wallet_disconnected')),
  reason text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists score_history_user_id_created_at_idx on score_history(user_id, created_at desc);
create index if not exists score_history_created_at_idx on score_history(created_at desc);
create index if not exists score_history_points_delta_idx on score_history(points_delta);

-- Wallet verification nonce table (single-use, auto-expiring).
create table if not exists wallet_nonces (
  nonce text primary key,
  created_at timestamptz not null default now()
);
create index if not exists wallet_nonces_created_at_idx on wallet_nonces(created_at);

-- Persistent rate limit counter (works across serverless instances).
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_key_created_at_idx on rate_limits(key, created_at desc);

-- Agent link codes: OTP-style one-time codes for autonomous agent registration
-- into an operator's agent wallet slot (no browser OAuth).
create table if not exists agent_link_codes (
  code text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists agent_link_codes_user_id_idx on agent_link_codes(user_id);
create index if not exists agent_link_codes_expires_at_idx on agent_link_codes(expires_at);

alter table users enable row level security;
alter table wallets enable row level security;
alter table scores enable row level security;
alter table nft_holdings enable row level security;
alter table og_allowlist enable row level security;
alter table wallet_nonces enable row level security;
alter table rate_limits enable row level security;
alter table nft_blocklist enable row level security;
alter table og_card_claims enable row level security;
alter table app_config enable row level security;
alter table score_history enable row level security;
alter table agent_link_codes enable row level security;

-- The app uses SUPABASE_SERVICE_ROLE_KEY on trusted Next.js API routes.
-- Keep public anon access locked down unless you later add explicit client-side policies.
