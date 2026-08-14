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

alter table score_history enable row level security;
