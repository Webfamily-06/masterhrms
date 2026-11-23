const fs = require('fs');
const path = require('path');

function searchAll(dir, patterns, results = []) {
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== '.next' && item !== 'dist') {
        searchAll(full, patterns, results);
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js') || item.endsWith('.json')) {
      const content = fs.readFileSync(full, 'utf8');
      for (const pat of patterns) {
        if (content.includes(pat)) {
          results.push({ file: full.replace(/\\/g, '/'), pattern: pat });
          break;
        }
      }
    }
  }
  return results;
}

const copilotRefs = searchAll('CMS/src', ['AICopilotWidget', 'ai-copilot', 'Copilot', 'ai-hub', 'ai-center']);
const tanstackCopilotRefs = searchAll('src', ['AICopilotWidget', 'ai-copilot', 'Copilot', 'ai-hub', 'ai-center']);

console.log('CMS references to Copilot/Hub:', copilotRefs.length);
console.log('TanStack references to Copilot/Hub:', tanstackCopilotRefs.length);
console.log('Sample CMS Copilot references:', copilotRefs);

fs.writeFileSync('scripts/ai_copilot_audit.json', JSON.stringify({ copilotRefs, tanstackCopilotRefs }, null, 2));
