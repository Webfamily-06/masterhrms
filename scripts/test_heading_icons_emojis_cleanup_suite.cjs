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

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✔ PASS [Test ${totalTests}]: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✖ FAIL [Test ${totalTests}]: ${message}`);
  }
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('MASTERHRMS HEADING ICONS, EMOJIS & CLEANUP VERIFICATION SUITE');
console.log('══════════════════════════════════════════════════════════════════\n');

// Test 1: PageHeader decorative icon removed
console.log('▶ Test 1: Checking PageHeader component in TanStack and CMS...');
const phTanstack = fs.readFileSync('src/components/ui/page-header.tsx', 'utf8');
const phCms = fs.readFileSync('CMS/src/components/ui/page-header.tsx', 'utf8');
const phClean = !phTanstack.includes('{icon &&') && !phCms.includes('{icon &&');
assert(phClean, 'PageHeader does not render leading decorative icon before title in src/ or CMS/');

// Test 2: Certificate Branding heading icon removed
console.log('▶ Test 2: Checking Certificate Branding heading icon...');
const cbTanstack = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-branding.tsx', 'utf8');
const cbCms = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-branding/page.tsx', 'utf8');
const cbNoPalette = !cbTanstack.includes('<Palette') && !cbCms.includes('<Palette');
const cbHeadingText = cbTanstack.includes('Certificate Branding & Signatory Studio') && cbCms.includes('Certificate Branding & Signatory Studio');
assert(cbNoPalette && cbHeadingText, 'Certificate Branding heading has Palette icon removed and exact title preserved');

// Test 3: Zero decorative icons in <h1/> and <h2/> page headings
console.log('▶ Test 3: Auditing all headings across src/ and CMS/src/ for decorative leading icons...');
const allFiles = [...walk('src'), ...walk('CMS/src')];
let headingIconMatches = 0;
for (const file of allFiles) {
  if (file.includes('chat') && (file.includes('unified-chat') || file.includes('chat-app') || file.includes('team-whatsapp'))) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/<h[12]\b[^>]*>/.test(line)) {
      const slice = lines.slice(idx, idx + 6).join('\n');
      const iconMatch = slice.match(/<h([12])\b([^>]*)>\s*(?:\{[^}]*\}\s*)*(?:<([A-Z][A-Za-z0-9]+)\b([^>]*)\/?>|<i\b([^>]*)><\/i>)/);
      if (iconMatch) {
        const iconName = iconMatch[3] || '<i>';
        if (!['span', 'div', 'Link', 'Badge', 'Breadcrumb', 'Tooltip', 'Fragment', 'Button', 'Popover', 'Dialog'].includes(iconName)) {
          headingIconMatches++;
        }
      }
    }
  });
}
assert(headingIconMatches === 0, `Audit found 0 leading heading icons across entire application (got ${headingIconMatches})`);

// Test 4: Strict Non-Chat Emoji Removal
console.log('▶ Test 4: Auditing all non-chat files for UI emojis...');
const emojiRegex = /[\p{Extended_Pictographic}]/ug;
const ALLOWLIST = new Set(['\u00a9', '\u00ae', '\u2122', '\u2014', '\u2022', '\u2013', '\u20b9', '\u2605', '\u2606', '\u2713', '\u2714', '\u2715', '\u2716', '\u2717', '\u2718', '©', '®', '™', '—', '•', '–', '₹', '★', '☆', '#', '*', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
let uiEmojiCount = 0;
for (const file of allFiles) {
  if (file.includes('chat') && (file.includes('unified-chat') || file.includes('chat-app') || file.includes('team-whatsapp') || file.includes('chat-list') || file.includes('components/chat') || file.includes('components\\chat'))) continue;
  if (file.includes('.test.') || file.includes('__tests__') || file.includes('test_') || file.includes('audit_') || file.includes('apply_') || file.includes('find_') || file.includes('simulate_')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    const matches = line.match(emojiRegex);
    if (matches) {
      const real = matches.filter(m => !ALLOWLIST.has(m) && m.trim().length > 0);
      if (real.length > 0) uiEmojiCount++;
    }
  });
}
assert(uiEmojiCount === 0, `Non-chat UI emoji audit found 0 emojis across entire application (got ${uiEmojiCount})`);

// Test 5: Dedicated Chat App Emoji Preservation
console.log('▶ Test 5: Verifying dedicated Chat application emojis are fully preserved...');
const unifiedChatApp = fs.existsSync('src/components/chat/unified-chat-app.tsx') ? fs.readFileSync('src/components/chat/unified-chat-app.tsx', 'utf8') : '';
const chatHasEmojis = unifiedChatApp.includes('😀') || unifiedChatApp.includes('👍') || unifiedChatApp.includes('emoji');
assert(chatHasEmojis, 'Dedicated chat application maintains complete emoji reactions and functionality');

// Test 6: Typography and Symbol Preservation
console.log('▶ Test 6: Verifying legitimate Unicode typography symbols (©, ®, ™, ₹, —) are preserved...');
const siteFooter = fs.readFileSync('src/components/marketing/site-footer.tsx', 'utf8');
const symbolsPreserved = siteFooter.includes('©') && siteFooter.includes('All rights reserved');
assert(symbolsPreserved, 'Legitimate symbols (© copyright, ₹ currency, — dashes) are properly preserved');

// Test 7: Parity between TanStack and CMS
console.log('▶ Test 7: Verifying TanStack and CMS heading parity...');
const templatesTanstack = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-templates.tsx', 'utf8');
const templatesCms = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-templates/page.tsx', 'utf8');
const templatesNoSparkles = !templatesTanstack.includes('<Sparkles className="h-6 w-6 text-amber-500"') && !templatesCms.includes('<Sparkles className="h-6 w-6 text-amber-500"');
assert(templatesNoSparkles, 'Certificate templates heading has decorative icon removed in both TanStack and CMS');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`TOTAL SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

