-- App config: key/value store for runtime-editable settings (e.g. OG Card contract).
-- Editable from the admin portal without redeploying.
create table if not exists app_config (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table app_config enable row level security;
