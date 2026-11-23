const fs = require('fs');

const code = fs.readFileSync('CMS/src/app/(workspace)/employee-dashboard/page.tsx', 'utf8');

// Parse tags
const tagRegex = /<\/?([a-zA-Z0-9_-]+)([^>]*?)>/g;
const stack = [];
let m;

while ((m = tagRegex.exec(code)) !== null) {
  const full = m[0];
  const tag = m[1];
  const rest = m[2];
  
  // ignore self-closing
  if (full.endsWith('/>') || tag === 'img' || tag === 'input' || tag === 'hr' || tag === 'br') {
    continue;
  }
  
  if (full.startsWith('</')) {
    const last = stack.pop();
    if (last !== tag) {
      console.log(`Mismatch! Expected </${last}>, but found </${tag}> at pos ${m.index}`);
      // Find line number
      const lineNum = code.slice(0, m.index).split('\n').length;
      console.log(`Line ${lineNum}: ${full}`);
      break;
    }
  } else {
    stack.push(tag);
  }
}

console.log('Remaining unclosed tags:', stack);
