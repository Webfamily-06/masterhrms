const fs = require('fs');
const path = require('path');

function syncToCms(relPath) {
  const src = path.resolve(__dirname, '..', 'src', relPath);
  const dst = path.resolve(__dirname, '..', 'CMS', 'src', relPath);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  let content = fs.readFileSync(src, 'utf8');
  if (!content.startsWith('"use client"') && !content.startsWith("'use client'")) {
    content = '"use client";\n' + content;
  }
  fs.writeFileSync(dst, content, 'utf8');
  console.log(`Synced ${relPath} -> CMS/src/${relPath}`);
}

const files = [
  'components/apps/chat/classic-chat-app.tsx',
  'components/apps/calendar/classic-calendar-app.tsx',
  'components/apps/taskboard/classic-taskboard-app.tsx',
  'components/apps/file-manager/classic-file-manager-app.tsx',
  'components/apps/todo/classic-todo-app.tsx',
  'components/apps/integrations/classic-all-apps.tsx'
];

files.forEach(f => syncToCms(f));
