"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Evaluator = void 0;
exports.evaluateFormula = evaluateFormula;
const decimal_js_1 = __importDefault(require("decimal.js"));
const parser_1 = require("./parser");
// Configure high-precision Decimal.js with standard half-up rounding
decimal_js_1.default.set({ precision: 20, rounding: decimal_js_1.default.ROUND_HALF_UP });
class Evaluator {
    variables;
    steps = [];
    constructor(variables) {
        this.variables = new Map();
        for (const [key, val] of Object.entries(variables)) {
            if (val instanceof decimal_js_1.default) {
                this.variables.set(key.toUpperCase(), val);
            }
            else if (typeof val === 'number') {
                this.variables.set(key.toUpperCase(), new decimal_js_1.default(val));
            }
            else if (typeof val === 'string') {
                // If string can be cleanly parsed as number, store Decimal or string
                const num = Number(val);
                if (!isNaN(num) && val.trim() !== '') {
                    this.variables.set(key.toUpperCase(), new decimal_js_1.default(val));
                }
                else {
                    this.variables.set(key.toUpperCase(), val);
                }
            }
            else {
                this.variables.set(key.toUpperCase(), val);
            }
        }
    }
    evaluate(ast) {
        this.steps = [];
        const rawResult = this.evaluateNode(ast);
        const resultDecimal = this.toDecimal(rawResult);
        return {
            result: resultDecimal,
            steps: this.steps,
        };
    }
    evaluateNode(node) {
        switch (node.type) {
            case 'NumberLiteral':
                return node.value;
            case 'StringLiteral':
                return node.value;
            case 'BooleanLiteral':
                return node.value;
            case 'Identifier': {
                const key = node.name.toUpperCase();
                if (!this.variables.has(key)) {
                    // Default undefined identifiers to 0 for numbers, empty for strings
                    return new decimal_js_1.default(0);
                }
                const val = this.variables.get(key);
                return val;
            }
            case 'UnaryOp': {
                const arg = this.evaluateNode(node.argument);
                if (node.operator === '-') {
                    const dec = this.toDecimal(arg);
                    const res = dec.negated();
                    this.steps.push({ nodeType: 'UnaryOp', expression: `-${arg}`, result: res });
                    return res;
                }
                if (node.operator === 'NOT') {
                    const b = Boolean(arg instanceof decimal_js_1.default ? !arg.isZero() : arg);
                    const res = !b;
                    this.steps.push({ nodeType: 'UnaryOp', expression: `NOT ${b}`, result: res });
                    return res;
                }
                throw new Error(`Unsupported unary operator: ${node.operator}`);
            }
            case 'BinaryOp': {
                // Handle short-circuiting for logical operators
                if (node.operator === 'AND') {
                    const leftVal = this.evaluateNode(node.left);
                    const leftBool = this.toBoolean(leftVal);
                    if (!leftBool) {
                        this.steps.push({ nodeType: 'BinaryOp', expression: `${leftBool} AND ...`, result: false });
                        return false;
                    }
                    const rightVal = this.evaluateNode(node.right);
                    const rightBool = this.toBoolean(rightVal);
                    const res = leftBool && rightBool;
                    this.steps.push({ nodeType: 'BinaryOp', expression: `${leftBool} AND ${rightBool}`, result: res });
                    return res;
                }
                if (node.operator === 'OR') {
                    const leftVal = this.evaluateNode(node.left);
                    const leftBool = this.toBoolean(leftVal);
                    if (leftBool) {
                        this.steps.push({ nodeType: 'BinaryOp', expression: `${leftBool} OR ...`, result: true });
                        return true;
                    }
                    const rightVal = this.evaluateNode(node.right);
                    const rightBool = this.toBoolean(rightVal);
                    const res = leftBool || rightBool;
                    this.steps.push({ nodeType: 'BinaryOp', expression: `${leftBool} OR ${rightBool}`, result: res });
                    return res;
                }
                const left = this.evaluateNode(node.left);
                const right = this.evaluateNode(node.right);
                // String comparison / concatenation
                if (typeof left === 'string' || typeof right === 'string') {
                    if (node.operator === '+') {
                        return String(left) + String(right);
                    }
                    if (node.operator === '==') {
                        return String(left) === String(right);
                    }
                    if (node.operator === '!=') {
                        return String(left) !== String(right);
                    }
                }
                // Numeric / Comparison
                const leftDec = this.toDecimal(left);
                const rightDec = this.toDecimal(right);
                let opResult;
                switch (node.operator) {
                    case '+':
                        opResult = leftDec.plus(rightDec);
                        break;
                    case '-':
                        opResult = leftDec.minus(rightDec);
                        break;
                    case '*':
                        opResult = leftDec.times(rightDec);
                        break;
                    case '/':
                        // Division by zero guard: returns 0 safely
                        opResult = rightDec.isZero() ? new decimal_js_1.default(0) : leftDec.dividedBy(rightDec);
                        break;
                    case '%':
                        opResult = rightDec.isZero() ? new decimal_js_1.default(0) : leftDec.modulo(rightDec);
                        break;
                    case '^':
                        opResult = leftDec.pow(rightDec);
                        break;
                    case '==':
                        opResult = leftDec.equals(rightDec);
                        break;
                    case '!=':
                        opResult = !leftDec.equals(rightDec);
                        break;
                    case '<':
                        opResult = leftDec.lessThan(rightDec);
                        break;
                    case '>':
                        opResult = leftDec.greaterThan(rightDec);
                        break;
                    case '<=':
                        opResult = leftDec.lessThanOrEqualTo(rightDec);
                        break;
                    case '>=':
                        opResult = leftDec.greaterThanOrEqualTo(rightDec);
                        break;
                    default:
                        throw new Error(`Unsupported binary operator: ${node.operator}`);
                }
                this.steps.push({
                    nodeType: 'BinaryOp',
                    expression: `${leftDec.toString()} ${node.operator} ${rightDec.toString()}`,
                    result: opResult,
                });
                return opResult;
            }
            case 'FunctionCall':
                return this.evaluateFunction(node.functionName, node.args);
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }
    evaluateFunction(name, args) {
        const fnName = name.toUpperCase();
        // IF(condition, thenExpr, elseExpr)
        if (fnName === 'IF') {
            if (args.length < 2 || args.length > 3) {
                throw new Error(`IF function expects 2 or 3 arguments, got ${args.length}`);
            }
            const conditionVal = this.evaluateNode(args[0]);
            const condition = this.toBoolean(conditionVal);
            if (condition) {
                return this.evaluateNode(args[1]);
            }
            else if (args.length === 3) {
                return this.evaluateNode(args[2]);
            }
            else {
                return new decimal_js_1.default(0);
            }
        }
        // MIN(...args)
        if (fnName === 'MIN') {
            if (args.length === 0)
                throw new Error('MIN function requires at least one argument');
            let minVal = null;
            for (const argNode of args) {
                const val = this.toDecimal(this.evaluateNode(argNode));
                if (minVal === null || val.lessThan(minVal)) {
                    minVal = val;
                }
            }
            return minVal || new decimal_js_1.default(0);
        }
        // MAX(...args)
        if (fnName === 'MAX') {
            if (args.length === 0)
                throw new Error('MAX function requires at least one argument');
            let maxVal = null;
            for (const argNode of args) {
                const val = this.toDecimal(this.evaluateNode(argNode));
                if (maxVal === null || val.greaterThan(maxVal)) {
                    maxVal = val;
                }
            }
            return maxVal || new decimal_js_1.default(0);
        }
        // ROUND(val, decimals = 0)
        if (fnName === 'ROUND') {
            if (args.length === 0)
                throw new Error('ROUND requires value argument');
            const val = this.toDecimal(this.evaluateNode(args[0]));
            const decimals = args.length > 1 ? this.toDecimal(this.evaluateNode(args[1])).toNumber() : 0;
            return val.toDecimalPlaces(decimals, decimal_js_1.default.ROUND_HALF_UP);
        }
        // CEIL(val)
        if (fnName === 'CEIL' || fnName === 'CEILING') {
            if (args.length === 0)
                throw new Error('CEIL requires value argument');
            const val = this.toDecimal(this.evaluateNode(args[0]));
            return val.ceil();
        }
        // FLOOR(val)
        if (fnName === 'FLOOR') {
            if (args.length === 0)
                throw new Error('FLOOR requires value argument');
            const val = this.toDecimal(this.evaluateNode(args[0]));
            return val.floor();
        }
        // ABS(val)
        if (fnName === 'ABS') {
            if (args.length === 0)
                throw new Error('ABS requires value argument');
            const val = this.toDecimal(this.evaluateNode(args[0]));
            return val.abs();
        }
        // SLAB(slabsData, value)
        if (fnName === 'SLAB') {
            if (args.length < 2)
                throw new Error('SLAB function requires slabs definition and value');
            const slabsRef = this.evaluateNode(args[0]);
            const value = this.toDecimal(this.evaluateNode(args[1]));
            let slabs = [];
            if (Array.isArray(slabsRef)) {
                slabs = slabsRef;
            }
            else if (typeof slabsRef === 'string') {
                try {
                    slabs = JSON.parse(slabsRef);
                }
                catch {
                    slabs = [];
                }
            }
            // Find matching slab
            for (const slab of slabs) {
                const min = new decimal_js_1.default(slab.min ?? 0);
                const max = slab.max !== null && slab.max !== undefined ? new decimal_js_1.default(slab.max) : null;
                const rawAmount = slab.tax ?? slab.amount ?? slab.rate ?? 0;
                const amount = new decimal_js_1.default(rawAmount);
                const meetsMin = value.greaterThanOrEqualTo(min);
                const meetsMax = max === null || value.lessThanOrEqualTo(max);
                if (meetsMin && meetsMax) {
                    return amount;
                }
            }
            return new decimal_js_1.default(0);
        }
        // COALESCE(...args)
        if (fnName === 'COALESCE') {
            for (const argNode of args) {
                const val = this.evaluateNode(argNode);
                if (val !== null && val !== undefined) {
                    if (val instanceof decimal_js_1.default && !val.isZero())
                        return val;
                    if (typeof val === 'number' && val !== 0)
                        return new decimal_js_1.default(val);
                    if (typeof val === 'string' && val.trim() !== '')
                        return val;
                }
            }
            return new decimal_js_1.default(0);
        }
        throw new Error(`Unknown function: ${fnName}`);
    }
    toDecimal(val) {
        if (val instanceof decimal_js_1.default)
            return val;
        if (typeof val === 'number')
            return new decimal_js_1.default(val);
        if (typeof val === 'boolean')
            return new decimal_js_1.default(val ? 1 : 0);
        if (typeof val === 'string') {
            const num = Number(val);
            if (!isNaN(num))
                return new decimal_js_1.default(num);
        }
        return new decimal_js_1.default(0);
    }
    toBoolean(val) {
        if (typeof val === 'boolean')
            return val;
        if (val instanceof decimal_js_1.default)
            return !val.isZero();
        if (typeof val === 'number')
            return val !== 0;
        if (typeof val === 'string') {
            const lower = val.toLowerCase().trim();
            return lower === 'true' || lower === '1' || lower === 'yes';
        }
        return Boolean(val);
    }
}
exports.Evaluator = Evaluator;
/**
 * Convenient helper to parse and evaluate formula string against variable context
 */
function evaluateFormula(formula, context) {
    const { ast } = parser_1.Parser.parse(formula);
    const evaluator = new Evaluator(context);
    const { result } = evaluator.evaluate(ast);
    return result.toNumber();
}
