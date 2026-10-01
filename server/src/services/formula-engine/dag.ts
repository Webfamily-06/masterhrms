import Decimal from 'decimal.js';
import { ASTNode, CellExecutionTrace, FormulaDefinition } from './types';
import { Parser } from './parser';
import { Evaluator } from './evaluator';

export interface DAGNode {
  definition: FormulaDefinition;
  ast: ASTNode;
  dependencies: string[];
}

export interface DAGExecutionResult {
  results: Record<string, Decimal>;
  formattedResults: Record<string, string>;
  traces: CellExecutionTrace[];
}

export class FormulaDAG {
  private nodes: Map<string, DAGNode> = new Map();

  /**
   * Resolve scope cascading for formulas:
   * Order of precedence: employee -> structure -> client -> company -> state -> global
   */
  static resolveCascade(allFormulas: FormulaDefinition[], context: {
    employeeId?: string;
    salaryStructureId?: string;
    clientId?: string;
    tenantId?: string;
    stateCode?: string;
  }): FormulaDefinition[] {
    const scopePriority: Record<string, number> = {
      employee: 6,
      structure: 5,
      client: 4,
      company: 3,
      state: 2,
      global: 1,
    };

    const resolvedMap = new Map<string, { formula: FormulaDefinition; priority: number }>();

    for (const f of allFormulas) {
      const upperCode = f.code.toUpperCase();
      let matchesScope = false;
      let priority = scopePriority[f.scope] || 0;

      switch (f.scope) {
        case 'employee':
          if (context.employeeId && f.scopeId === context.employeeId) matchesScope = true;
          break;
        case 'structure':
          if (context.salaryStructureId && f.scopeId === context.salaryStructureId) matchesScope = true;
          break;
        case 'client':
          if (context.clientId && f.scopeId === context.clientId) matchesScope = true;
          break;
        case 'company':
          if (context.tenantId && (f.scopeId === context.tenantId || !f.scopeId)) matchesScope = true;
          break;
        case 'state':
          if (context.stateCode && f.scopeId === context.stateCode) matchesScope = true;
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
  addFormula(formula: FormulaDefinition): void {
    const upperCode = formula.code.toUpperCase();
    const { ast, dependencies } = Parser.parse(formula.expression);
    this.nodes.set(upperCode, {
      definition: formula,
      ast,
      dependencies: dependencies.map((d) => d.toUpperCase()),
    });
  }

  /**
   * Build the execution order using topological sort and detect cycles
   */
  getExecutionOrder(): string[] {
    const visited = new Map<string, 'VISITING' | 'VISITED'>();
    const order: string[] = [];
    const recursionStack: string[] = [];

    const visit = (nodeCode: string) => {
      const state = visited.get(nodeCode);
      if (state === 'VISITING') {
        const cycleStartIndex = recursionStack.indexOf(nodeCode);
        const cyclePath = [...recursionStack.slice(cycleStartIndex), nodeCode].join(' -> ');
        throw new Error(`Circular formula dependency detected: ${cyclePath}`);
      }
      if (state === 'VISITED') return;

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
  execute(initialVariables: Record<string, any>): DAGExecutionResult {
    const executionOrder = this.getExecutionOrder();
    const context: Record<string, any> = { ...initialVariables };
    const results: Record<string, Decimal> = {};
    const formattedResults: Record<string, string> = {};
    const traces: CellExecutionTrace[] = [];

    // Track provenance of variables
    const variableSources: Record<string, string> = {};
    for (const k of Object.keys(initialVariables)) {
      variableSources[k.toUpperCase()] = 'INPUT_CONTEXT';
    }

    for (const code of executionOrder) {
      const node = this.nodes.get(code);
      if (!node) continue;

      // Extract resolved inputs for this node
      const resolvedInputs: Record<string, { value: string | number; source: string }> = {};
      for (const dep of node.dependencies) {
        const val = context[dep];
        resolvedInputs[dep] = {
          value: val instanceof Decimal ? val.toNumber() : val !== undefined ? val : 0,
          source: variableSources[dep] || 'UNKNOWN',
        };
      }

      // Evaluate node
      const evaluator = new Evaluator(context);
      const { result, steps } = evaluator.evaluate(node.ast);

      // Apply rounding
      const decimals = node.definition.roundingDecimals ?? 2;
      let finalRounded: Decimal;
      if (node.definition.roundingMode === 'CEIL') {
        finalRounded = result.ceil();
      } else if (node.definition.roundingMode === 'FLOOR') {
        finalRounded = result.floor();
      } else {
        finalRounded = result.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
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
