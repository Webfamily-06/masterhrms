"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatutoryFormRegistryService = exports.STATUTORY_REGISTER_CATALOG = void 0;
const form_u_builder_service_1 = require("./builders/form-u-builder.service");
const form_v_builder_service_1 = require("./builders/form-v-builder.service");
const form_w_builder_service_1 = require("./builders/form-w-builder.service");
const form_x_builder_service_1 = require("./builders/form-x-builder.service");
const form_s_builder_service_1 = require("./builders/form-s-builder.service");
exports.STATUTORY_REGISTER_CATALOG = [
    {
        code: "FORM_U",
        name: "Form U — Employee Register",
        governingRule: "Rule 16(1)",
        governingAct: "Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948",
        columnCount: 27,
        description: "Comprehensive statutory register of all persons employed, including 480-day permanency eligibility and KYC details.",
        category: "EMPLOYEE_MASTER",
    },
    {
        code: "FORM_V",
        name: "Form V — Register of Employment / Muster Roll",
        governingRule: "Rule 16(1)",
        governingAct: "Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948",
        columnCount: 46,
        description: "Daily record of employment, commencement/end timings, rest intervals, and 31-day daily punch/attendance matrix.",
        category: "ATTENDANCE",
    },
    {
        code: "FORM_W",
        name: "Form W — Register of Wages",
        governingRule: "Rule 16(1)",
        governingAct: "Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948",
        columnCount: 34,
        description: "Detailed register of wage rates, allowances, EPF/ESI/PT/LWF deductions, net disbursements, and digital receipts.",
        category: "WAGES",
    },
    {
        code: "FORM_X",
        name: "Form X — Register of Leave & Social Security Benefits",
        governingRule: "Rule 16(1)",
        governingAct: "Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948",
        columnCount: 21,
        description: "Employee leave ledger (Earned, Medical, Other), Maternity benefits, and Gratuity nomination tracking.",
        category: "LEAVE_AND_BENEFITS",
    },
    {
        code: "FORM_S",
        name: "Form S — Notice of Daily Hours of Work & Shifts",
        governingRule: "Rule 18(4)",
        governingAct: "Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948",
        columnCount: 38,
        description: "Prominently displayed notice of daily work hours, rest intervals, weekly offs, wage rates, and shift rosters.",
        category: "SHIFT_NOTICE",
    },
];
class StatutoryFormRegistryService {
    /**
     * Return metadata catalog of all 5 dedicated statutory registers
     */
    static getAvailableRegisters() {
        return exports.STATUTORY_REGISTER_CATALOG;
    }
    /**
     * Central Dispatcher: Build the requested statutory register
     */
    static async generateRegister(formType, input) {
        const normalizedType = formType.toUpperCase().replace(/-/g, "_");
        const meta = exports.STATUTORY_REGISTER_CATALOG.find((m) => m.code === normalizedType);
        if (!meta) {
            throw new Error(`Unsupported statutory register code: "${formType}". Valid codes: FORM_U, FORM_V, FORM_W, FORM_X, FORM_S.`);
        }
        switch (normalizedType) {
            case "FORM_U": {
                const res = await form_u_builder_service_1.FormURegisterBuilder.build(input);
                return { model: res.model, validation: res.validation, metadata: meta };
            }
            case "FORM_V": {
                const res = await form_v_builder_service_1.FormVRegisterBuilder.build(input);
                return { model: res.model, validation: res.validation, metadata: meta };
            }
            case "FORM_W": {
                const res = await form_w_builder_service_1.FormWRegisterBuilder.build(input);
                return { model: res.model, validation: res.validation, metadata: meta };
            }
            case "FORM_X": {
                const res = await form_x_builder_service_1.FormXRegisterBuilder.build(input);
                return { model: res.model, validation: res.validation, metadata: meta };
            }
            case "FORM_S": {
                const res = await form_s_builder_service_1.FormSRegisterBuilder.build(input);
                return { model: res.model, validation: res.validation, metadata: meta };
            }
            default:
                throw new Error(`Unhandled statutory register code: ${normalizedType}`);
        }
    }
    /**
     * Run statutory validation against selected form and period
     */
    static async validateRegister(formType, input) {
        const result = await this.generateRegister(formType, input);
        return {
            formType: result.metadata.code,
            name: result.metadata.name,
            columnCount: result.metadata.columnCount,
            governingRule: result.metadata.governingRule,
            validation: result.validation,
            generatedAt: new Date().toISOString(),
        };
    }
    /**
     * Run payroll reconciliation for registers with financial totals (Form W, Form V)
     */
    static async reconcileRegister(formType, input) {
        const result = await this.generateRegister(formType, input);
        const validation = result.validation;
        return {
            formType: result.metadata.code,
            name: result.metadata.name,
            isReconciled: validation.reconciliation ? validation.reconciliation.isReconciled : validation.isValid,
            reconciliation: validation.reconciliation || null,
            issues: validation.issues,
            auditTimestamp: new Date().toISOString(),
        };
    }
}
exports.StatutoryFormRegistryService = StatutoryFormRegistryService;
