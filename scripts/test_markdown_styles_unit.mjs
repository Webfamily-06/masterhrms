import assert from 'node:assert';
import {
  isValidCssColor,
  parseSpanStyles,
  serializeSpanStyles,
  applyStyleToText,
} from '../CMS/src/lib/markdown-styles.ts';

console.log('--- Running markdown-styles.ts Unit Tests ---');

// 1. Validation tests
assert.strictEqual(isValidCssColor('#e11d48'), true, 'Valid 6-digit hex');
assert.strictEqual(isValidCssColor('#fff'), true, 'Valid 3-digit hex');
assert.strictEqual(isValidCssColor('rgb(255, 0, 0)'), true, 'Valid rgb');
assert.strictEqual(isValidCssColor('rgba(255, 0, 0, 0.5)'), true, 'Valid rgba');
assert.strictEqual(isValidCssColor('hsl(120, 100%, 50%)'), true, 'Valid hsl');
assert.strictEqual(isValidCssColor('blue'), true, 'Valid color name');

// Malicious / invalid rejected
assert.strictEqual(isValidCssColor('javascript:alert(1)'), false, 'Reject javascript:');
assert.strictEqual(isValidCssColor('url(https://evil.com)'), false, 'Reject url()');
assert.strictEqual(isValidCssColor('red; position: fixed'), false, 'Reject multi-declaration injection');
assert.strictEqual(isValidCssColor('red; background: blue'), false, 'Reject semicolon injection');
assert.strictEqual(isValidCssColor('"><script>alert(1)</script>'), false, 'Reject HTML injection');
assert.strictEqual(isValidCssColor(''), false, 'Reject empty');
assert.strictEqual(isValidCssColor(null), false, 'Reject null');
console.log('✓ Color validation tests passed.');

// 2. Parse & serialize tests
const parsed = parseSpanStyles('color: #2563eb; background-color: #fef08a; font-weight: bold; position: fixed');
assert.deepStrictEqual(parsed, { color: '#2563eb', backgroundColor: '#fef08a' }, 'Sanitizes and extracts only safe properties');
assert.strictEqual(serializeSpanStyles(parsed), 'color: #2563eb; background-color: #fef08a');
console.log('✓ Parse & serialize tests passed.');

// 3. Apply text color to plain text
const res1 = applyStyleToText('Hello World Today', 6, 11, 'color', '#e11d48'); // "World"
assert.strictEqual(res1.newText, 'Hello <span style="color: #e11d48">World</span> Today');
assert.strictEqual(res1.selectionStart, 6 + '<span style="color: #e11d48">'.length);
assert.strictEqual(res1.selectionEnd, res1.selectionStart + 'World'.length);
console.log('✓ Apply text color passed.');

// 4. Apply background color / highlight to plain text
const res2 = applyStyleToText('Hello World Today', 6, 11, 'backgroundColor', '#fef08a');
assert.strictEqual(res2.newText, 'Hello <span style="background-color: #fef08a">World</span> Today');
console.log('✓ Apply highlight passed.');

// 5. Apply color to text that already has highlight (combination)
const text5 = 'Hello <span style="background-color: #fef08a">World</span> Today';
const start5 = text5.indexOf('<span');
const end5 = text5.indexOf('</span>') + '</span>'.length;
const res3 = applyStyleToText(text5, start5, end5, 'color', '#2563eb');
assert.strictEqual(res3.newText, 'Hello <span style="color: #2563eb; background-color: #fef08a">World</span> Today');
console.log('✓ Combined color + highlight on selection passed.');

// 6. Apply color to text with existing markdown formatting (**bold**)
const text6 = 'Notice: **Important Alert** here';
const start6 = text6.indexOf('**Important Alert**');
const end6 = start6 + '**Important Alert**'.length;
const res4 = applyStyleToText(text6, start6, end6, 'color', '#dc2626');
assert.strictEqual(res4.newText, 'Notice: <span style="color: #dc2626">**Important Alert**</span> here');
console.log('✓ Color on formatted markdown (**bold**) passed.');

// 7. Change existing color
const text7 = 'Hello <span style="color: #e11d48">World</span> Today';
const start7 = text7.indexOf('<span');
const end7 = text7.indexOf('</span>') + '</span>'.length;
const res5 = applyStyleToText(text7, start7, end7, 'color', '#16a34a');
assert.strictEqual(res5.newText, 'Hello <span style="color: #16a34a">World</span> Today');
console.log('✓ Change existing color passed.');

// 8. Remove color when span only has color -> unwrap span completely
const text8 = 'Hello <span style="color: #e11d48">World</span> Today';
const start8 = text8.indexOf('<span');
const end8 = text8.indexOf('</span>') + '</span>'.length;
const res6 = applyStyleToText(text8, start8, end8, 'color', null);
assert.strictEqual(res6.newText, 'Hello World Today');
assert.strictEqual(res6.selectionStart, 6);
assert.strictEqual(res6.selectionEnd, 11);
console.log('✓ Remove color (unwrap) passed.');

// 9. Remove color when span has both color and highlight -> keep highlight
const text9 = 'Hello <span style="color: #e11d48; background-color: #fef08a">World</span> Today';
const start9 = text9.indexOf('<span');
const end9 = text9.indexOf('</span>') + '</span>'.length;
const res7 = applyStyleToText(text9, start9, end9, 'color', null);
assert.strictEqual(res7.newText, 'Hello <span style="background-color: #fef08a">World</span> Today');
console.log('✓ Remove color keeping highlight passed.');

// 10. Selection immediately inside span tags: <span style="...">|World|</span>
const spanText = 'Hello <span style="color: #e11d48">World</span> Today';
const innerStart = 6 + '<span style="color: #e11d48">'.length;
const innerEnd = innerStart + 'World'.length;
const res8 = applyStyleToText(spanText, innerStart, innerEnd, 'backgroundColor', '#bfdbfe');
assert.strictEqual(res8.newText, 'Hello <span style="color: #e11d48; background-color: #bfdbfe">World</span> Today');
console.log('✓ Inner selection border detection passed.');

// 11. Malicious color rejected without mutating text
const res9 = applyStyleToText('Safe text here', 5, 9, 'color', 'red; position: fixed');
assert.strictEqual(res9.newText, 'Safe text here', 'Text unmodified when invalid color passed');
console.log('✓ Malicious injection rejection passed.');

// 12. Empty selection insertion
const res10 = applyStyleToText('Start end', 6, 6, 'color', '#9333ea');
assert.strictEqual(res10.newText, 'Start <span style="color: #9333ea">styled text</span>end');
console.log('✓ Empty selection placeholder passed.');

console.log('\n--- ALL 12 UNIT TESTS PASSED SUCCESSFULLY! ---');
