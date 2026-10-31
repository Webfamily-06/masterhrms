"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.generateMfaToken = generateMfaToken;
exports.verifyMfaToken = verifyMfaToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_config_1 = require("./crypto-config");
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "7d";
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, (0, crypto_config_1.getJwtSecret)(), { expiresIn: getJwtExpiresIn() });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, (0, crypto_config_1.getJwtSecret)());
}
function generateMfaToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, mfaPending: true }, (0, crypto_config_1.getJwtSecret)(), { expiresIn: "5m" });
}
function verifyMfaToken(token) {
    return jsonwebtoken_1.default.verify(token, (0, crypto_config_1.getJwtSecret)());
}
