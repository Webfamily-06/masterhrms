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

const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const allFiles = [...walk('src'), ...walk('CMS/src')];
console.log(`Auditing ${allFiles.length} source files for emojis...\n`);

const emojiMatches = [];

for (const file of allFiles) {
  // Preserve dedicated chat application files
  const isChat = file.includes('components\\chat') || file.includes('components/chat') || file.includes('chat-app');

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      emojiMatches.push({
        file,
        line: idx + 1,
        isChat,
        text: line.trim()
      });
    }
  });
}

console.log(`Total emoji lines found: ${emojiMatches.length}`);
const nonChatEmojis = emojiMatches.filter(m => !m.isChat);
const chatEmojis = emojiMatches.filter(m => m.isChat);

console.log(`  Chat app emojis (PRESERVED): ${chatEmojis.length}`);
console.log(`  Non-chat UI emojis (TARGETED FOR REMOVAL): ${nonChatEmojis.length}\n`);

console.log('--- NON-CHAT EMOJI MATCHES ---');
nonChatEmojis.forEach(m => {
  console.log(`  ${m.file}:${m.line} -> ${m.text.slice(0, 100)}`);
});

