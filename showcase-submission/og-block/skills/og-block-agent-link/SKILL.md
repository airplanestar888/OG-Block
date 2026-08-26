# OG BLOCK Agent Link — Register Your Wallet & Track Your Culture Score

## When to Use

- An operator hands you a one-time code (`OGB-XXXX-XXXX`) to join their OG BLOCK profile as its **agent wallet**
- You need your on-chain NFT holdings counted into an OG BLOCK combined culture score
- You need to read back a profile's public culture score, rank, or NFT breakdown after linking

## When NOT to Use

- The code was issued more than 15 minutes ago, or it already completed a link (request a fresh one)
- Someone asks you to sign with the *operator's personal wallet* — never do this; only your own agent wallet key
- You cannot control which key signs (e.g. a smart account whose internal operator key you cannot identify) — see Troubleshooting

## Required Inputs

- **ACP CLI** installed and configured (`acp configure`)
- **Active ACP agent** on **Base mainnet (chainId 8453)** with its own wallet:
  ```bash
  acp agent use --agent-id <AGENT_ID>
  acp wallet address   # this exact address is what you will register
  ```
- **One-time code** from the profile owner (`OGB-XXXX-XXXX`, single-use, expires 15 minutes; a new code invalidates any previous unused one)

## Critical Rule

The signature must **recover (plain ECDSA ecrecover) to exactly the address you submit**.
If your setup is a smart account signed by an internal operator key, submit **that signer EOA
address** instead of the account address — in both the challenge line and the payload.

## Step-by-Step Workflow

### Step 1: Confirm Your Wallet

```bash
acp agent use --agent-id <AGENT_ID>
acp wallet address
```

Record this address — it must appear identically in the challenge line and the payload below.

### Step 2: Sign the Exact Challenge

Build the message with the CURRENT UTC time (±5 minutes of server time), replacing placeholders:

```text
OG BLOCK agent link
Code: <CODE>
Agent wallet: <YOUR_ADDRESS>
Timestamp: <ISO_8601_UTC_NOW>
```

Sign it (EIP-191 `personal_sign`, UTF-8, every line kept intact):

```bash
acp wallet sign-message --chain-id 8453 --message "<THE_EXACT_MULTILINE_TEXT>"
```

Capture `signature` from the output.

### Step 3: POST the Registration

```bash
curl -X POST https://joinog.xyz/api/agent/link \
  -H "Content-Type: application/json" \
  -d '{
    "code": "<CODE>",
    "address": "<YOUR_ADDRESS>",
    "chainId": 8453,
    "message": "<THE_EXACT_MULTILINE_TEXT>",
    "signature": "<0x_SIGNATURE>"
  }'
```

Success response:

```json
{ "ok": true, "handle": "<operator_handle>", "agentWallet": "<YOUR_ADDRESS>", "score": 1234 }
```

`score` is the freshly recalculated combined OG Score across the operator's human + agent slots.

### Step 4: Read Back the Public Result (Optional)

```bash
curl https://joinog.xyz/api/profile/<operator_handle>
```

Returns score, rank, NFT counts, and verified/unverified breakdown for the profile.

## Error Handling

| Error | Cause | Fix |
| --- | --- | --- |
| `Signature could not be verified` | Signature recovers to a different address than submitted | Submit the signer EOA address instead (see Critical Rule) |
| `Invalid, used, or expired code` | Code consumed, expired, or superseded | Ask the operator for a fresh code |
| `Signature expired or has an invalid timestamp` | Clock drift beyond ±5 minutes | Regenerate the Timestamp, re-sign |
| `Signed message does not match the required challenge` | Lines differ from the template | Keep each line exact; address string must be identical in message and payload |
| `This wallet is already registered as an agent for another profile` | One wallet = one profile | Use another agent wallet |

A **failed attempt does not consume the code** — fix the cause and retry within the 15-minute expiry.

## Verification Notes

- Only NFTs held on **BaseScan-verified contracts** count toward the score; spam and unverified contracts are excluded automatically.
- After linking, the combined score is recalculated across both wallet slots and published live at `https://joinog.xyz/leaderboard`.
