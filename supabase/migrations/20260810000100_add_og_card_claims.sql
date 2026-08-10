-- OG Card claims: one per wallet address
create table if not exists og_card_claims (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  wallet_address text not null,
  claimed_at    timestamptz not null default now(),
  unique (wallet_address)
);

-- fast lookups by user
create index if not exists og_card_claims_user_id_idx on og_card_claims (user_id);
