/**
 * Rehearsal of the PUBLIC agent-link flow shown in /agent-guide — the same path
 * a video demo would record:
 *   1. generate one-time code (same lib as dashboard "Register agent")
 *   2. agent signs the exact challenge with its OWN ACP wallet
 *   3. agent POSTs code+message+signature to POST /api/agent/link
 *
 * Unlike scripts/smoke-acp-agent-wallet.ts (operator-side direct DB write),
 * this exercises the real public endpoint end-to-end.
 *
 * Usage: tsx scripts/rehearsal-agent-link.ts [--handle @x] [--agent-id id] [--acp-dir dir] [--endpoint url]
 */

import "dotenv/config";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createAgentLinkCode, buildAgentInstruction } from "@/lib/agent-link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_AGENT_ID = "019f0a02-50d4-7169-b047-a5771369e32a";
const DEFAULT_ACP_DIR = "C:/Users/bobyr/Documents/Playground/ACP CLI/acp-cli";

function parseArgs(): Record<string, string> {
  const argv = process.argv.slice(2);
  const out: Record<string, string> = {
    handle: "airplanestar_",
    "agent-id": DEFAULT_AGENT_ID,
    "acp-dir": DEFAULT_ACP_DIR,
    endpoint: "http://localhost:3000"
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg.startsWith("--") && value) {
      out[arg.slice(2)] = value;
      index += 1;
    }
  }
  return out;
}

function runAcp(acpDir: string, args: string[]) {
  const resolvedAcpDir = resolve(acpDir);
  const tsxCli = resolve(resolvedAcpDir, "node_modules/tsx/dist/cli.mjs");
  try {
    const stdout = execFileSync(process.execPath, [tsxCli, "bin/acp.ts", ...args, "--json"], {
      cwd: resolvedAcpDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return JSON.parse(stdout.trim());
  } catch (error) {
    const failure = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    throw new Error(
      [failure.message, failure.stdout?.toString(), failure.stderr?.toString()].filter(Boolean).join("\n")
    );
  }
}

async function main() {
  const args = parseArgs();
  const supabase = getSupabaseAdmin();
  const handle = args.handle.replace(/^@/, "").toLowerCase();

  const { data: user, error } = await supabase
    .from("users")
    .select("id,x_handle")
    .eq("x_handle", handle)
    .maybeSingle();
  if (error) throw error;
  if (!user) throw new Error(`user @${handle} not found`);

  console.log(`[1/5] operator @${handle} generates a one-time code…`);
  const { code, expiresAt } = await createAgentLinkCode(user.id);
  console.log(buildAgentInstruction(code, handle));
  console.log(`   code=${code} expiresAt=${new Date(expiresAt).toISOString()}`);

  console.log("[2/5] agent selects its ACP wallet…");
  runAcp(args["acp-dir"], ["agent", "use", "--agent-id", args["agent-id"]]);
  const walletInfo = runAcp(args["acp-dir"], ["wallet", "address"]);
  const agentWallet = String(walletInfo.address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(agentWallet)) throw new Error(`bad ACP wallet address: ${agentWallet}`);
  console.log(`   agentWallet=${agentWallet}`);

  console.log("[3/5] agent signs the EXACT challenge with its own wallet…");
  const message = [
    "OG BLOCK agent link",
    `Code: ${code}`,
    `Agent wallet: ${agentWallet}`,
    `Timestamp: ${new Date().toISOString()}`
  ].join("\n");
  const signed = runAcp(args["acp-dir"], [
    "wallet",
    "sign-message",
    "--chain-id",
    "8453",
    "--message",
    message
  ]);
  const signature = String(signed.signature || "");
  if (!signature.startsWith("0x")) throw new Error(`no signature returned: ${JSON.stringify(signed).slice(0, 200)}`);
  console.log(`   signature=${signature.slice(0, 20)}…${signature.slice(-8)}`);

  console.log("[4/5] agent POSTs to the public /api/agent/link endpoint…");
  const response = await fetch(`${args.endpoint}/api/agent/link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, address: agentWallet, chainId: 8453, message, signature }),
    signal: AbortSignal.timeout(120_000)
  });
  const body = await response.json().catch(() => null);
  console.log(`   HTTP ${response.status}: ${JSON.stringify(body)}`);
  if (!response.ok || !body?.ok) throw new Error("agent link failed — see response above");

  console.log("[5/5] verifying DB state after linking…");
  const [{ data: slots }, { data: score }] = await Promise.all([
    supabase.from("wallets").select("address,wallet_slot,verified_at").eq("user_id", user.id),
    supabase.from("scores").select("score,nft_count,rank,last_calculated_at").eq("user_id", user.id).maybeSingle()
  ]);
  console.log(JSON.stringify({ slots, score }, null, 2));

  console.log("\nREHEARSAL PASSED ✅ — flow matches /agent-guide exactly.");
}

main().catch((err) => {
  console.error("REHEARSAL FAILED ❌");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
