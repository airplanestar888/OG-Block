-- Agent link codes: OTP-style one-time codes an operator generates from their
-- dashboard so an autonomous agent can register its wallet into the operator's
-- "agent" wallet slot WITHOUT a browser OAuth session.
--
-- The code resolves server-side to the operator's user_id, so an agent can only
-- ever attach to the profile that owns the code. Single-use (used_at) + expiry.
create table if not exists agent_link_codes (
  code text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists agent_link_codes_user_id_idx on agent_link_codes(user_id);
create index if not exists agent_link_codes_expires_at_idx on agent_link_codes(expires_at);

alter table agent_link_codes enable row level security;
