-- OG Card claim details: store token id, tier, and chain so the dashboard
-- can render the badge without an on-chain lookup.
alter table og_card_claims add column if not exists token_id text;
alter table og_card_claims add column if not exists tier text;
alter table og_card_claims add column if not exists chain_id integer;
