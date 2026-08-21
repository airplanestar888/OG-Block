const agentSteps = [
  {
    title: "Operator generates a code",
    copy: "The profile owner opens the Agent Wallet panel on joinog.xyz and taps Register agent to get a one-time code (expires in 15 minutes)."
  },
  {
    title: "Hand the code to the agent",
    copy: "The operator gives the one-time code to the agent. No login or browser session is shared — just the code."
  },
  {
    title: "Sign the challenge",
    copy: "The agent signs the exact challenge message with its OWN agent wallet: 'OG BLOCK agent link', the code, its wallet address, and a timestamp."
  },
  {
    title: "POST to the link endpoint",
    copy: "The agent POSTs { code, address, chainId: 8453, message, signature } to https://www.joinog.xyz/api/agent/link."
  },
  {
    title: "Slot linked + score updated",
    copy: "The server verifies the code and signature, links the wallet into the agent slot, and refreshes the combined OG Score automatically."
  },
  {
    title: "Mint when eligible",
    copy: "Once linked, the OG BLOCK badge can be minted from the agent wallet on Base when the profile is eligible."
  }
];

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
                className="text-[clamp(2.2rem,4.5vw,3.4rem)] font-normal leading-[0.98] text-[#0A0B0D]"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                Clear instructions for AI agents joining OG BLOCK.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/65">
                This page is public on purpose. Any AI agent that scans it should understand exactly how to register into a profile&apos;s agent wallet slot using a one-time code, sign with its own wallet, get its NFTs counted in the combined OG Score, and mint a badge — without ever touching the operator&apos;s main wallet.
              </p>
            </div>

            <aside id="agent-instruction" className="rounded-2xl border border-baseblue/15 bg-baseblue/[0.04] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-baseblue">Copy this to your agent</p>
              <div className="mt-3 rounded-xl border border-baseblue/15 bg-white p-4 text-sm font-semibold leading-6 text-ink">
                Register as my agent on joinog.xyz using the one-time code I give you. Sign the challenge with your own agent wallet, then POST it to /api/agent/link so your wallet is added to my agent slot.
              </div>
              <p className="mt-3 text-xs leading-5 text-black/55">
                Keep it simple: get the code from the operator, sign with your own agent wallet, and register. The badge can be minted once linked.
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
              <p className="mt-2 text-sm leading-6 text-black/62">{step.copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-baseblue">Machine-readable agent task</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <h2 className="font-semibold text-ink">Goal</h2>
              <p className="mt-2 text-sm leading-6 text-black/62">
                Register the agent into the agent wallet slot of an existing OG BLOCK profile using a one-time code, verified by a signature from the agent&apos;s own wallet — then the combined OG Score updates and the OG BLOCK badge can be minted on Base.
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <h2 className="font-semibold text-ink">Important rule</h2>
              <p className="mt-2 text-sm leading-6 text-black/62">
                The agent signs only with its own agent wallet. The one-time code resolves to the operator&apos;s profile server-side, so an agent can only ever attach to the profile that issued the code — never someone else&apos;s.
              </p>
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-6 text-white"><code>{`AGENT_TASK: OG_BLOCK_AGENT_REGISTER
SITE: joinog.xyz
WALLET_SLOT: agent
CHAIN: Base (8453)
REQUIRED_ACTIONS:
1. Operator opens the Agent Wallet panel on joinog.xyz and taps "Register agent" to get a one-time code (expires in 15 min).
2. Operator hands the code to the agent.
3. Agent signs this exact message with its OWN wallet:
     OG BLOCK agent link
     Code: <CODE>
     Agent wallet: <AGENT_ADDRESS>
     Timestamp: <ISO_8601>
4. Agent POSTs to https://www.joinog.xyz/api/agent/link
     { "code", "address", "chainId": 8453, "message", "signature" }
5. Server links the agent wallet slot and refreshes the combined OG Score.
DO_NOT_USE: the operator's personal/main wallet for agent verification.`}</code></pre>
        </section>
      </div>
    </main>
  );
}
