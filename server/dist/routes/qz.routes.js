"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qzRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
exports.qzRouter = (0, express_1.Router)();
// Generate key pair for QZ-Tray signing
let privateKey = "";
let certificate = "";
try {
    const { privateKey: pKey } = crypto_1.default.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKey = pKey;
    certificate = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQDQ3m3Q45c2FTANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJJ
TjEPMA0GA1UECAwGVGFtaWwgTmFkdTEOMAwGA1UEBwwFQ2hlbm5haTEfMB0GA1UE
CgwWVFNWIEdsb2JhbCBTb2x1dGlvbnMxDzANBgNVBAsMBkVSUCBQT1MxEzARBgNV
BAMMCnN0b2NreS5sb2NhbDAeFw0yNjA5MTYwMDAwMDBaFw0zNjA5MTQwMDAwMDBa
MIGFMQswCQYDVQQGEwJJTjEPMA0GA1UECAwGVGFtaWwgTmFkdTEOMAwGA1UEBwwF
Q2hlbm5haTEfMB0GA1UECgwWVFNWIEdsb2JhbCBTb2x1dGlvbnMxDzANBgNVBAsM
BkVSUCBQT1MxEzARBgNVBAMMCnN0b2NreS5sb2NhbDCBnzANBgkqhkiG9w0BAQEF
AAOBjQAwgYkCgYEAwQJ7x7mYwK25H/bKq9hKkP3lU9aW9x2zK+3w9...
-----END CERTIFICATE-----`;
}
catch (e) {
    console.error("Error generating keys:", e);
}
/**
 * GET /api/qz/certificate
 * Returns the company's X.509 certificate for QZ-Tray validation
 */
exports.qzRouter.get("/certificate", (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    return res.send(certificate);
});
/**
 * POST /api/qz/sign
 * Signs the raw string payload using SHA512 with RSA private key
 */
exports.qzRouter.post("/sign", (req, res) => {
    try {
        const toSign = req.body?.request || req.body?.data || "";
        if (!toSign) {
            return res.status(400).send("No payload provided to sign");
        }
        if (!privateKey) {
            return res.status(500).send("Signing key not initialized");
        }
        const signer = crypto_1.default.createSign("SHA512");
        signer.update(toSign);
        signer.end();
        const signature = signer.sign(privateKey, "base64");
        res.setHeader("Content-Type", "text/plain");
        return res.send(signature);
    }
    catch (err) {
        console.error("QZ signing error:", err);
        return res.status(500).send("Signing failed: " + err.message);
    }
});
