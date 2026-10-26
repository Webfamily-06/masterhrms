"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankAdapter = getBankAdapter;
exports.getSupportedBanks = getSupportedBanks;
__exportStar(require("./bank-adapter.interface"), exports);
__exportStar(require("./icici-cib.adapter"), exports);
__exportStar(require("./hdfc-enet.adapter"), exports);
__exportStar(require("./sbi-cmp.adapter"), exports);
const icici_cib_adapter_1 = require("./icici-cib.adapter");
const hdfc_enet_adapter_1 = require("./hdfc-enet.adapter");
const sbi_cmp_adapter_1 = require("./sbi-cmp.adapter");
const adapters = {
    ICICI: new icici_cib_adapter_1.IciciCibAdapter(),
    HDFC: new hdfc_enet_adapter_1.HdfcEnetAdapter(),
    SBI: new sbi_cmp_adapter_1.SbiCmpAdapter(),
};
function getBankAdapter(bankCode) {
    const normalized = (bankCode || '').trim().toUpperCase();
    const adapter = adapters[normalized];
    if (!adapter) {
        throw new Error(`Unsupported bank code "${bankCode}". Supported bank adapters: ${Object.keys(adapters).join(', ')}`);
    }
    return adapter;
}
function getSupportedBanks() {
    return Object.values(adapters).map((a) => ({
        bankCode: a.bankCode,
        bankName: a.bankName,
        formatType: a.formatType,
        fileExtension: a.fileExtension,
    }));
}
