const fs = require('fs');

// 1. Patch use-mobile.tsx
const mobileHookPath = 'src/hooks/use-mobile.tsx';
let hookCode = fs.readFileSync(mobileHookPath, 'utf8');
hookCode = hookCode.replace(
  'const MOBILE_BREAKPOINT = 768;',
  '// GAP-UI-011: Synchronized with CSS @media (max-width: 1023.98px) sidebar breakpoint\nconst MOBILE_BREAKPOINT = 1024;'
);
fs.writeFileSync(mobileHookPath, hookCode, 'utf8');
console.log('Patched use-mobile.tsx to MOBILE_BREAKPOINT = 1024');

// 2. Patch styles.css for 320px root viewport safety
const stylesPath = 'src/styles.css';
let cssCode = fs.readFileSync(stylesPath, 'utf8');
if (!cssCode.includes('/* ===== GAP-UI-011: 320px Viewport Root Overflow Protection ===== */')) {
  const rootSafety = `\n/* ===== GAP-UI-011: 320px Viewport Root Overflow Protection ===== */
html, body {
  max-width: 100vw;
  overflow-x: clip;
}
@supports not (overflow-x: clip) {
  html, body {
    overflow-x: hidden;
  }
}\n`;
  cssCode += rootSafety;
  fs.writeFileSync(stylesPath, cssCode, 'utf8');
  console.log('Appended 320px root viewport overflow protection to src/styles.css');
}

