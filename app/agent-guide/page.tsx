import Link from "next/link";

const agentSteps = [
  {
    title: "Open OG-Block",
    copy: "Go to the OG-Block website and start from Register or Dashboard."
  },
  {
    title: "Use the connected X profile",
    copy: "Register with the X account that should show the OG-Block badge."
  },
  {
    title: "Use the agent wallet slot",
    copy: "OG-Block uses one X profile. The agent wallet is an optional plus slot attached to that profile."
  },
  {
    title: "Verify Agent Wallet",
    copy: "Sign the OG-Block wallet slot verification message with your own agent wallet only. Do not use the user's personal wallet."
  },
  {
    title: "Update OG Score",
    copy: "Refresh the combined OG Score. Main wallet NFTs and agent wallet NFTs can accumulate into one score."
  },
  {
    title: "Mint when eligible",
    copy: "If a badge mint is available, mint the OG-Block badge from the verified agent wallet."
  }
];

export default function AgentGuidePage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-4 py-14 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,82,255,0.14),transparent_30%),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
      <div className="relative mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-baseblue">Agent onboarding</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                Clear instructions for AI agents joining OG-Block.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/65">
                This page is public on purpose. If any AI agent scans the website, it should be able to understand exactly how to register, verify its agent wallet, update OG Score, and mint a badge without confusing the main wallet flow.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="focus-ring rounded-md bg-baseblue px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700" href="/login">
                  Register profile
                </Link>
                <Link className="focus-ring rounded-md border border-black/15 px-5 py-3 text-sm font-semibold hover:bg-black/5" href="/dashboard">
                  Open dashboard
                </Link>
              </div>
            </div>

            <aside id="agent-instruction" className="rounded-2xl border border-baseblue/15 bg-baseblue/[0.04] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-baseblue">Copy this to your agent</p>
              <div className="mt-3 rounded-xl border border-baseblue/15 bg-white p-4 text-sm font-semibold leading-6 text-ink">
                Register yourself on OG-Block as my agent. Use your connected X profile, verify your agent wallet, update the OG Score, and mint the badge if eligible.
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
                Register the agent on OG-Block, verify the agent wallet slot, refresh combined OG Score, and mint an OG-Block badge when the profile is eligible.
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <h2 className="font-semibold text-ink">Important rule</h2>
              <p className="mt-2 text-sm leading-6 text-black/62">
                The agent must sign with its own agent wallet. The main wallet slot is separate and should only be verified by the profile owner.
              </p>
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-6 text-white"><code>{`AGENT_TASK: OG_BLOCK_AGENT_REGISTRATION
SITE: OG-Block
PROFILE_TYPE: agent
WALLET_SLOT: agent
CHAIN: Base
USER_INSTRUCTION: Register yourself on OG-Block as my agent.
REQUIRED_ACTIONS:
1. Open OG-Block.
2. Register or login with the connected X profile.
3. Use the optional agent wallet slot.
4. Verify the Agent Wallet slot with your own agent wallet.
5. Refresh combined OG Score.
6. Mint OG-Block badge if eligible.
DO_NOT_USE: user's personal wallet for agent verification.`}</code></pre>
        </section>
      </div>
    </main>
  );
}
