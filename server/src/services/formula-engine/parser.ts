import Decimal from 'decimal.js';
import { ASTNode, Token, TokenType } from './types';
import { Lexer } from './lexer';

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  static parse(expression: string): { ast: ASTNode; dependencies: string[] } {
    const lexer = new Lexer(expression);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parseExpression();

    if (!parser.isAtEnd()) {
      const remaining = parser.peek();
      throw new Error(`Unexpected token '${remaining.value}' at position ${remaining.position}`);
    }

    const dependencies = parser.extractDependencies(ast);
    return { ast, dependencies };
  }

  parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();

    while (this.match('OR')) {
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryOp',
        operator: 'OR',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();

    while (this.match('AND')) {
      const right = this.parseEquality();
      expr = {
        type: 'BinaryOp',
        operator: 'AND',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison();

    while (this.check('EQ') || this.check('NEQ')) {
      const opToken = this.advance();
      const operator = opToken.type === 'EQ' ? '==' : '!=';
      const right = this.parseComparison();
      expr = {
        type: 'BinaryOp',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseAdditive();

    while (this.check('LT') || this.check('GT') || this.check('LTE') || this.check('GTE')) {
      const opToken = this.advance();
      let operator: '<' | '>' | '<=' | '>=';
      switch (opToken.type) {
        case 'LT':
          operator = '<';
          break;
        case 'GT':
          operator = '>';
          break;
        case 'LTE':
          operator = '<=';
          break;
        case 'GTE':
          operator = '>=';
          break;
        default:
          throw new Error(`Unexpected operator ${opToken.value}`);
      }
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryOp',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();

    while (this.check('PLUS') || this.check('MINUS')) {
      const opToken = this.advance();
      const operator = opToken.type === 'PLUS' ? '+' : '-';
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryOp',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseMultiplicative(): ASTNode {
    let expr = this.parsePower();

    while (this.check('MULTIPLY') || this.check('DIVIDE') || this.check('MODULO')) {
      const opToken = this.advance();
      let operator: '*' | '/' | '%';
      if (opToken.type === 'MULTIPLY') operator = '*';
      else if (opToken.type === 'DIVIDE') operator = '/';
      else operator = '%';

      const right = this.parsePower();
      expr = {
        type: 'BinaryOp',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parsePower(): ASTNode {
    let expr = this.parseUnary();

    while (this.match('POWER')) {
      const right = this.parseUnary();
      expr = {
        type: 'BinaryOp',
        operator: '^',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseUnary(): ASTNode {
    if (this.check('MINUS')) {
      this.advance();
      const argument = this.parseUnary();
      return {
        type: 'UnaryOp',
        operator: '-',
        argument,
      };
    }

    if (this.check('NOT')) {
      this.advance();
      const argument = this.parseUnary();
      return {
        type: 'UnaryOp',
        operator: 'NOT',
        argument,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    // Number
    if (this.check('NUMBER')) {
      const token = this.advance();
      return {
        type: 'NumberLiteral',
        value: new Decimal(token.value),
      };
    }

    // String
    if (this.check('STRING')) {
      const token = this.advance();
      return {
        type: 'StringLiteral',
        value: token.value,
      };
    }

    // Grouping / Parentheses
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', "Expected ')' after expression");
      return expr;
    }

    // Identifier or Function Call
    if (this.check('IDENTIFIER')) {
      const token = this.advance();
      const upper = token.value.toUpperCase();

      // Check if boolean literal
      if (upper === 'TRUE') {
        return { type: 'BooleanLiteral', value: true };
      }
      if (upper === 'FALSE') {
        return { type: 'BooleanLiteral', value: false };
      }

      // Check if function call
      if (this.match('LPAREN')) {
        const args: ASTNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', `Expected ')' after function arguments for ${token.value}`);
        return {
          type: 'FunctionCall',
          functionName: upper,
          args,
        };
      }

      // Otherwise variable identifier
      return {
        type: 'Identifier',
        name: token.value,
      };
    }

    const currentToken = this.peek();
    throw new Error(`Unexpected token '${currentToken.value || currentToken.type}' at position ${currentToken.position}`);
  }

  private extractDependencies(node: ASTNode): string[] {
    const deps = new Set<string>();

    const traverse = (n: ASTNode) => {
      switch (n.type) {
        case 'Identifier':
          deps.add(n.name);
          break;
        case 'BinaryOp':
          traverse(n.left);
          traverse(n.right);
          break;
        case 'UnaryOp':
          traverse(n.argument);
          break;
        case 'FunctionCall':
          for (const arg of n.args) {
            traverse(arg);
          }
          break;
        case 'NumberLiteral':
        case 'StringLiteral':
        case 'BooleanLiteral':
          break;
      }
    };

    traverse(node);
    return Array.from(deps);
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`${errorMessage} at position ${token.position}`);
  }
}
