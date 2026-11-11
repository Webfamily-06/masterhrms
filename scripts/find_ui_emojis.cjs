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
    else if (/\.(tsx|jsx|ts|js)$/.test(file)) fileList.push(filePath);
  }
  return fileList;
}

const allFiles = [...walk('src'), ...walk('CMS/src')];
// Standard Unicode emoji ranges: Miscellaneous Symbols and Pictographs, Emoticons, Transport and Map, Supplemental Symbols, Flags
// We exclude box-drawing (\u2500-\u257f), geometric shapes except specific symbols, etc.
const emojiRegex = /(\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|[\u2600-\u27bf])/g;
const ALLOWLIST = new Set([
  '\u00a9', '\u00ae', '\u2122', '\u2014', '\u2022', '\u2013', '\u20b9', '\u2605', '\u2606',
  '\u2713', '\u2714', '\u2715', '\u2716', '\u2717', '\u2718', // checkmarks/crosses used in tests or icons
  '\u26a0' // warning sign if allowed, but wait! ⚠️ is an emoji in RetentionTab.tsx:809!
]);

const uiEmojis = [];

for (const file of allFiles) {
  if (file.includes('chat') && (file.includes('unified-chat') || file.includes('chat-app') || file.includes('team-whatsapp') || file.includes('chat-list') || file.includes('components/chat') || file.includes('components\\chat'))) continue;
  if (file.includes('.test.') || file.includes('__tests__') || file.includes('test_')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // skip comments if purely comment
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    const matches = line.match(emojiRegex);
    if (matches) {
      // Filter out pure symbols like checkmarks unless it's emoji checkmark
      const realEmojis = matches.filter(m => !['\u00a9', '\u00ae', '\u2122', '\u2014', '\u2022', '\u2013', '\u20b9', '\u2605', '\u2606'].includes(m));
      if (realEmojis.length > 0) {
        uiEmojis.push({
          file,
          line: idx + 1,
          emojis: realEmojis,
          text: trimmed
        });
      }
    }
  });
}

console.log('Real non-chat UI emojis count:', uiEmojis.length);
uiEmojis.forEach(e => {
  console.log(`[${e.emojis.join(', ')}] ${e.file}:${e.line}`);
  console.log(`   ${e.text}\n`);
});
