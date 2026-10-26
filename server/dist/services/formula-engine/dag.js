"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaDAG = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const parser_1 = require("./parser");
const evaluator_1 = require("./evaluator");
class FormulaDAG {
    nodes = new Map();
    /**
     * Resolve scope cascading for formulas:
     * Order of precedence: employee -> structure -> client -> company -> state -> global
     */
    static resolveCascade(allFormulas, context) {
        const scopePriority = {
            employee: 6,
            structure: 5,
            client: 4,
            company: 3,
            state: 2,
            global: 1,
        };
        const resolvedMap = new Map();
        for (const f of allFormulas) {
            const upperCode = f.code.toUpperCase();
            let matchesScope = false;
            let priority = scopePriority[f.scope] || 0;
            switch (f.scope) {
                case 'employee':
                    if (context.employeeId && f.scopeId === context.employeeId)
                        matchesScope = true;
                    break;
                case 'structure':
                    if (context.salaryStructureId && f.scopeId === context.salaryStructureId)
                        matchesScope = true;
                    break;
                case 'client':
                    if (context.clientId && f.scopeId === context.clientId)
                        matchesScope = true;
                    break;
                case 'company':
                    if (context.tenantId && (f.scopeId === context.tenantId || !f.scopeId))
                        matchesScope = true;
                    break;
                case 'state':
                    if (context.stateCode && f.scopeId === context.stateCode)
                        matchesScope = true;
                    break;
                case 'global':
                    matchesScope = true;
                    break;
            }
            if (matchesScope) {
                const existing = resolvedMap.get(upperCode);
                if (!existing || priority > existing.priority) {
                    resolvedMap.set(upperCode, { formula: f, priority });
                }
            }
        }
        return Array.from(resolvedMap.values()).map((item) => item.formula);
    }
    /**
     * Add a formula to the DAG
     */
    addFormula(formula) {
        const upperCode = formula.code.toUpperCase();
        const { ast, dependencies } = parser_1.Parser.parse(formula.expression);
        this.nodes.set(upperCode, {
            definition: formula,
            ast,
            dependencies: dependencies.map((d) => d.toUpperCase()),
        });
    }
    /**
     * Build the execution order using topological sort and detect cycles
     */
    getExecutionOrder() {
        const visited = new Map();
        const order = [];
        const recursionStack = [];
        const visit = (nodeCode) => {
            const state = visited.get(nodeCode);
            if (state === 'VISITING') {
                const cycleStartIndex = recursionStack.indexOf(nodeCode);
                const cyclePath = [...recursionStack.slice(cycleStartIndex), nodeCode].join(' -> ');
                throw new Error(`Circular formula dependency detected: ${cyclePath}`);
            }
            if (state === 'VISITED')
                return;
            visited.set(nodeCode, 'VISITING');
            recursionStack.push(nodeCode);
            const node = this.nodes.get(nodeCode);
            if (node) {
                for (const dep of node.dependencies) {
                    // Only recursively visit dependencies that are themselves formulas in the DAG
                    if (this.nodes.has(dep)) {
                        visit(dep);
                    }
                }
            }
            recursionStack.pop();
            visited.set(nodeCode, 'VISITED');
            order.push(nodeCode);
        };
        for (const code of this.nodes.keys()) {
            if (!visited.has(code)) {
                visit(code);
            }
        }
        return order;
    }
    /**
     * Execute the full DAG with the provided initial variables and return results and audit traces
     */
    execute(initialVariables) {
        const executionOrder = this.getExecutionOrder();
        const context = { ...initialVariables };
        const results = {};
        const formattedResults = {};
        const traces = [];
        // Track provenance of variables
        const variableSources = {};
        for (const k of Object.keys(initialVariables)) {
            variableSources[k.toUpperCase()] = 'INPUT_CONTEXT';
        }
        for (const code of executionOrder) {
            const node = this.nodes.get(code);
            if (!node)
                continue;
            // Extract resolved inputs for this node
            const resolvedInputs = {};
            for (const dep of node.dependencies) {
                const val = context[dep];
                resolvedInputs[dep] = {
                    value: val instanceof decimal_js_1.default ? val.toNumber() : val !== undefined ? val : 0,
                    source: variableSources[dep] || 'UNKNOWN',
                };
            }
            // Evaluate node
            const evaluator = new evaluator_1.Evaluator(context);
            const { result, steps } = evaluator.evaluate(node.ast);
            // Apply rounding
            const decimals = node.definition.roundingDecimals ?? 2;
            let finalRounded;
            if (node.definition.roundingMode === 'CEIL') {
                finalRounded = result.ceil();
            }
            else if (node.definition.roundingMode === 'FLOOR') {
                finalRounded = result.floor();
            }
            else {
                finalRounded = result.toDecimalPlaces(decimals, decimal_js_1.default.ROUND_HALF_UP);
            }
            // Store in context for downstream dependencies
            context[code] = finalRounded;
            variableSources[code] = `FORMULA_${node.definition.scope.toUpperCase()}`;
            results[code] = finalRounded;
            formattedResults[code] = finalRounded.toFixed(2);
            // Record audit trace
            traces.push({
                formulaCode: code,
                formulaExpression: node.definition.expression,
                scope: node.definition.scope,
                scopeId: node.definition.scopeId,
                resolvedInputs,
                steps,
                finalValue: finalRounded.toFixed(2),
                finalDecimal: finalRounded,
                calculatedAt: new Date().toISOString(),
            });
        }
        return {
            results,
            formattedResults,
            traces,
        };
    }
}
exports.FormulaDAG = FormulaDAG;
