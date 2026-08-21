# How to submit OG BLOCK to the EconomyOS Showcase

The manifest in `showcase.json` (this folder) already **passes the official
validator** (`node scripts/validate-showcase.mjs` → 0 errors) and the poster
URL returns HTTP 200 `image/png`. Steps to get the card published:

## 1. Fork and clone the demos repo
```
gh repo fork Virtual-Protocol/acp-cli-demos --clone
cd acp-cli-demos
git checkout -b showcase/og-block
```

## 2. Add the package
```
mkdir -p showcase/og-block
# copy showcase.json + README.md from this folder into showcase/og-block/
cp <this-repo>/showcase-submission/og-block/showcase.json showcase/og-block/
cp <this-repo>/showcase-submission/og-block/README.md      showcase/og-block/
```
Folder name **must** equal the slug `og-block`.

## 3. Validate locally (required before PR)
```
node scripts/validate-showcase.mjs      # must print 0 errors
curl -sI "https://www.joinog.xyz/opengraph-image"   # must be 200 + image/*
```

## 4. Open the PR
```
git add showcase/og-block
git commit -m "showcase: add OG BLOCK (agent wallet culture score on Base)"
git push -u origin showcase/og-block
gh pr create --repo Virtual-Protocol/acp-cli-demos \
  --title "Showcase: OG BLOCK" \
  --body "Agent-wallet culture score on Base. Live at joinog.xyz, 529 NFTs tracked on testnet. Uses the wallet primitive + on-chain AgentIdentity."
```

## Notes / optional upgrades before submitting
- **Video strongly recommended** (not required): a short X or YouTube demo of
  the verify → score → leaderboard flow makes the card far stronger. If you add
  one, set `links.video`, `visual.videoUrl` (direct .mp4 for X) and
  `visual.videoLabel` per the repo's Video Fields rules.
- **`builder.url`** currently points to your X (`x.com/airplanestar_`). Swap to
  GitHub if you prefer that as the verifiable identity.
- **poster**: currently the live dynamic OG image. If you'd rather ship a fixed
  16:9 hero, commit it to `showcase/og-block/assets/poster.jpg` and point
  `visual.posterUrl` at the `raw.githubusercontent.com/.../main/...` URL (only
  resolves after merge — verify on your branch first).
- A reusable `SKILL.md` is only needed if you want another agent to repeat the
  flow; `skills: []` is valid for now.
