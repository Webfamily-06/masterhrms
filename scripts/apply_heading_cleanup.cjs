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

let modifiedFilesCount = 0;
let totalHeadingsCleaned = 0;
const modifiedLog = [];

for (const file of allFiles) {
  // Preserve dedicated chat application
  if (file.includes('chat') && (file.includes('unified-chat') || file.includes('chat-app') || file.includes('team-whatsapp') || file.includes('components/chat') || file.includes('components\\chat'))) continue;

  const content = fs.readFileSync(file, 'utf8');

  let fileModified = false;
  let fileCleanCount = 0;

  // Match <h[12] ...> ... </h[12]>
  const newContent = content.replace(/<h([12])(\s+[^>]*)?>([\s\S]*?)<\/h\1>/g, (fullTag, level, rawAttrs = '', inner) => {
    // Check if inner starts with an Icon
    const iconMatch = inner.match(/^\s*(?:<([A-Z][A-Za-z0-9]+)\b([^>]*)\/>|<([A-Z][A-Za-z0-9]+)\b([^>]*)><\/\1>)/);
    if (iconMatch) {
      const iconName = iconMatch[1];
      if (!['Badge', 'Tooltip', 'Link', 'Button', 'Span', 'Fragment', 'Popover', 'Dialog'].includes(iconName)) {
        fileModified = true;
        fileCleanCount++;
        totalHeadingsCleaned++;

        let newAttrs = rawAttrs;
        if (rawAttrs.includes('className="')) {
          newAttrs = rawAttrs.replace(/className="([^"]*)"/, (_, c) => `className="${cleanClassName(c)}"`);
        } else if (rawAttrs.includes('className={`')) {
          newAttrs = rawAttrs.replace(/className={`([^`]*)`}/, (_, c) => `className={\`${cleanClassName(c)}\`}`);
        }
        const newInner = inner.replace(iconMatch[0], '').replace(/^\s*\n/, '\n');
        return `<h${level}${newAttrs}>${newInner}</h${level}>`;
      }
    }
    return fullTag;
  });

  if (fileModified) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedFilesCount++;
    modifiedLog.push({ file, count: fileCleanCount });
  }
}

console.log(`Successfully cleaned ${totalHeadingsCleaned} heading icons across ${modifiedFilesCount} files.`);

