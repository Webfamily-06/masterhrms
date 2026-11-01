import { TurnstileService, verifyTurnstileToken, getTurnstileConfig } from "../server/src/services/security/turnstile.service";

async function run() {
  console.log("================================================================================");
  console.log("🧪 RUNNING TURNSTILE BOT PROTECTION INTEGRATION VERIFICATION");
  console.log("================================================================================");

  // 1. Config Test
  const config = getTurnstileConfig();
  console.log("▶ [Test 1] Config Resolution:");
  console.log("   Site Key:", config.siteKey);
  console.log("   Secret Key configured:", Boolean(config.secretKey));
  console.log("   Enforcement Mode:", config.mode);
  if (!config.siteKey || config.siteKey === "1x00000000000000000000AA") {
    throw new Error("TURNSTILE_SITE_KEY is not configured in .env file");
  }
  if (!config.secretKey || config.secretKey === "1x0000000000000000000000000000000AA") {
    throw new Error("TURNSTILE_SECRET is not configured in .env file");
  }
  if (config.mode !== "enforce") {
    throw new Error(`Enforcement mode expected 'enforce', got ${config.mode}`);
  }
  console.log("  ✔ Config resolution verified.");

  // 2. Missing Token
  console.log("▶ [Test 2] Missing Token Check:");
  const missingRes = await TurnstileService.verify({
    token: "",
    action: "login",
  });
  if (missingRes.success !== false || missingRes.code !== "TURNSTILE_TOKEN_MISSING") {
    throw new Error(`Expected missing token rejection, got ${JSON.stringify(missingRes)}`);
  }
  console.log("  ✔ Missing token successfully rejected with TURNSTILE_TOKEN_MISSING.");

  // 3. Replay Protection
  console.log("▶ [Test 3] Replay Protection:");
  const dummyToken = "dummy-unique-token-" + Date.now();
  // Trigger verification which records token in consumedTokens map
  await TurnstileService.verify({ token: dummyToken, action: "login" });
  // Second call with same token
  const replayRes = await TurnstileService.verify({ token: dummyToken, action: "login" });
  if (replayRes.success !== false || replayRes.code !== "TURNSTILE_TOKEN_REPLAYED") {
    throw new Error(`Expected replay rejection, got ${JSON.stringify(replayRes)}`);
  }
  console.log("  ✔ Replay token rejected with TURNSTILE_TOKEN_REPLAYED.");

  // 4. Live Cloudflare Siteverify Authenticity Check
  console.log("▶ [Test 4] Cloudflare Siteverify Live Validation with Secret:");
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secret!,
      response: "XXXX.DUMMY.TOKEN.XXXX",
    }),
  });
  const data = await res.json() as any;
  console.log("   Siteverify API Response:", data);
  if (data.success !== false || !data["error-codes"]?.includes("invalid-input-response")) {
    throw new Error(`Unexpected siteverify response: ${JSON.stringify(data)}`);
  }
  if (data["error-codes"]?.includes("invalid-input-secret")) {
    throw new Error("Secret key was rejected by Cloudflare!");
  }
  console.log("  ✔ Cloudflare accepted secret key as valid (dummy token gave expected invalid-input-response).");

  console.log("================================================================================");
  console.log("✅ ALL TURNSTILE INTEGRATION TESTS PASSED EMPIRICALLY!");
  console.log("================================================================================");
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
