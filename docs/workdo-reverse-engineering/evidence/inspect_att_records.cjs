const fs = require('fs');
const path = 'C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\a709a1e5-0746-4c39-abba-90ee5cec6733\\.system_generated\\steps\\6034\\output.txt';

const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw.replace(/^### Result\s*\n/, ''));

console.log('Attendances keys:', Object.keys(data.props.attendances));
console.log('Sample attendances:', JSON.stringify(data.props.attendances, null, 2).slice(0, 1500));
