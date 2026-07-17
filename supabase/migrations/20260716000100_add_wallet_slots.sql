alter table wallets add column if not exists wallet_slot text not null default 'human';

alter table wallets drop constraint if exists wallets_wallet_slot_check;
alter table wallets add constraint wallets_wallet_slot_check check (wallet_slot in ('human', 'agent'));

-- The old app treated wallets as history and selected the latest verified wallet.
-- Wallet slots need one current row per user/slot, so keep the latest legacy human row.
delete from wallets older
using wallets newer
where older.user_id = newer.user_id
  and older.wallet_slot = newer.wallet_slot
  and (
    older.verified_at < newer.verified_at
    or (older.verified_at = newer.verified_at and older.id < newer.id)
  );

alter table wallets drop constraint if exists wallets_user_id_address_key;

create unique index if not exists wallets_user_id_wallet_slot_key on wallets(user_id, wallet_slot);
create index if not exists wallets_user_id_slot_verified_at_idx on wallets(user_id, wallet_slot, verified_at desc);
