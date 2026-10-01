import { Token, TokenType } from './types';

export class Lexer {
  private input: string;
  private pos = 0;
  private length: number;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.length) {
      const char = this.input[this.pos];

      // Whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.peek(1)))) {
        tokens.push(this.readNumber());
        continue;
      }

      // Strings (single or double quotes)
      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      // Identifiers / Keywords
      if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      // Multi-character operators
      const twoChar = this.input.substring(this.pos, this.pos + 2);
      if (twoChar === '==') {
        tokens.push({ type: 'EQ', value: '==', position: this.pos });
        this.pos += 2;
        continue;
      }
      if (twoChar === '!=') {
        tokens.push({ type: 'NEQ', value: '!=', position: this.pos });
        this.pos += 2;
        continue;
      }
      if (twoChar === '<=') {
        tokens.push({ type: 'LTE', value: '<=', position: this.pos });
        this.pos += 2;
        continue;
      }
      if (twoChar === '>=') {
        tokens.push({ type: 'GTE', value: '>=', position: this.pos });
        this.pos += 2;
        continue;
      }
      if (twoChar === '&&') {
        tokens.push({ type: 'AND', value: 'AND', position: this.pos });
        this.pos += 2;
        continue;
      }
      if (twoChar === '||') {
        tokens.push({ type: 'OR', value: 'OR', position: this.pos });
        this.pos += 2;
        continue;
      }

      // Single-character operators
      switch (char) {
        case '+':
          tokens.push({ type: 'PLUS', value: '+', position: this.pos });
          break;
        case '-':
          tokens.push({ type: 'MINUS', value: '-', position: this.pos });
          break;
        case '*':
          tokens.push({ type: 'MULTIPLY', value: '*', position: this.pos });
          break;
        case '/':
          tokens.push({ type: 'DIVIDE', value: '/', position: this.pos });
          break;
        case '%':
          tokens.push({ type: 'MODULO', value: '%', position: this.pos });
          break;
        case '^':
          tokens.push({ type: 'POWER', value: '^', position: this.pos });
          break;
        case '(':
          tokens.push({ type: 'LPAREN', value: '(', position: this.pos });
          break;
        case ')':
          tokens.push({ type: 'RPAREN', value: ')', position: this.pos });
          break;
        case ',':
          tokens.push({ type: 'COMMA', value: ',', position: this.pos });
          break;
        case '<':
          tokens.push({ type: 'LT', value: '<', position: this.pos });
          break;
        case '>':
          tokens.push({ type: 'GT', value: '>', position: this.pos });
          break;
        case '!':
          tokens.push({ type: 'NOT', value: 'NOT', position: this.pos });
          break;
        default:
          throw new Error(`Unexpected character '${char}' at position ${this.pos} in expression: "${this.input}"`);
      }
      this.pos++;
    }

    tokens.push({ type: 'EOF', value: '', position: this.pos });
    return tokens;
  }

  private peek(offset = 0): string {
    const target = this.pos + offset;
    return target < this.length ? this.input[target] : '';
  }

  private readNumber(): Token {
    const start = this.pos;
    let hasDot = false;

    while (this.pos < this.length) {
      const char = this.input[this.pos];
      if (char === '.') {
        if (hasDot) break;
        hasDot = true;
        this.pos++;
      } else if (/[0-9]/.test(char)) {
        this.pos++;
      } else {
        break;
      }
    }

    return {
      type: 'NUMBER',
      value: this.input.substring(start, this.pos),
      position: start,
    };
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.pos++; // skip opening quote
    let str = '';

    while (this.pos < this.length) {
      const char = this.input[this.pos];
      if (char === '\\') {
        this.pos++;
        if (this.pos < this.length) {
          str += this.input[this.pos];
          this.pos++;
        }
      } else if (char === quote) {
        this.pos++; // skip closing quote
        return {
          type: 'STRING',
          value: str,
          position: start,
        };
      } else {
        str += char;
        this.pos++;
      }
    }

    throw new Error(`Unterminated string literal starting at position ${start}`);
  }

  private readIdentifier(): Token {
    const start = this.pos;
    while (this.pos < this.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      this.pos++;
    }

    const value = this.input.substring(start, this.pos);
    const upper = value.toUpperCase();

    if (upper === 'AND') return { type: 'AND', value: 'AND', position: start };
    if (upper === 'OR') return { type: 'OR', value: 'OR', position: start };
    if (upper === 'NOT') return { type: 'NOT', value: 'NOT', position: start };

    return {
      type: 'IDENTIFIER',
      value,
      position: start,
    };
  }
}
