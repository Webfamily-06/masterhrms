const fs = require('fs');

const path = 'server/src/index.ts';
let content = fs.readFileSync(path, 'utf8');

const target = 'app.use(\r\n  "/uploads",\r\n  uploadsSecurityMiddleware,';
const replacement = 'app.use(\r\n  ["/uploads", "/api/uploads"],\r\n  uploadsSecurityMiddleware,';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully updated server/src/index.ts');
} else {
  // Check LF
  const targetLf = 'app.use(\n  "/uploads",\n  uploadsSecurityMiddleware,';
  const replacementLf = 'app.use(\n  ["/uploads", "/api/uploads"],\n  uploadsSecurityMiddleware,';
  if (content.includes(targetLf)) {
    content = content.replace(targetLf, replacementLf);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated server/src/index.ts with LF');
  } else {
    console.error('Target not found in server/src/index.ts');
    process.exit(1);
  }
}
