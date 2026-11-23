const fs = require('fs');

let html = fs.readFileSync('recruitment_dashboard_pw.html', 'utf8');

// Replacements
// 1. class to className
html = html.replace(/\bclass="/g, 'className="');

// 2. for to htmlFor
html = html.replace(/\bfor="([^"]*)"/g, 'htmlFor="$1"');

// 3. style string to JSX object
html = html.replace(/\bstyle="([^"]*)"/g, (match, p1) => {
  const styles = p1.split(';').filter(s => s.trim().length > 0);
  const styleObj = styles.map(s => {
    const parts = s.split(':');
    let prop = parts[0].trim();
    let val = parts.slice(1).join(':').trim();
    // convert kebab-case to camelCase
    prop = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return `${prop}: "${val}"`;
  }).join(', ');
  return `style={{ ${styleObj} }}`;
});

// 4. self-closing tags
html = html.replace(/<(img|input|hr|br)([^>]*?)(?<!\/)>/gi, '<$1$2 />');

// 5. fix onclick / javascript:void(0)
html = html.replace(/href="javascript:void\(0\);"/g, 'href="#" onClick={(e) => e.preventDefault()}');

// 6. fix comments
html = html.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// 7. fix asset paths: assets/ -> /assets/
html = html.replace(/src="assets\//g, 'src="/assets/');

// 8. fix dropdown toggle attributes: data-bs-toggle -> data-bs-toggle
// and ensure standard Next.js / React compliance

fs.writeFileSync('scripts/recruitment_converted.jsx_snippet', html);
console.log('Converted snippet saved. Size:', html.length);
