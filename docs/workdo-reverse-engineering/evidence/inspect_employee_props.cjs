const fs = require('fs');
const path = 'C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\a709a1e5-0746-4c39-abba-90ee5cec6733\\.system_generated\\steps\\5976\\output.txt';

const raw = fs.readFileSync(path, 'utf8');
// Strip the leading "### Result\n"
const jsonStr = raw.replace(/^### Result\s*\n/, '');
const data = JSON.parse(jsonStr);

console.log('Component:', data.component);
console.log('Props keys:', Object.keys(data.props));

if (data.props.employees) {
  console.log('Employees keys:', Object.keys(data.props.employees));
  console.log('Total employees:', data.props.employees.total);
  if (data.props.employees.data && data.props.employees.data.length > 0) {
    console.log('Employee schema (1st record fields):', Object.keys(data.props.employees.data[0]));
    console.log('Employee 1 data:', JSON.stringify(data.props.employees.data[0], null, 2));
  }
}

// Check other props like branches, departments, designations
for (const k of Object.keys(data.props)) {
  if (k !== 'auth' && k !== 'employees') {
    console.log(`Prop '${k}':`, Array.isArray(data.props[k]) ? `Array(${data.props[k].length})` : typeof data.props[k]);
  }
}
