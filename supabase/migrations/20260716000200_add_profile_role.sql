alter table users add column if not exists profile_role text not null default 'human';

alter table users drop constraint if exists users_profile_role_check;
alter table users add constraint users_profile_role_check check (profile_role in ('human', 'agent'));
