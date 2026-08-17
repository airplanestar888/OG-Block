-- One OG Card claim per user (prevents multi-row claims that break maybeSingle).
alter table og_card_claims add constraint og_card_claims_user_id_key unique (user_id);
