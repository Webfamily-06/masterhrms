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

const emojiRegex = /\p{Extended_Pictographic}/u;

const allFiles = [...walk('src'), ...walk('CMS/src'), ...walk('server/src')];

const emojiMatches = [];

for (const file of allFiles) {
  // Chat components are explicitly allowed per user instructions
  const isChat = file.includes('components\\chat') || file.includes('components/chat') || file.includes('chat-app') || file.includes('team-whatsapp-chat-addon');

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

const nonChat = emojiMatches.filter(m => !m.isChat);
const chat = emojiMatches.filter(m => m.isChat);

console.log(`Total files scanned: ${allFiles.length}`);
console.log(`Chat emoji lines (PRESERVED): ${chat.length}`);
console.log(`Non-chat emoji lines (TO CLEAN): ${nonChat.length}\n`);

nonChat.forEach(m => {
  console.log(`[NON-CHAT] ${m.file}:${m.line}`);
  console.log(`   ${m.text.slice(0, 100)}\n`);
});

