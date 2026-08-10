# Base Culture Score

MVP for a Base-chain NFT social identity loop:

- X OAuth login
- Base wallet signature verification
- Backend-only NFT score calculation
- Dashboard and public leaderboard
- Chrome Manifest V3 extension that displays score on `x.com` profiles
- Optional agent wallet slot verified through the agent/ACP flow

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with X OAuth, Supabase, NFT provider, Base RPC, and collection settings. Do not use XAMPP.

Required Supabase setup:

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql) in the SQL editor, or apply the migrations in [supabase/migrations](supabase/migrations).
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.

## Wallet slots

Every X account maps to one profile with two optional wallet slots:

- `human`: the main holder wallet. Users connect, sign, and disconnect it directly from the dashboard.
- `agent`: an optional plus slot for AI agents. It is verified through the agent/ACP flow, not the browser wallet connect endpoint. The dashboard can disconnect it, but cannot connect/verify it from the web.

NFTs from both slots are merged into one combined OG score.

## Agent flow

Agents verify the agent wallet slot through the ACP CLI or console. [scripts/smoke-acp-agent-wallet.ts](scripts/smoke-acp-agent-wallet.ts) is a smoke test that:

1. resolves the agent wallet from the ACP CLI,
2. signs the same OG-Block verification message,
3. upserts the `agent` wallet row,
4. recalculates the combined score.

The agent page at `/agent-guide` is a public, crawlable instruction block for any agent. Virtual IO branding only appears in the X extension when the agent wallet holds the AgentIdentity NFT.

## Score rules

Edit [lib/config/score-rules.ts](lib/config/score-rules.ts) to change:

- Target NFT contract
- Early token threshold
- Points for project NFT, additional NFTs, rare traits, and early token IDs
- Rare trait definitions

NFT fetching is behind [lib/nft/providers.ts](lib/nft/providers.ts). `NFT_PROVIDER=mock` is useful for local UI testing. `alchemy` fetches real Base NFT holdings for a wallet. Set `TARGET_NFT_CONTRACT_ADDRESS=all` to score every NFT in the wallet, or set it to one contract address to score only that collection. `rpc` is implemented for enumerable contracts only; `simplehash` and `reservoir` can be added behind the same interface.

Scam/spam filtering:

- `NFT_EXCLUDE_SPAM=true` asks Alchemy to remove NFTs it classifies as spam.
- `NFT_REQUIRE_VERIFIED_CONTRACT=true` only scores NFT contracts with verified source code on Base through Etherscan API v2 (`chainid=8453`). This is enabled by default because wallet-wide scoring can otherwise include scam airdrops.
- `BASESCAN_API_KEY` is required when `NFT_REQUIRE_VERIFIED_CONTRACT=true`; use a BaseScan/Etherscan API v2 key. Without it, contracts are treated as unverified.
- When verified-contract filtering is enabled, verified source code takes priority over Alchemy spam flags to avoid false positives on legitimate contracts.
- `NFT_MIN_FLOOR_PRICE_ETH=0.001` only scores collections with an available floor at or above that ETH value.

Blocklist (stored in Supabase):

- Phishing and scam sources are blocked through the `nft_blocklist` table (`kind` = `contract` or `creator`, `value` = lowercase address).
- [supabase/schema.sql](supabase/schema.sql) and the migration seed the known `Fake_Phishing3515710` contract/creator.
- The provider reads `nft_blocklist` on each refresh and also blocks any creator name containing `phishing`.
- Env overrides are still supported for local testing:
  - `NFT_BLOCKLIST_CONTRACTS`: comma-separated contract addresses
  - `NFT_BLOCKLIST_CREATORS`: comma-separated creator addresses

## API

- `GET /api/me`
- `POST /api/wallet/connect` (human slot only from the dashboard)
- `POST /api/wallet/disconnect` (human or agent slot)
- `POST /api/score/refresh`
- `GET /api/profile/:handle`
- `GET /api/leaderboard`

## Extension

Load the `extension` directory in Chrome developer mode.

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension from `extension`.
4. Open extension options and set the backend URL if it is not `http://localhost:3000`.

The extension only calls `GET /api/profile/:handle` and injects public score data. It does not contain secrets or calculate scores. The badge shows the OG score, rank, and a Virtual IO pill when the agent wallet holds the AgentIdentity NFT.

## Deployment

1. Push the repo to GitHub.
2. Import into Vercel.
3. Set the same env vars in Vercel.
4. Set `NEXTAUTH_URL` and `PUBLIC_APP_URL` to the deployed URL.
5. Configure X OAuth callback for `/api/auth/callback/twitter`.

## Daily score refresh

Vercel Cron calls `GET /api/cron/refresh-scores` once per day using [vercel.json](vercel.json). The schedule is `0 18 * * *`, which runs at 01:00 WIB because Vercel cron schedules use UTC.

Set these env vars in Vercel:

- `CRON_SECRET`: long random secret used to authorize the cron endpoint.
- `CRON_REFRESH_LIMIT=50`: maximum latest verified wallets refreshed per cron run.

X profile refresh (handle/name/avatar) in the cron is **disabled** to avoid consuming X API credits. Profile data is captured on each user login via OAuth instead. The opt-in helper `lib/x-profiles.ts` remains for future use if an `X_BEARER_TOKEN` with credits is available.

## OG Card (NFT)

`/og-card` lets a logged-in user mint one **OG Card** ERC-721 per wallet on Base. The user pays gas. Metadata is generated fully on-chain (`tokenURI` returns base64 JSON); only the base image is hosted off-chain and can be swapped by the owner without redeploying.

