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
