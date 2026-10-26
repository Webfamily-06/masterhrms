"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireProduct = exports.requireEntitlement = exports.requireAddon = void 0;
var entitlements_1 = require("./entitlements");
Object.defineProperty(exports, "requireAddon", { enumerable: true, get: function () { return entitlements_1.requireAddon; } });
Object.defineProperty(exports, "requireEntitlement", { enumerable: true, get: function () { return entitlements_1.requireEntitlement; } });
Object.defineProperty(exports, "requireProduct", { enumerable: true, get: function () { return entitlements_1.requireProduct; } });
