-- Registry of every NFT contract seen across all verified wallets.
-- Contracts are evaluated ONCE (spam from Alchemy, verified from BaseScan),
-- then reused for every wallet that holds them — no per-wallet re-lookup.
create table if not exists nft_contracts (
  contract_address    text primary key,           -- lowercase EVM address
  chain_id            integer not null default 8453,
  name                text,
  symbol              text,
  token_type          text,                        -- ERC721 | ERC1155 | UNKNOWN
  deployer_address    text,                        -- from Alchemy contractDeployer
  -- evaluation
  is_spam             boolean,                     -- from Alchemy spamInfo
  spam_classifications text[],
  is_verified         boolean,                     -- from BaseScan source check
  -- status: pending = seen but not yet evaluated
  --         ok      = evaluated successfully
  --         failed  = evaluation errored (retry on next snapshot)
  status              text not null default 'pending'
                        check (status in ('pending', 'ok', 'failed')),
  eval_error          text,
  evaluated_at        timestamptz,
  first_seen_at       timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists nft_contracts_status_idx on nft_contracts(status);
create index if not exists nft_contracts_deployer_idx on nft_contracts(lower(deployer_address));
