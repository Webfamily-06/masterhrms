const fs = require('fs');

const routes = fs.readFileSync('server/src/routes/files.routes.ts', 'utf8');
const lines = routes.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('filesRouter.delete') || line.includes('filesRouter.patch') || line.includes('/nodes/:id') || line.includes('/rename') || line.includes('/trash')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
