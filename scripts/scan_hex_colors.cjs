const fs = require('fs');
const path = require('path');

const hexMap = {
  // Primary brand blues/indigos
  '#6366f1': 'var(--primary)',
  '#4f46e5': 'var(--primary)',
  '#3b82f6': 'var(--primary)',
  '#2563eb': 'var(--primary)',
  '#1d4ed8': 'var(--primary)',

  // Surface and dark backgrounds
  '#ffffff': 'hsl(var(--card))',
  '#0f172a': 'hsl(var(--card))',
  '#1e293b': 'hsl(var(--card))',
  '#111827': 'hsl(var(--foreground))',
  '#000000': 'hsl(var(--foreground))',
  
  // Destructive reds
  '#ef4444': 'hsl(var(--destructive))',
  '#dc2626': 'hsl(var(--destructive))',
  '#b91c1c': 'hsl(var(--destructive))',

  // Success greens
  '#10b981': 'hsl(var(--success, 142 71% 45%))',
  '#16a34a': 'hsl(var(--success, 142 71% 45%))',
  '#059669': 'hsl(var(--success, 142 71% 45%))',

  // Warning ambers
  '#f59e0b': 'hsl(var(--warning, 38 92% 50%))',
  '#d97706': 'hsl(var(--warning, 38 92% 50%))',

  // Borders & subtle muted
  '#e2e8f0': 'hsl(var(--border))',
  '#e5e7eb': 'hsl(var(--border))',
  '#f1f5f9': 'hsl(var(--muted))',
  '#f3f4f6': 'hsl(var(--muted))',
  '#64748b': 'hsl(var(--muted-foreground))',
  '#6b7280': 'hsl(var(--muted-foreground))',
  '#94a3b8': 'hsl(var(--muted-foreground))',
  '#9ca3af': 'hsl(var(--muted-foreground))',
};

let filesChecked = 0;
let occurrences = 0;

function scanDir(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', '.git', '.next'].includes(item.name)) {
      scanDir(full);
    } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) {
      filesChecked++;
      const code = fs.readFileSync(full, 'utf8');
      const matches = code.match(/#[0-9a-fA-F]{6}\b/g);
      if (matches) {
        occurrences += matches.length;
      }
    }
  }
}

scanDir('src');
console.log(`Files checked: ${filesChecked}, Hex occurrences found: ${occurrences}`);

