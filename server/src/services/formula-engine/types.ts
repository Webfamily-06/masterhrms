import Decimal from 'decimal.js';

export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'MODULO'
  | 'POWER'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'GT'
  | 'LTE'
  | 'GTE'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export type ASTNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | IdentifierNode
  | BinaryOpNode
  | UnaryOpNode
  | FunctionCallNode;

export interface NumberLiteralNode {
  type: 'NumberLiteral';
  value: Decimal;
}

export interface StringLiteralNode {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteralNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: '+' | '-' | '*' | '/' | '%' | '^' | '==' | '!=' | '<' | '>' | '<=' | '>=' | 'AND' | 'OR';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  operator: '-' | 'NOT';
  argument: ASTNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  functionName: string;
  args: ASTNode[];
}

export interface FormulaDefinition {
  id?: string;
  code: string;
  name: string;
  expression: string;
  category?: 'earning' | 'deduction' | 'employer_contribution' | 'statutory' | 'billing' | 'custom';
  type?: string;
  scope: 'global' | 'state' | 'company' | 'client' | 'structure' | 'employee';
  scopeId?: string | null;
  stateCode?: string | null;
  clientId?: string | null;
  structureId?: string | null;
  version?: number;
  rounding?: 'round_nearest' | 'round_up' | 'round_down' | 'exact_2dec';
  roundingDecimals?: number;
  roundingMode?: 'HALF_UP' | 'CEIL' | 'FLOOR';
}

export interface EvaluationStep {
  nodeType: string;
  expression: string;
  result: Decimal | string | boolean;
}

export interface CellExecutionTrace {
  formulaCode: string;
  formulaExpression: string;
  scope: string;
  scopeId?: string | null;
  resolvedInputs: Record<string, { value: string | number; source: string }>;
  steps: EvaluationStep[];
  finalValue: string; // Formatted 2 decimals
  finalDecimal: Decimal;
  calculatedAt: string;
}

export interface SlabRule {
  min: number | Decimal;
  max: number | Decimal | null; // null represents infinity
  amount?: number | Decimal;
  tax?: number | Decimal;
  rate?: number | Decimal;
}
