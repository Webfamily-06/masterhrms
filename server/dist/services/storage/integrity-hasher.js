"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityHasher = void 0;
exports.computeSha256 = computeSha256;
exports.computeSha256Stream = computeSha256Stream;
exports.verifySha256 = verifySha256;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Computes the SHA-256 cryptographic integrity hash for a binary buffer.
 * Returns 64-character lowercase hexadecimal string.
 */
function computeSha256(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
/**
 * Computes the SHA-256 cryptographic integrity hash for a readable stream.
 */
async function computeSha256Stream(stream) {
    return new Promise((resolve, reject) => {
        const hash = crypto_1.default.createHash('sha256');
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}
/**
 * Verifies that a buffer matches the expected SHA-256 hash.
 */
function verifySha256(buffer, expectedHash) {
    if (!expectedHash || expectedHash.length !== 64)
        return false;
    const actualHash = computeSha256(buffer);
    return crypto_1.default.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}
exports.IntegrityHasher = {
    computeHash: computeSha256,
    computeHashStream: computeSha256Stream,
    verifyHash: verifySha256,
};
