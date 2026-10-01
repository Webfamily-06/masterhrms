const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STORAGE_ROOT_DIR = path.resolve(process.cwd(), 'storage', 'tenants');

/**
 * Re-encrypts all stored documents from legacy keys to the new primary active key.
 * Preserves the exact plaintext SHA-256 hash.
 */
async function rotateStorageKeys() {
  console.log('================================================================');
  console.log('STORAGE ENCRYPTION KEY ROTATION & RE-ENCRYPTION UTILITY');
  console.log('================================================================\n');

  const newKeyHex = process.env.STORAGE_ENCRYPTION_KEY;
  if (!newKeyHex || newKeyHex.length !== 64) {
    console.error('ERROR: STORAGE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
    process.exit(1);
  }
  const newKey = Buffer.from(newKeyHex, 'hex');

  // Load rotation ring (old keys)
  const ring = process.env.STORAGE_ENCRYPTION_KEY_RING || '';
  const oldKeys = ring
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length === 64)
    .map((k) => Buffer.from(k, 'hex'));

  const candidateKeys = [newKey, ...oldKeys];

  console.log(`Active New Key (SHA-256 fingerprint): ${crypto.createHash('sha256').update(newKey).digest('hex').slice(0, 16)}...`);
  console.log(`Available Key Ring Members:          ${oldKeys.length} legacy keys\n`);

  const documents = await prisma.storedDocument.findMany({
    where: { isEncrypted: true },
  });

  console.log(`Found ${documents.length} encrypted documents to audit and re-encrypt...\n`);

  let rotatedCount = 0;
  let alreadyUpToDate = 0;
  let failedCount = 0;

  for (const doc of documents) {
    const physicalPath = path.join(STORAGE_ROOT_DIR, doc.storageKey);
    if (!fs.existsSync(physicalPath)) {
      console.warn(`[WARN] File not found on disk: ${doc.storageKey}`);
      failedCount++;
      continue;
    }

    const rawDisk = fs.readFileSync(physicalPath);
    if (rawDisk.length < 28) {
      console.warn(`[WARN] File too small for AES-GCM headers: ${doc.storageKey}`);
      failedCount++;
      continue;
    }

    const iv = rawDisk.slice(0, 12);
    const authTag = rawDisk.slice(12, 28);
    const ciphertext = rawDisk.slice(28);

    // Try new key first
    let decryptedWithNewKey = false;
    let plaintext = null;

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', newKey, iv);
      decipher.setAuthTag(authTag);
      plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      decryptedWithNewKey = true;
    } catch {
      // Needs rotation from old key
    }

    if (decryptedWithNewKey) {
      alreadyUpToDate++;
      continue;
    }

    // Try old keys in rotation ring
    let decryptedWithLegacy = false;
    for (const oldKey of oldKeys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', oldKey, iv);
        decipher.setAuthTag(authTag);
        plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        decryptedWithLegacy = true;
        break;
      } catch {
        // Continue
      }
    }

    if (!decryptedWithLegacy || !plaintext) {
      console.error(`[FAIL] Could not decrypt document ${doc.id} with any key in rotation ring.`);
      failedCount++;
      continue;
    }

    // Verify SHA-256 integrity
    const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
    if (hash !== doc.sha256Hash) {
      console.error(`[FAIL] SHA-256 hash mismatch after decrypting ${doc.id}. Aborting file re-encryption.`);
      failedCount++;
      continue;
    }

    // Re-encrypt with new primary key & fresh random IV
    const freshIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', newKey, freshIv);
    const newEncrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const newAuthTag = cipher.getAuthTag();

    const newDiskPayload = Buffer.concat([freshIv, newAuthTag, newEncrypted]);

    // Atomic write
    const tempPath = `${physicalPath}.tmp`;
    fs.writeFileSync(tempPath, newDiskPayload, { mode: 0o600 });
    fs.renameSync(tempPath, physicalPath);

    rotatedCount++;
    console.log(`[ROTATED] Successfully re-encrypted document ${doc.id} (${doc.originalName})`);
  }

  console.log('\n================================================================');
  console.log(`ROTATION SUMMARY: ${rotatedCount} Rotated, ${alreadyUpToDate} Already Current, ${failedCount} Failed`);
  console.log('================================================================\n');
}

rotateStorageKeys()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
