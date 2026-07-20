create table if not exists nft_blocklist (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contract', 'creator')),
  value text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (kind, value)
);

create index if not exists nft_blocklist_kind_value_idx on nft_blocklist(kind, lower(value));

alter table nft_blocklist enable row level security;

-- Seed known phishing source from the Fake_Phishing3515710 contract.
insert into nft_blocklist (kind, value, note)
values
  ('contract', '0x27b43b897ff89a1c9999e317304e756133beb105', 'Fake_Phishing3515710 collection contract'),
  ('creator', '0x43831ccd4d1ade29e185b249c356cf5367350ce2', 'Fake_Phishing3515710 creator wallet')
on conflict (kind, value) do nothing;
