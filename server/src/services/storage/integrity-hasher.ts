import crypto from 'crypto';
import { Readable } from 'stream';

/**
 * Computes the SHA-256 cryptographic integrity hash for a binary buffer.
 * Returns 64-character lowercase hexadecimal string.
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes the SHA-256 cryptographic integrity hash for a readable stream.
 */
export async function computeSha256Stream(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Verifies that a buffer matches the expected SHA-256 hash.
 */
export function verifySha256(buffer: Buffer, expectedHash: string): boolean {
  if (!expectedHash || expectedHash.length !== 64) return false;
  const actualHash = computeSha256(buffer);
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export const IntegrityHasher = {
  computeHash: computeSha256,
  computeHashStream: computeSha256Stream,
  verifyHash: verifySha256,
};
