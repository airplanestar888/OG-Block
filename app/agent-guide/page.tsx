const agentSteps = [
  {
    title: "Operator generates a one-time code",
    copy: "The profile owner opens the Agent Wallet panel on their dashboard and taps Register agent. A single-use code in the format OGB-XXXX-XXXX is generated, valid for 15 minutes. Generating a new code invalidates any previous unused one."
  },
  {
    title: "Hand the code to the agent",
    copy: "The operator gives the code — or the full copy-paste instruction from the modal — to the agent. No login, session, or wallet is shared. Only the code travels."
  },
  {
    title: "Agent signs the exact challenge",
    copy: "The agent signs this message with its OWN agent wallet on Base. Every line must match exactly, and the Timestamp must be within 5 minutes of the current time:"
  },
  {
    title: "POST to /api/agent/link",
    copy: "The agent sends the code, its address, chainId 8453, the exact signed message, and the signature to https://joinog.xyz/api/agent/link. The response returns { ok, handle, agentWallet, score }."
  },
  {
    title: "Slot linked, combined score refreshed",
    copy: "The server resolves the code to the operator's profile server-side, verifies the signature, and links the wallet into the agent slot. Both wallets are then rescored into one combined OG Score — only NFTs from verified contracts count."
  },
  {
    title: "Mint the badge when eligible",
    copy: "Once the profile is eligible, the OG BLOCK badge can be minted on Base. The agent's on-chain activity is now tracked and counted alongside its operator's."
  }
];

const challengeMessage = `OG BLOCK agent link
Code: <CODE>
Agent wallet: <AGENT_ADDRESS>
Timestamp: <ISO_8601>`;

const linkPayload = `{
  "code": "OGB-XXXX-XXXX",
  "address": "<AGENT_ADDRESS>",
  "chainId": 8453,
  "message": "<THE_EXACT_MESSAGE_YOU_SIGNED>",
  "signature": "0x..."
}`;

export default function AgentGuidePage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-4 py-14 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,255,0.14),transparent_30%),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
      <div className="relative mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Agent onboarding</p>
          <div className="mt-2 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <h1
                className="font-bebas text-[clamp(2.2rem,4.5vw,3.4rem)] font-normal leading-[0.98] text-[#0A0B0D]"
                style={{
                  letterSpacing: "0.02em",
                }}
              >
                Clear instructions for AI agents joining OG BLOCK.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/75">
                This page is public on purpose. Any AI agent that scans it can register into a profile&apos;s agent wallet slot: get a one-time code from the operator, sign the challenge with its own wallet, POST it to the link endpoint — and its NFTs count into the combined OG Score, without ever touching the operator&apos;s main wallet.
              </p>
            </div>

            <aside id="agent-instruction" className="rounded-2xl border border-baseblue/15 bg-baseblue/[0.04] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-baseblue">Copy this to your agent</p>
              <div className="mt-3 rounded-xl border border-baseblue/15 bg-white p-4 text-sm font-semibold leading-6 text-ink">
                Register yourself as the agent wallet for my OG BLOCK profile. Sign the exact challenge message with your own agent wallet, then POST the code, your address, the message, and the signature to /api/agent/link.
              </div>
              <p className="mt-3 text-xs leading-5 text-black/75">
                The code is single-use and expires in 15 minutes. The signed Timestamp must be within 5 minutes of now.
              </p>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agentSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-baseblue text-sm font-bold text-white">
                {index + 1}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-black/70">{step.copy}</p>
              {index === 2 ? (
                <pre className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-[#fbfcff] p-3 text-xs leading-6 text-ink">{challengeMessage}</pre>
              ) : null}
              {index === 3 ? (
                <pre className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-[#fbfcff] p-3 text-xs leading-6 text-ink">{linkPayload}</pre>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-baseblue">Machine-readable agent task</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <h2 className="font-semibold text-ink">Goal</h2>
              <p className="mt-2 text-sm leading-6 text-black/70">
                Register the agent into the agent wallet slot of an existing OG BLOCK profile using a one-time code, verified by a signature from the agent&apos;s own wallet. After linking, the combined OG Score refreshes across both wallets — only verified-contract NFTs count — and the OG BLOCK badge can be minted on Base once eligible.
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <h2 className="font-semibold text-ink">Important rules</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-black/70">
                <li>The agent signs only with its own wallet — never the operator&apos;s.</li>
                <li>The code resolves to the operator&apos;s profile server-side; an agent can only attach to the profile that issued the code.</li>
                <li>The code is single-use, expires in 15 minutes, and a new code invalidates the previous unused one.</li>
                <li>One agent wallet can only be linked to a single profile.</li>
                <li>The signed Timestamp must be within 5 minutes of server time.</li>
              </ul>
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-6 text-white"><code>{`AGENT_TASK: OG_BLOCK_AGENT_REGISTER
SITE: joinog.xyz
WALLET_SLOT: agent
CHAIN: Base (8453)
REQUIRED_ACTIONS:
1. Operator opens the Agent Wallet panel on joinog.xyz and taps "Register agent"
   to get a one-time code, format OGB-XXXX-XXXX (single-use, expires in 15 min;
   a new code invalidates the previous unused one).
2. Operator hands the code to the agent.
3. Agent signs this exact message with its OWN wallet (Timestamp within 5 min):
     OG BLOCK agent link
     Code: <CODE>
     Agent wallet: <AGENT_ADDRESS>
     Timestamp: <ISO_8601>
4. Agent POSTs to https://joinog.xyz/api/agent/link
     { "code", "address", "chainId": 8453, "message", "signature" }
5. Server resolves the code server-side, verifies the signature, links the
   agent wallet slot, and rescoring runs across human + agent wallets
   (verified-contract NFTs only).
RESPONSE: { "ok": true, "handle", "agentWallet", "score" }
CONSTRAINTS:
- one agent wallet may only be linked to a single profile
- exact-line challenge match (no padding)
- DO_NOT_USE the operator's personal/main wallet for agent verification.`}</code></pre>
        </section>
      </div>
    </main>
  );
}
