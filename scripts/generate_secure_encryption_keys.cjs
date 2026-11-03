#!/usr/bin/env node
/**
 * MASTERHRMS — Secure Cryptographic Key Generator for Production Environment
 *
 * This script generates 5 independent, cryptographically secure 256-bit (64-character hex)
 * encryption keys using Node.js crypto.randomBytes(32).
 *
 * Run this directly in your secure terminal:
 *   node scripts/generate_secure_encryption_keys.cjs
 *
 * DO NOT commit the output to version control.
 * Paste these values directly into:
 *   Vercel Dashboard -> Project Settings -> Environment Variables -> Production
 */

const crypto = require("crypto");

function generateSecureKey() {
  return crypto.randomBytes(32).toString("hex");
}

console.log("================================================================================");
console.log("MASTERHRMS — 256-BIT PRODUCTION ENCRYPTION KEYS GENERATOR");
console.log("Generated with: crypto.randomBytes(32).toString('hex') [256 bits entropy]");
console.log("================================================================================");
console.log("");
console.log("# Copy and paste the following 5 variables into your Vercel Production Environment:");
console.log("# Vercel -> Project -> Settings -> Environment Variables -> Production");
console.log("");

const keys = [
  {
    name: "AI_ENCRYPTION_KEY",
    desc: "AI provider credential encryption (OpenAI, Anthropic, Gemini API keys)",
    val: generateSecureKey(),
  },
  {
    name: "SETTINGS_ENCRYPTION_KEY",
    desc: "Tenant & system settings secret encryption (payment gateway secrets, webhooks)",
    val: generateSecureKey(),
  },
  {
    name: "EMAIL_CRYPTO_SECRET",
    desc: "Personal employee mailbox credential encryption (SMTP / IMAP credentials)",
    val: generateSecureKey(),
  },
  {
    name: "CONNECTOR_ENCRYPTION_KEY",
    desc: "OAuth cloud storage connector token encryption (Google Drive, OneDrive, Dropbox)",
    val: generateSecureKey(),
  },
  {
    name: "STORAGE_ENCRYPTION_KEY",
    desc: "Local encrypted storage AES-256-GCM chunk key",
    val: generateSecureKey(),
  },
];

for (const k of keys) {
  console.log(`### ${k.name}`);
  console.log(`# Purpose: ${k.desc}`);
  console.log(`${k.name}="${k.val}"`);
  console.log("");
}

console.log("================================================================================");
console.log("IMPORTANT DEPLOYMENT NOTICE:");
console.log("1. Add these 5 variables to Vercel Production Environment Variables.");
console.log("2. After saving, trigger a Redeploy of the latest Production deployment");
console.log("   (or push a commit to main) for the new environment variables to take effect.");
console.log("3. Existing database records are 100% backward-compatible and will continue to");
console.log("   decrypt transparently via the candidate key rings.");
console.log("================================================================================");

