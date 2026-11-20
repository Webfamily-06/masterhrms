const fs = require('fs');
const path = 'C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\a709a1e5-0746-4c39-abba-90ee5cec6733\\.system_generated\\steps\\6016\\output.txt';

const raw = fs.readFileSync(path, 'utf8');
const jsonStr = raw.replace(/^### Result\s*\n/, '');
const data = JSON.parse(jsonStr);

console.log('Component:', data.component);
console.log('Props keys:', Object.keys(data.props));

// Inspect form-specific props
for (const k of Object.keys(data.props)) {
  if (k !== 'auth' && k !== 'adminAllSetting' && k !== 'companyAllSetting' && k !== 'packages' && k !== 'currencies' && k !== 'availableLanguages') {
    const val = data.props[k];
    console.log(`Prop '${k}':`, Array.isArray(val) ? `Array(${val.length}) -> ` + JSON.stringify(val.slice(0, 3)) : typeof val === 'object' ? JSON.stringify(val) : val);
  }
}