Contract: [`contracts/OgCard.sol`](contracts/OgCard.sol) (OpenZeppelin ERC-721 + Ownable).

- `mint()` — one per wallet (`hasClaimed` guard), records `minterOf` + `mintedAt`. Reverts `SoldOut` once `MAX_SUPPLY` (1000) is reached.
- `tokenURI(id)` — on-chain JSON: name `OG Card #id`, description, image, attributes (**OG Number, Tier, Minted, Minter**).
- Tier by mint order: `#0–99` Genesis, `#100–499` Early, `#500–999` Member. Total supply capped at 1000.
- `contractURI()` — OpenSea collection metadata.
- `setImageURI(uri)` — owner-only; change the card image anytime, no redeploy.

Env vars:

- `NEXT_PUBLIC_OG_CARD_CONTRACT`: deployed contract address (fallback if not set in `app_config`).
- `NEXT_PUBLIC_OG_CARD_CHAIN_ID`: `8453` (Base mainnet) or `84532` (Base Sepolia).
- `OG_CARD_IMAGE_URI` (optional, deploy/verify only): defaults to `${PUBLIC_APP_URL}/og-card.png`.
- `DEPLOYER_PRIVATE_KEY` (deploy only): funded wallet, never commit.
- `ADMIN_X_HANDLES` (optional): comma-separated X handles allowed into `/admin`.

Card artwork lives at [`public/og-card.png`](public/og-card.png). Replace the file to change the image; if the contract is already live, also call `setImageURI` with the new URL.

The claim is also recorded in Supabase (`og_card_claims`, unique per `wallet_address`) via `POST /api/og-card/claim` for fast off-chain lookups. It stores `token_id`, `tier`, and `chain_id` so the dashboard can render the badge without an on-chain call. Apply migrations [`20260810000100_add_og_card_claims.sql`](supabase/migrations/20260810000100_add_og_card_claims.sql) and [`20260810000300_add_og_card_claim_details.sql`](supabase/migrations/20260810000300_add_og_card_claim_details.sql). The claim endpoint is rate limited (5/min per user). Mint calldata carries a Base builder attribution suffix (builder code `bc_4va9iidy`) via wagmi `dataSuffix`.

### Claim UX

- `/og-card` is login-gated, chain-aware (auto-switches to the configured chain), and supports MetaMask / OKX / Bitget / Trust via the shared `pickAvailableConnector` helper (`lib/wallet.ts`).
- On a confirmed mint a modal reveals the NFT art (same `/og-card.png` the on-chain `image` points to).
- The dashboard **Badges & Perks** section shows the claimed OG Card (art, `#tokenId`, tier, BaseScan link) and the **Badges** stat reflects the claim. Unclaimed users see a "Claim OG Card" CTA.

### Runtime config (no redeploy)

Contract address + chain can be edited at runtime from the admin portal instead of redeploying:

- `/admin` — gated to X handles listed in `ADMIN_X_HANDLES`. Admins also get an "Admin" nav link.
- Config is stored in the Supabase `app_config` table (migration [`20260810000200_add_app_config.sql`](supabase/migrations/20260810000200_add_app_config.sql)); env values act as fallback.
- `GET /api/og-card/config` (public) serves the effective contract/chain; the claim page reads it at runtime.
- `GET|POST /api/admin/config` (admin-gated, rate limited 10/min) reads/updates it.

### Scripts

```bash
npm run og-card:compile                              # compile Solidity → contracts/OgCard.json
NETWORK=testnet DEPLOYER_PRIVATE_KEY=0x... \
  npm run og-card:deploy                             # deploy (omit NETWORK for mainnet)
DEPLOYER_PRIVATE_KEY=0x... OG_CARD_CONTRACT=0x... \
  npm run og-card:smoke                              # mint + assert on-chain metadata (Base Sepolia)
NETWORK=testnet OG_CARD_CONTRACT=0x... BASESCAN_API_KEY=... \
  npm run og-card:verify                             # submit source verification to Basescan
```

Deploy flow:

1. `npm run og-card:compile`
2. Fund the deployer wallet with ETH (Sepolia faucet for testnet; real ETH for mainnet).
3. `npm run og-card:deploy` (set `NETWORK=testnet` for Base Sepolia).
4. Put the printed address in `NEXT_PUBLIC_OG_CARD_CONTRACT` (or the admin portal) and set `NEXT_PUBLIC_OG_CARD_CHAIN_ID`.
5. `npm run og-card:verify` to publish the source on Basescan.

### Current deployments

| Network | Chain ID | Contract | Notes |
|---|---|---|---|
| Base Sepolia (testnet) | 84532 | `0x6b0521252b3039f3135a229805371f68219a098f` | Live testnet build (MAX_SUPPLY 1000, imageURI → Vercel) |
| Base Mainnet | 8453 | _not deployed yet_ | Deploy + `og-card:verify` when going live |

Older testnet contracts (`0x841b…9e67`, `0xa464…f857`) are superseded and unused.

### Vercel env checklist

After deploying, set in Vercel → Settings → Environment Variables, then **redeploy** (`NEXT_PUBLIC_*` are baked at build time):

- `NEXT_PUBLIC_OG_CARD_CONTRACT`, `NEXT_PUBLIC_OG_CARD_CHAIN_ID`
- `ADMIN_X_HANDLES` (for `/admin` access)
- Verify `base:app_id` meta renders on the homepage before verifying the domain with Base.
