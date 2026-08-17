-- Wallet verification nonce table.
-- Each nonce is single-use: created when a client requests a challenge,
-- consumed (deleted) after the signed message is verified.
create table if not exists wallet_nonces (
  nonce text primary key,
  created_at timestamptz not null default now()
);

-- Auto-expire: nonces older than 10 minutes are dead.
create index if not exists wallet_nonces_created_at_idx on wallet_nonces(created_at);
