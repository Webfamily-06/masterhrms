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
console.log(`Auditing ${allFiles.length} files for decorative icons in page headings...\n`);

const headingIconMatches = [];

for (const file of allFiles) {
  // Skip dedicated chat application per instructions
  if (file.includes('chat') && (file.includes('unified-chat') || file.includes('chat-app'))) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check if line contains <h1 or <h2 with an icon inside it or on the next line
    if (/<h[12]\b[^>]*>/.test(line)) {
      const slice = lines.slice(idx, idx + 5).join('\n');
      // Look for Icon component: <IconName className="..."/> or <i className="..."/>
      const iconMatch = slice.match(/<h[12]\b([^>]*)>\s*(?:\{[^}]*\}\s*)*(?:<([A-Z][A-Za-z0-9]+)\b([^>]*)\/?>|<i\b([^>]*)><\/i>)/);
      if (iconMatch) {
        const iconName = iconMatch[2] || '<i>';
        // Ignore if iconName is Span, Fragment, Link, Badge, Tooltip, etc.
        if (!['span', 'div', 'Link', 'Badge', 'Breadcrumb', 'Tooltip', 'Fragment'].includes(iconName)) {
          headingIconMatches.push({
            file,
            line: idx + 1,
            iconName,
            snippet: slice.slice(0, 150).replace(/\n\s*/g, ' ')
          });
        }
      }
    }
  });
}

console.log(`Found ${headingIconMatches.length} heading icon matches:\n`);
headingIconMatches.forEach(m => {
  console.log(`[${m.iconName}] ${m.file}:${m.line}`);
  console.log(`   ${m.snippet}\n`);
});

