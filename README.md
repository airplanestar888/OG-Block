# Base Culture Score

MVP for a Base-chain NFT social identity loop:

- X OAuth login
- Base wallet signature verification
- Backend-only NFT score calculation
- Dashboard and public leaderboard
- Chrome Manifest V3 extension that displays score on `x.com` profiles

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with X OAuth, Supabase, NFT provider, Base RPC, and collection settings. Do not use XAMPP.

Required Supabase setup:

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql) in the SQL editor.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.

## Score rules

Edit [lib/config/score-rules.ts](lib/config/score-rules.ts) to change:

- Target NFT contract
- Early token threshold
- Points for project NFT, additional NFTs, rare traits, and early token IDs
- Rare trait definitions

NFT fetching is behind [lib/nft/providers.ts](lib/nft/providers.ts). `NFT_PROVIDER=mock` is useful for local UI testing. `alchemy` and `rpc` are implemented; `simplehash` and `reservoir` can be added behind the same interface.

## API

- `GET /api/me`
- `POST /api/wallet/connect`
- `POST /api/score/refresh`
- `GET /api/profile/:handle`
- `GET /api/leaderboard`

## Extension

Load the `extension` directory in Chrome developer mode.

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension from `extension`.
4. Open extension options and set the backend URL if it is not `http://localhost:3000`.

The extension only calls `GET /api/profile/:handle` and injects public score data. It does not contain secrets or calculate scores.

## Deployment

1. Push the repo to GitHub.
2. Import into Vercel.
3. Set the same env vars in Vercel.
4. Set `NEXTAUTH_URL` and `PUBLIC_APP_URL` to the deployed URL.
5. Configure X OAuth callback for `/api/auth/callback/twitter`.
