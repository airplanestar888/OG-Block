# Base Culture Score (OG-Block)

Production web application and culture score network on Base:

- **X (Twitter) OAuth 2.0** login and profile identity
- **Multi-Chain Verified NFT Holdings**: Calculates combined culture score across **Base Chain**, **Ethereum Mainnet (ETH)**, and **Robinhood Chain**
- **Base Wallet Signature Verification**: One-click wallet connect & cryptographic message signing
- **Secure Server Gateway & Image Proxy**: Private Supabase Storage assets streamed via `/api/og-card/image` without leaking bucket credentials or URLs
- **ERC-721 On-Chain Metadata API**: OpenSea & EVM-compliant `/api/nft/metadata/:tokenId` endpoint with dynamic traits
- **Live Leaderboard with Score History**: 5-column symmetric ranking board, compact number formatting (`K`/`M`), and points delta (`▲ +X pts`)
- **Global Network Guard**: Instant wrong-network notification and 1-click automatic switch to Base
- **Chrome Manifest V3 Extension**: Injects live culture score badge directly onto `x.com` profiles
- **AI Agent Slot**: Crawlable `/agent-guide` and verified agent wallet slot via ACP CLI flow

---

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run tests & typecheck:
```bash
npm run typecheck    # TypeScript verification (0 errors)
npm run smoke-test   # 15/15 automated assertion suite
```

### Required Supabase Setup:

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the **SQL Editor**, or apply the migrations in [`supabase/migrations`](supabase/migrations).
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel.

---

## Multi-Chain Culture Score

Culture scores are calculated on the backend across verified holdings on:
1. **Base Mainnet** (`Chain ID: 8453`)
2. **Ethereum Mainnet (ETH)** (`Chain ID: 1`)
3. **Robinhood Chain**

Scam & spam filtering:
- `NFT_EXCLUDE_SPAM=true`: Alchemy removes classified spam collections.
- `NFT_REQUIRE_VERIFIED_CONTRACT=true`: Only scores contracts with verified source code via Etherscan / BaseScan API v2 (`chainid=8453`).
- `NFT_MIN_FLOOR_PRICE_ETH=0.001`: Minimum floor threshold.
- `nft_blocklist` table in Supabase: Blocks known scam/phishing contracts and creators.

---

## Wallet Slots

Every X account maps to one profile with two optional wallet slots:

- `human`: The main holder wallet. Connected, signed, and managed directly from the dashboard.
- `agent`: An optional plus slot for AI agents. Verified through the agent/ACP flow, not browser connect.

NFTs from both slots are aggregated into one combined culture score and tracked in the `score_history` table.

---

## Secure Image Gateway & Supabase Storage

Images can be hosted in **Supabase Storage** (Private or Public buckets) and configured dynamically at runtime:

- **Homepage NFT Hero Grid**: `og_nft_image_url`
- **OG Card Artwork**: `og_card_image_url`

### Security (Anti-Leak & Proxy):
- External clients, wallets, and inspect elements only see `https://og-block.vercel.app/api/og-card/image`.
- The server backend reads the image directly from Supabase Storage using the administrator `SUPABASE_SERVICE_ROLE_KEY` and streams the binary image directly.
- Bucket names, tokens, and storage paths are never leaked to the browser.

---

## OG Card (ERC-721 on Base)

`/og-card` allows users to mint their official soulbound-style **OG Card** ERC-721 on Base:

- Contract: [`contracts/OgCard.sol`](contracts/OgCard.sol) (OpenZeppelin ERC-721 + Ownable).
- Supply cap: 1000 OG Cards (`#0–99` Genesis, `#100–499` Early, `#500–999` Member).
- Attributed minting: Includes Base builder attribution (`bc_4va9iidy`) via wagmi `dataSuffix`.
- On-chain metadata: `/api/nft/metadata/:tokenId` serves live attributes (Holder, Culture Score, Rank, Tier, Date).

### Smart Contract CLI Scripts:

```bash
npm run og-card:compile                              # compile Solidity → contracts/OgCard.json
NETWORK=testnet DEPLOYER_PRIVATE_KEY=0x... \
  npm run og-card:deploy                             # deploy (omit NETWORK for mainnet)
DEPLOYER_PRIVATE_KEY=0x... OG_CARD_CONTRACT=0x... \
  npm run og-card:smoke                              # mint + assert on-chain metadata (Base Sepolia)
NETWORK=testnet OG_CARD_CONTRACT=0x... BASESCAN_API_KEY=... \
  npm run og-card:verify                             # submit source verification to Basescan
```

---

## API Endpoints

- `GET /api/me` — Current authenticated user profile
- `POST /api/wallet/connect` — Human slot verification (signature validation)
- `POST /api/wallet/disconnect` — Disconnect wallet slot
- `POST /api/score/refresh` — Trigger score recalculation across Base, ETH & Robinhood
- `GET /api/profile/:handle` — Public profile & score lookup (used by X extension)
- `GET /api/leaderboard` — Full ranked culture board
- `GET /api/leaderboard/history` — Delta and history entries
- `GET /api/og-card/config` — Public runtime contract & image URLs
- `GET /api/og-card/image` — Secure server-side image proxy
- `GET /api/nft/metadata/:tokenId` — ERC-721 OpenSea compliant metadata
- `GET|POST /api/admin/config` — Admin runtime settings (contract, chain, Supabase images)
- `GET /api/cron/refresh-scores` — Daily automated score refresh

---

## Chrome Extension

Load the `extension` folder in Chrome:
1. Navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension` directory.
4. Set backend URL in extension options (defaults to `https://og-block.vercel.app`).
