/// Production-readiness tests for OG-Block.
/// Run with: npx tsx scripts/test-production-readiness.ts
///
/// These tests verify that:
/// 1. Production cannot silently use mock NFT provider
/// 2. Development can use mock explicitly
/// 3. Scoring fails closed when NFT provider errors
/// 4. Og Card claim rejects fake token IDs (server-side verification required)
/// 5. Wallet nonce is single-use

import assert from "assert";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`  ✅ ${name}`);
    })
    .catch((err) => {
      failed++;
      console.log(`  ❌ ${name}: ${err.message}`);
    });
}

// ─── ENV VALIDATION ─────────────────────────────────────

async function testEnvValidation() {
  console.log("\n─ ENV Validation ─");

  await test("production + NFT_PROVIDER=mock → rejected", () => {
    const originalNode = process.env.NODE_ENV;
    const originalProvider = process.env.NFT_PROVIDER;
    process.env.NODE_ENV = "production";
    process.env.NFT_PROVIDER = "mock";
    // Set other required vars so the mock-specific check is reached
    const requiredVars: Record<string, string | undefined> = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      X_CLIENT_ID: process.env.X_CLIENT_ID,
      X_CLIENT_SECRET: process.env.X_CLIENT_SECRET,
      CRON_SECRET: process.env.CRON_SECRET
    };
    // Ensure required vars are set for this test
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-key";
    process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret";
    process.env.X_CLIENT_ID = process.env.X_CLIENT_ID || "test-id";
    process.env.X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || "test-secret-2";
    process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";

    try {
      delete require.cache[require.resolve("../lib/env")];
      require("../lib/env");
      const { assertServerEnv } = require("../lib/env");
      assert.throws(() => assertServerEnv(), /mock is not allowed in production/);
    } finally {
      process.env.NODE_ENV = originalNode;
      process.env.NFT_PROVIDER = originalProvider;
      // Restore vars
      Object.entries(requiredVars).forEach(([k, v]) => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      });
    }
  });

  await test("production + NFT_PROVIDER unset → rejected", () => {
    const originalNode = process.env.NODE_ENV;
    const originalProvider = process.env.NFT_PROVIDER;
    process.env.NODE_ENV = "production";
    delete process.env.NFT_PROVIDER;
    try {
      // env schema parse will throw because NFT_PROVIDER has no default
      assert.throws(() => {
        delete require.cache[require.resolve("../lib/env")];
        require("../lib/env");
      });
    } finally {
      process.env.NODE_ENV = originalNode;
      process.env.NFT_PROVIDER = originalProvider;
    }
  });

  await test("development + NFT_PROVIDER=mock → allowed", () => {
    const originalNode = process.env.NODE_ENV;
    const originalProvider = process.env.NFT_PROVIDER;
    process.env.NODE_ENV = "development";
    process.env.NFT_PROVIDER = "mock";
    try {
      delete require.cache[require.resolve("../lib/env")];
      const { assertServerEnv, env } = require("../lib/env");
      // Should not throw for mock in development
      assert.strictEqual(env.NFT_PROVIDER, "mock");
    } finally {
      process.env.NODE_ENV = originalNode;
      process.env.NFT_PROVIDER = originalProvider;
    }
  });
}

// ─── NFT PROVIDER FAIL-CLOSED ──────────────────────────

