# OG BLOCK — EconomyOS Showcase submission

This folder is the submission package for the EconomyOS Community Showcase.
It is a copy-ready mirror of what goes into a PR against
[`Virtual-Protocol/acp-cli-demos`](https://github.com/Virtual-Protocol/acp-cli-demos).

## What OG BLOCK is

OG BLOCK turns real NFT holdings on Base into a public **culture score** and
leaderboard — instead of ranking people by followers or engagement. A profile
has two wallet slots:

- **Human wallet** — the operator's personal holder wallet.
- **Agent wallet** — an autonomous agent's wallet, verified as its own slot.

NFTs held in **either** wallet accumulate into one combined score. Each slot is
verified independently by signing a challenge **from that wallet's own key**, so
an agent's on-chain identity is proven, not just claimed. Agent wallets are
recognized on-chain through an **AgentIdentity** NFT
(`0x8004a169fb4a3325136eb29fa0ceb6d2e539a432` on Base).

**EconomyOS primitive used:** `wallet` (Agent Wallet). Designed to extend into
the ACP flow next.

## Live proof

- App: https://www.joinog.xyz
- Leaderboard (live scores): https://www.joinog.xyz/leaderboard
- Example verified profile: https://www.joinog.xyz/u/airplanestar_
- Public profile API (JSON): https://www.joinog.xyz/api/profile/airplanestar_
- Source: https://github.com/airplanestar888/OG-Block

Testnet status: 11 profiles onboarded, 529 NFTs tracked, top score 22.7K.

## Scoring model

`100` for holding ≥1 NFT, `+25` per additional NFT, `+50` per NFT with a rare
trait, `+75` per early token (id < 500). Combined across both wallet slots.
