# WAVE 2.4 — DIGITAL SIGNATURE INTEGRATION DESIGN
## PKCS#7 / RSA-SHA256 Detached Signatures, Certificate Management & Integrity Verification

---

## 1. Regulatory & Banking Context

Indian corporate banking portals (ICICI Corporate Internet Banking, HDFC Corporate Enet, SBI Corporate Multi-Portal) mandate cryptographic signing of bulk salary payout files before host-to-host transmission or web portal upload. This prevents man-in-the-middle tampering, internal fraud, and repudiation.

---

## 2. Technical Architecture

`DigitalSignatureService` (`server/src/services/digital-signature.service.ts`) provides a self-contained cryptographic bridge utilizing Node.js standard `crypto` module.

### 2.1 Detached PKCS#7 Structure
- A detached signature keeps the transmission file completely human-readable in its bank-native format (caret, CSV, or pipe delimited) while producing a separate cryptographic signature manifest.
- **Envelope Metadata**:
  - `algorithm`: `RSA-SHA256`
  - `digest`: Hexadecimal SHA-256 hash of plaintext content.
  - `signature`: Base64-encoded ASN.1 / DER PKCS#7 signature envelope.
  - `certificate`: X.509 corporate certificate metadata (Subject, Issuer, Validity period).
  - `signedAt`: ISO-8601 UTC timestamp of execution.
  - `signerName`: Authorized corporate signatory identity.

### 2.2 Tamper Detection & Verification Flow
```
PlainText File ────► SHA-256 ────► Hash A ───┐
                                              │ Match? ──► Authentic (Tamper-Free)
Signed Digest  ────► Decrypt With PubKey ────► Hash B ───┘
```
If an adversary or rogue insider alters a single character in the payout file (e.g. changing an account number or increasing a net pay amount by ₹1), `verifyDetachedSignature` fails with `isValid: false`, strictly blocking payment transmission.

---

## 3. Production Certificate Deployment Guide

1. **Environment Variables**:
   - `CORPORATE_SIGNING_PRIVATE_KEY_PATH`: Path to PEM-encoded private key file (kept outside git repository with `chmod 600`).
   - `CORPORATE_SIGNING_CERT_PATH`: Path to PEM-encoded public X.509 certificate issued by licensed Certifying Authority (e.g. eMudhra, Sify, Capricorn).
   - `CORPORATE_SIGNING_KEY_PASSPHRASE`: Strong passphrase protecting private key.

2. **Ephemeral / Sandbox Fallback**:
   If explicit certificate paths are not configured in development or test environments, `DigitalSignatureService` automatically generates a deterministic in-memory 2048-bit RSA keypair and self-signed certificate, allowing full offline testing without blocking local development.
