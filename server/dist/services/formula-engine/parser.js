"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const lexer_1 = require("./lexer");
class Parser {
    tokens;
    current = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    static parse(expression) {
        const lexer = new lexer_1.Lexer(expression);
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
    parseExpression() {
        return this.parseLogicalOr();
    }
    parseLogicalOr() {
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
    parseLogicalAnd() {
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
    parseEquality() {
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
    parseComparison() {
        let expr = this.parseAdditive();
        while (this.check('LT') || this.check('GT') || this.check('LTE') || this.check('GTE')) {
            const opToken = this.advance();
            let operator;
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
    parseAdditive() {
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
    parseMultiplicative() {
        let expr = this.parsePower();
        while (this.check('MULTIPLY') || this.check('DIVIDE') || this.check('MODULO')) {
            const opToken = this.advance();
            let operator;
            if (opToken.type === 'MULTIPLY')
                operator = '*';
            else if (opToken.type === 'DIVIDE')
                operator = '/';
            else
                operator = '%';
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
    parsePower() {
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
    parseUnary() {
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
    parsePrimary() {
        // Number
        if (this.check('NUMBER')) {
            const token = this.advance();
            return {
                type: 'NumberLiteral',
                value: new decimal_js_1.default(token.value),
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
                const args = [];
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
    extractDependencies(node) {
        const deps = new Set();
        const traverse = (n) => {
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
    match(type) {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.peek().type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    isAtEnd() {
        return this.peek().type === 'EOF';
    }
    peek() {
        return this.tokens[this.current];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
    consume(type, errorMessage) {
        if (this.check(type))
            return this.advance();
        const token = this.peek();
        throw new Error(`${errorMessage} at position ${token.position}`);
    }
}
exports.Parser = Parser;
