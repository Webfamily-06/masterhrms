const fs = require('fs');
const file = 'src/components/ui/select.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = 'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm';
const replacement = 'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-sm';

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully harmonized SelectTrigger font size to text-base md:text-sm');
} else {
  console.error('Target not found in select.tsx');
  process.exit(1);
}

