-- Avatar self-heal cursor: marks when each user's avatar URL was last
-- verified alive, so the cron only re-checks stale rows (1 batch/run).
alter table users add column if not exists avatar_checked_at timestamptz;
create index if not exists users_avatar_checked_at_idx on users(avatar_checked_at);
