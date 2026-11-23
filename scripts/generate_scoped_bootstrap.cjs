const fs = require('fs');
const postcss = require('postcss');

const inputCss = fs.readFileSync('CMS/public/assets/css/bootstrap.min.css', 'utf8');

const prefixPlugin = () => {
  return {
    postcssPlugin: 'prefix-dashboard-scope',
    Rule(rule) {
      // Don't prefix inside @keyframes
      if (rule.parent && rule.parent.type === 'atrule' && /keyframes/i.test(rule.parent.name)) {
        return;
      }
      
      const selectors = rule.selectors.map(sel => {
        sel = sel.trim();
        if (sel === ':root' || sel.startsWith('[data-bs-theme')) {
          return `:root, .dashboard-scope, ${sel}`;
        }
        if (sel === 'body') {
          return '.dashboard-scope';
        }
        if (sel === 'html') {
          return '.dashboard-scope';
        }
        // If it starts with *, prefix as .dashboard-scope *
        return `.dashboard-scope ${sel}`;
      });
      rule.selectors = selectors;
    }
  };
};
prefixPlugin.postcss = true;

console.log('Processing bootstrap with postcss...');
postcss([prefixPlugin()])
  .process(inputCss, { from: undefined })
  .then(result => {
    fs.writeFileSync('CMS/public/assets/css/bootstrap-dashboard.css', result.css);
    console.log('Generated CMS/public/assets/css/bootstrap-dashboard.css, size:', result.css.length);
  })
  .catch(err => {
    console.error('PostCSS error:', err);
  });
