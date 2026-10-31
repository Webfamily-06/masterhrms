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
const getJwtSecret = () => process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "7d";
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, getJwtSecret());
}
function generateMfaToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, mfaPending: true }, getJwtSecret(), { expiresIn: "5m" });
}
function verifyMfaToken(token) {
    return jsonwebtoken_1.default.verify(token, getJwtSecret());
}
