const fs = require('fs');
const postcss = require('postcss');

const bootstrapCss = fs.readFileSync('SMARTHR/assets/css/bootstrap.min.css', 'utf8');
const smarthrStyleCss = fs.readFileSync('SMARTHR/assets/css/style.css', 'utf8');

const combinedCss = bootstrapCss + '\n' + smarthrStyleCss;

const SCOPE = '.dashboard-scope';

const prefixPlugin = () => {
  return {
    postcssPlugin: 'prefix-dashboard-scope',
    Rule(rule) {
      // Don't prefix inside @keyframes
      if (rule.parent && rule.parent.type === 'atrule' && /keyframes/i.test(rule.parent.name)) {
        return;
      }

      const newSelectors = [];

      for (let sel of rule.selectors) {
        sel = sel.trim();
        if (!sel) continue;

        // Strip :root, html, body
        if (sel === ':root' || sel === 'html' || sel === 'body') {
          newSelectors.push(SCOPE);
        } else if (sel.includes('[data-bs-theme="dark"]') || sel.includes('[data-theme="dark"]') || sel.includes('[data-bs-theme=dark]')) {
          newSelectors.push(`.dark ${SCOPE}, ${SCOPE}[data-bs-theme="dark"]`);
        } else if (sel.includes('[data-bs-theme="light"]') || sel.includes('[data-theme="light"]') || sel.includes('[data-bs-theme=light]')) {
          newSelectors.push(SCOPE);
        } else if (sel.startsWith(SCOPE)) {
          newSelectors.push(sel);
        } else {
          newSelectors.push(`${SCOPE} ${sel}`);
        }
      }

      if (newSelectors.length > 0) {
        // Deduplicate
        rule.selectors = [...new Set(newSelectors)];
      }
    }
  };
};
prefixPlugin.postcss = true;

console.log('Processing combined CSS with PostCSS...');
postcss([prefixPlugin()])
  .process(combinedCss, { from: undefined })
  .then(result => {
    // Add explicit scoped defaults at the very top of the generated CSS
    const scopedDefaults = `
/* SmartHR Dashboard Scoped CSS - Strictly isolated */
${SCOPE} {
  --bs-body-bg: #fff;
  --bs-body-color: #3b3f5c;
  --bs-card-bg: #fff;
  --bs-card-color: #3b3f5c;
  --bs-card-border-color: #e8ebed;
  --bs-border-color: #e8ebed;
  --primary-transparent: #FEF1EB;
  --secondary-transparent: #EDF2F4;
  --success-transparent: #E8FAF0;
  --warning-transparent: #FFF9E9;
  --danger-transparent: #FAE7E7;
  --info-transparent: #EBF4FF;
  --pink-transparent: #FFEDF6;
  --light-transparent: #F9FAFE;
  --dark-transparent: #E8E9EA;
  --teal-transparent: #E6F9FF;
  --purple-transparent: #F7EEF9;
  --skyblue-transparent: #E9FAFE;
  --white-color: #fff;
  --border-color: #e8ebed;
  font-family: inherit;
  color: #3b3f5c;
  box-sizing: border-box;
}

${SCOPE} *, ${SCOPE} *::before, ${SCOPE} *::after {
  box-sizing: border-box;
}

${SCOPE} .card {
  background-color: #ffffff !important;
  border: 1px solid #e8ebed !important;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05);
}

${SCOPE} .card-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e8ebed;
}

${SCOPE} .card-footer {
  background-color: #ffffff;
  border-top: 1px solid #e8ebed;
}

${SCOPE} .card-title {
  color: #212529;
  font-weight: 600;
}

${SCOPE} h1, ${SCOPE} h2, ${SCOPE} h3, ${SCOPE} h4, ${SCOPE} h5, ${SCOPE} h6 {
  color: #212529;
}

${SCOPE} a {
  text-decoration: none;
}

${SCOPE} .table {
  --bs-table-bg: transparent;
}
`;

    const finalCss = scopedDefaults + '\n' + result.css;
    fs.writeFileSync('CMS/public/assets/css/bootstrap-dashboard.css', finalCss);
    console.log('Successfully generated CMS/public/assets/css/bootstrap-dashboard.css! Length:', finalCss.length);
  })
  .catch(err => {
    console.error('Error in PostCSS:', err);
  });
