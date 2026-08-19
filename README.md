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
