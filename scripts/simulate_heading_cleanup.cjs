const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.next', 'dist', 'public', '.git', 'build'].includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) walk(filePath, fileList);
    else if (/\.(tsx|jsx)$/.test(file)) fileList.push(filePath);
  }
  return fileList;
}

const allFiles = [...walk('src'), ...walk('CMS/src')];

function cleanClassName(cls) {
  return cls
    .replace(/\bflex\s+items-center\s+justify-center\s+gap-(?:[0-9.]+|x?)\b/g, '')
    .replace(/\bflex\s+items-center\s+gap-(?:[0-9.]+|x?)\b/g, '')
    .replace(/\binline-flex\s+items-center\s+gap-(?:[0-9.]+|x?)\b/g, '')
    .replace(/\bflex\s+items-center\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let simulatedCount = 0;
const samples = [];

for (const file of allFiles) {
  if (file.includes('chat') && (file.includes('unified-chat') || file.includes('chat-app') || file.includes('team-whatsapp') || file.includes('components/chat') || file.includes('components\\chat'))) continue;

  const content = fs.readFileSync(file, 'utf8');

  // Match <h[12] ...> ... <Icon .../> ... </h[12]>
  const regex = /<h([12])(\s+[^>]*)?>([\s\S]*?)<\/h\1>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const fullTag = match[0];
    const level = match[1];
    const rawAttrs = match[2] || '';
    const inner = match[3];

    // Check if inner starts with an Icon
    const iconMatch = inner.match(/^\s*(?:<([A-Z][A-Za-z0-9]+)\b([^>]*)\/>|<([A-Z][A-Za-z0-9]+)\b([^>]*)><\/\3>)/);
    if (iconMatch) {
      const iconName = iconMatch[1] || iconMatch[3];
      if (!['Badge', 'Tooltip', 'Link', 'Button', 'Span', 'Fragment', 'Popover', 'Dialog'].includes(iconName)) {
        simulatedCount++;
        let newAttrs = rawAttrs;
        if (rawAttrs.includes('className="')) {
          newAttrs = rawAttrs.replace(/className="([^"]*)"/, (_, c) => `className="${cleanClassName(c)}"`);
        } else if (rawAttrs.includes('className={`')) {
          newAttrs = rawAttrs.replace(/className={`([^`]*)`}/, (_, c) => `className={\`${cleanClassName(c)}\`}`);
        }
        const newInner = inner.replace(iconMatch[0], '').replace(/^\s*\n/, '\n');
        const replacement = `<h${level}${newAttrs}>${newInner}</h${level}>`;
        if (samples.length < 8) {
          samples.push({ file, original: fullTag.replace(/\s+/g, ' '), transformed: replacement.replace(/\s+/g, ' ') });
        }
      }
    }
  }
}

console.log('Simulated count:', simulatedCount);
samples.forEach((s, idx) => {
  console.log(`Sample ${idx + 1} (${s.file}):`);
  console.log('  ORIGINAL:   ' + s.original);
  console.log('  TRANSFORMED:' + s.transformed + '\n');
});