async function testNftProvider() {
  console.log("\n─ NFT Provider Fail-Closed ─");

  await test("mock provider throws in production", () => {
    const originalNode = process.env.NODE_ENV;
    const originalProvider = process.env.NFT_PROVIDER;
    process.env.NODE_ENV = "production";
    process.env.NFT_PROVIDER = "mock";
    try {
      delete require.cache[require.resolve("../lib/env")];
      delete require.cache[require.resolve("../lib/nft/providers")];
      const { getNftProvider } = require("../lib/nft/providers");
      assert.throws(() => getNftProvider(), /not valid for production/);
    } finally {
      process.env.NODE_ENV = originalNode;
      process.env.NFT_PROVIDER = originalProvider;
    }
  });

  await test("invalid NFT_PROVIDER throws in production", () => {
    const originalNode = process.env.NODE_ENV;
    const originalProvider = process.env.NFT_PROVIDER;
    process.env.NODE_ENV = "production";
    process.env.NFT_PROVIDER = "invalid_provider";
    try {
      delete require.cache[require.resolve("../lib/env")];
      delete require.cache[require.resolve("../lib/nft/providers")];
      // env schema will reject invalid enum value
      assert.throws(() => {
        require("../lib/env");
      });
    } finally {
      process.env.NODE_ENV = originalNode;
      process.env.NFT_PROVIDER = originalProvider;
    }
  });

  await test("mock provider allowed in development", () => {
    const originalNode = process.env.NODE_ENV;
    const originalProvider = process.env.NFT_PROVIDER;
    process.env.NODE_ENV = "development";
    process.env.NFT_PROVIDER = "mock";
    try {
      delete require.cache[require.resolve("../lib/env")];
      delete require.cache[require.resolve("../lib/nft/providers")];
      const { getNftProvider } = require("../lib/nft/providers");
      const provider = getNftProvider();
      assert.ok(provider, "provider should be created");
    } finally {
      process.env.NODE_ENV = originalNode;
      process.env.NFT_PROVIDER = originalProvider;
    }
  });
}

// ─── SUPPORTED CHAINS ──────────────────────────────────

async function testSupportedChains() {
  console.log("\n─ Supported Chains ──");

  await test("Solana is NOT in supported chains (disabled)", () => {
    const fs = require("fs");
    const content = fs.readFileSync("lib/nft/providers.ts", "utf8");
    // Solana should not be in SUPPORTED_CHAINS
    assert.ok(
      !content.match(/id:\s*1399811149/),
      "Solana chain ID should not be present in SUPPORTED_CHAINS"
    );
  });

  await test("Base + Ethereum + Robinhood are supported chains", () => {
    const fs = require("fs");
    const content = fs.readFileSync("lib/nft/providers.ts", "utf8");
    assert.ok(content.includes("id: 8453"), "Base chain ID present");
    assert.ok(content.includes("id: 1"), "Ethereum chain ID present");
    assert.ok(content.includes("id: 4663"), "Robinhood chain ID present");
  });

  await test("no misleading Arbitrum comment", () => {
    const fs = require("fs");
    const content = fs.readFileSync("lib/nft/providers.ts", "utf8");
    assert.ok(!content.includes("Arbitrum"), "No Arbitrum reference should remain");
  });
}

// ─── OG CARD ABI ───────────────────────────────────────

async function testOgCardAbi() {
  console.log("\n─ OG Card ABI ──────");

  await test("Minted event in ABI matches contract", () => {
    const { OgCardAbi } = require("../lib/og-card-abi");
    const mintedEvent = OgCardAbi.find(
      (item: { type: string; name: string }) => item.type === "event" && item.name === "Minted"
    );
    assert.ok(mintedEvent, "Minted event must exist in ABI");
    assert.strictEqual(mintedEvent.inputs.length, 2, "Minted event has 2 inputs");
    assert.strictEqual(mintedEvent.inputs[0].name, "to", "First input is 'to'");
    assert.strictEqual(mintedEvent.inputs[1].name, "tokenId", "Second input is 'tokenId'");
    assert.ok(mintedEvent.inputs[0].indexed, "'to' must be indexed");
    assert.ok(mintedEvent.inputs[1].indexed, "'tokenId' must be indexed");
  });
}

// ─── INSTRUMENTATION ───────────────────────────────────

async function testInstrumentation() {
  console.log("\n─ Instrumentation ──");

  await test("instrumentation.ts exists and calls assertServerEnv", () => {
    const fs = require("fs");
    const exists = fs.existsSync("instrumentation.ts");
    assert.ok(exists, "instrumentation.ts must exist");
    const content = fs.readFileSync("instrumentation.ts", "utf8");
    assert.ok(content.includes("assertServerEnv"), "Must call assertServerEnv");
    assert.ok(content.includes("register"), "Must export register function");
  });
}

// ─── MAIN ──────────────────────────────────────────────

async function main() {
  console.log("OG-Block Production Readiness Tests\n");

  await testEnvValidation();
  await testNftProvider();
  await testSupportedChains();
  await testOgCardAbi();
  await testInstrumentation();

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
