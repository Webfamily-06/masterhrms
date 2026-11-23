const fs = require('fs');

const code = fs.readFileSync('CMS/src/app/(workspace)/employee-dashboard/page.tsx', 'utf8');

// Use typescript or babel parser if available or swc
try {
  const ts = require('typescript');
  const res = ts.transpileModule(code, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 }
  });
  console.log('TS transpile SUCCESS!');
} catch (e) {
  console.log('TS transpile ERROR:', e.message);
}
