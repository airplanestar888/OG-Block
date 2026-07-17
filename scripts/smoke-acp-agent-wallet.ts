import "dotenv/config";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { verifyMessage } from "viem";
import { calculateScoreForWallets, persistScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Args = {
  handle: string;
  agentId: string;
  acpDir: string;
};

const DEFAULT_AGENT_ID = "019f0a02-50d4-7169-b047-a5771369e32a";
const DEFAULT_ACP_DIR = "C:/Users/bobyr/Documents/Playground/ACP CLI/acp-cli";

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    handle: "airplanestar_",
    agentId: DEFAULT_AGENT_ID,
    acpDir: DEFAULT_ACP_DIR
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--handle" && value) {
      result.handle = value.replace(/^@/, "").toLowerCase();
      index += 1;
    } else if (arg === "--agent-id" && value) {
      result.agentId = value;
      index += 1;
    } else if (arg === "--acp-dir" && value) {
      result.acpDir = value;
      index += 1;
    }
  }

  return result;
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
    const stdout = failure.stdout?.toString() || "";
    const stderr = failure.stderr?.toString() || "";
    throw new Error([failure.message, stdout, stderr].filter(Boolean).join("\n"));
  }
}

async function main() {
  const args = parseArgs();
  const supabase = getSupabaseAdmin();
  const normalizedHandle = args.handle.replace(/^@/, "").toLowerCase();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,x_user_id,x_handle")
    .eq("x_handle", normalizedHandle)
    .maybeSingle();

  if (userError) throw userError;
  if (!user) throw new Error(`OG-Block user @${normalizedHandle} not found`);

  runAcp(args.acpDir, ["agent", "use", "--agent-id", args.agentId]);
  const wallet = runAcp(args.acpDir, ["wallet", "address"]);
  const agentWallet = String(wallet.address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(agentWallet)) {
    throw new Error(`Invalid ACP EVM wallet address: ${agentWallet}`);
  }

  const message = [
    "OG-Block wallet slot verification",
    "Wallet slot: agent",
    `X user id: ${user.x_user_id}`,
    `X handle: ${user.x_handle}`,
    `Wallet: ${agentWallet}`,
    `Timestamp: ${new Date().toISOString()}`
  ].join("\n");

  const signed = runAcp(args.acpDir, ["wallet", "sign-message", "--chain-id", "8453", "--message", message]);
  const signature = String(signed.signature || "");
  const verified = await verifyMessage({
    address: agentWallet as `0x${string}`,
    message,
    signature: signature as `0x${string}`
  });

  if (!verified) throw new Error("ACP signature verification failed");

  const { error: walletError } = await supabase.from("wallets").upsert(
    {
      user_id: user.id,
      address: agentWallet,
      chain_id: 8453,
      wallet_slot: "agent",
      verified_at: new Date().toISOString()
    },
    { onConflict: "user_id,wallet_slot" }
  );
  if (walletError) throw walletError;

  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("address,wallet_slot")
    .eq("user_id", user.id)
    .in("wallet_slot", ["human", "agent"]);

  if (walletsError) throw walletsError;

  const walletAddresses = (wallets || []).map((slotWallet) => slotWallet.address).filter(Boolean);
  const result = await calculateScoreForWallets(user.id, walletAddresses);
  await persistScore(user.id, result);

  console.log(
    JSON.stringify(
      {
        ok: true,
        xHandle: user.x_handle,
        agentId: args.agentId,
        agentWallet,
        walletSlot: "agent",
        verified,
        score: result.score,
        isOg: result.isOg,
        nftCount: result.nftCount,
        wallets: wallets || []
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
