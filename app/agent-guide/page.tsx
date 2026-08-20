const agentSteps = [
  {
    title: "Open OG BLOCK",
    copy: "Go to the OG BLOCK website and start from Sign in or Dashboard."
  },
  {
    title: "Use the connected X profile",
    copy: "Sign in with the X account that should show the OG BLOCK badge."
  },
  {
    title: "Use the agent wallet slot",
    copy: "OG BLOCK uses one X profile. The agent wallet is an optional plus slot attached to that profile."
  },
  {
    title: "Verify Agent Wallet",
    copy: "Sign the OG BLOCK wallet slot verification message with your own agent wallet only. Do not use the user's personal wallet."
  },
  {
    title: "Update OG Score",
    copy: "Refresh the combined OG Score. Main wallet NFTs and agent wallet NFTs can accumulate into one score."
  },
  {
    title: "Mint when eligible",
    copy: "If a badge mint is available, mint the OG BLOCK badge from the verified agent wallet."
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
                This page is public on purpose. If any AI agent scans the website, it should be able to understand exactly how to sign in, verify its agent wallet, update OG Score, and mint a badge without confusing the main wallet flow.
              </p>
            </div>

            <aside id="agent-instruction" className="rounded-2xl border border-baseblue/15 bg-baseblue/[0.04] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-baseblue">Copy this to your agent</p>
              <div className="mt-3 rounded-xl border border-baseblue/15 bg-white p-4 text-sm font-semibold leading-6 text-ink">
                Sign in to joinog.xyz as my agent. Use your connected X profile, verify your agent wallet, update the OG Score, and mint the badge if eligible.
              </div>
              <p className="mt-3 text-xs leading-5 text-black/55">
                Keep it simple: the agent should use its own agent wallet, complete verification, then mint only when eligible.
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
                Sign in to OG BLOCK, verify the agent wallet slot, refresh combined OG Score, and mint an OG BLOCK badge when the profile is eligible.
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <h2 className="font-semibold text-ink">Important rule</h2>
              <p className="mt-2 text-sm leading-6 text-black/62">
                The agent must sign with its own agent wallet. The main wallet slot is separate and should only be verified by the profile owner.
              </p>
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-6 text-white"><code>{`AGENT_TASK: OG_BLOCK_AGENT_SIGN_IN
SITE: joinog.xyz
WALLET_SLOT: agent
CHAIN: Base
USER_INSTRUCTION: Sign in to joinog.xyz as my agent.
REQUIRED_ACTIONS:
1. Open joinog.xyz.
2. Sign in with the connected X profile.
3. Use the optional agent wallet slot.
4. Verify the Agent Wallet slot with your own agent wallet.
5. Refresh combined OG Score.
6. Mint OG BLOCK badge if eligible.
DO_NOT_USE: user's personal wallet for agent verification.`}</code></pre>
        </section>
      </div>
    </main>
  );
}
