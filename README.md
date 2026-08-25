# OG BLOCK

Turn your Base NFT holdings into a public culture score. Connect your X account and wallet, and OG BLOCK scans your NFTs to calculate a score and rank.

## How the OG Score is calculated

Your score is the sum of the points below, based on the NFTs held in your verified wallet(s):

| Rule | Points |
| --- | --- |
| Holding at least one NFT | **100** (once) |
| Each additional NFT after the first | **+25** each |
| NFT with a rare trait | **+50** per NFT |
| Early token (token ID below 500) | **+75** per NFT |

**Rare traits** (any one of these on an NFT counts):
- `Background: Based Blue`
- `Status: OG`
- `Edition: Genesis`

### Example

A wallet holding 3 NFTs, where 1 has a rare trait and 2 are early tokens (ID < 500):

```
100                 (holds an NFT)
+ 25 × 2 = 50       (2 additional NFTs)
+ 50 × 1 = 50       (1 rare trait)
+ 75 × 2 = 150      (2 early tokens)
─────────────────
= 350 points
```

Both a main wallet and an optional agent wallet accumulate into the same score. Rank is your position on the public leaderboard, highest score first.

## Agent wallets

One X profile in OG BLOCK has two wallet slots:

- **Main wallet** — your personal holder wallet.
- **Agent wallet** — an optional wallet owned by an autonomous agent, verified as a separate slot on the same profile.

NFTs held in **either** wallet accumulate into one combined culture score, so an agent's on-chain activity is tracked and counted alongside its operator's. Each slot is verified independently by signing from that specific wallet — the agent signs with its own key, never the user's.

### Registering an agent wallet (one-time code, no OAuth)

An autonomous agent does not need to log in through a browser. Instead:

1. The operator opens the **Agent Wallet** panel on their dashboard and taps **Connect agent** to generate a one-time code (`OGB-XXXX-XXXX`, single-use, expires in 15 minutes).
2. The operator hands the code to their agent.
3. The agent signs an exact challenge with its **own** wallet:
   ```
   OG BLOCK agent link
   Code: <CODE>
   Agent wallet: <AGENT_ADDRESS>
   Timestamp: <ISO_8601>
   ```
4. The agent POSTs to `/api/agent/link`:
   ```json
   { "code": "<CODE>", "address": "<AGENT_ADDRESS>", "chainId": 8453, "message": "<SIGNED_MESSAGE>", "signature": "<0x...>" }
   ```
5. The server resolves the code to the operator's profile, verifies the signature, links the wallet into the agent slot, and refreshes the combined OG Score.

Security: the code (not any typed handle) resolves the target profile server-side, so an agent can only ever attach to the profile that issued the code. The signature proves the agent controls the wallet, and one wallet can only be an agent for a single profile.

### AgentIdentity

Agent wallets are recognized on-chain through an **AgentIdentity** NFT (contract `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432` on Base). When an agent wallet holds this token, its profile is flagged as agent-verified and the identity token id is surfaced on the public profile.

## Virtual Protocol (Economy OS)

OG BLOCK is built to connect with **Virtual Protocol's Economy OS / ACP (Agent Commerce Protocol)** so that agent wallets are first-class, trackable participants — not just human holders. An agent operating under Virtual Protocol can:

1. Get a one-time link code from its operator's dashboard.
2. Register its own agent wallet into the operator's profile by signing with its own key (no browser login).
3. Have its NFT holdings counted in the combined OG Score and ranked publicly.
4. Mint the OG badge from the agent wallet on Base when eligible.

**Support so far:** Virtual Protocol is the currently supported agent framework. Its ACP agent wallets are tracked through the AgentIdentity flow above. Support for additional agent frameworks can be added over time.

## OG Card contract

The OG Card badge is an ERC-721 on **Base mainnet** at `0x841b99c7957107a633b8b063498b142f7c6d9e67` (verified source on BaseScan). One card per wallet, 1000 max supply, tier by mint order (Genesis / Early / Member), with a fixed on-chain image URI.


