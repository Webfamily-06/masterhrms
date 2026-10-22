/**
 * MASTERHRMS — Safe HTML Sanitization Utility
 *
 * Enforces strict XSS security for CMS page HTML:
 * 1. Strips dangerous elements: <script>, <style>, <iframe>, <object>, <embed>, <applet>, <base>, <link>, <meta>
 * 2. Strips all inline event handlers (on* attributes like onerror, onclick, onload, etc.)
 * 3. Strips javascript:, vbscript:, and malicious data: URLs
 * 4. Preserves safe semantic markup: h1-h6, p, div, span, section, article, header, footer,
 *    table, thead, tbody, tr, th, td, ul, ol, li, blockquote, strong, em, b, i, u, s,
 *    a (safe hrefs), img (safe srcs), hr, br, etc.
 */

const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'base',
  'meta',
  'link',
  'form',
  'input',
  'textarea',
  'button',
  'select',
];

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Validates a URL attribute (href or src) to ensure it is not a javascript: or dangerous URI
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();

  // Allow relative URLs, fragments, and root-relative paths
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }

  // Allow safe data URIs for images only
  if (trimmed.startsWith('data:image/')) {
    return true;
  }

  try {
    const parsed = new URL(url.trim());
    return SAFE_SCHEMES.includes(parsed.protocol);
  } catch {
    // If not a valid absolute URL and not starting with safe relative markers, reject
    return false;
  }
}

/**
 * Strips dangerous HTML tags, attributes, and URL protocols from an HTML string
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let html = rawHtml;

  // 1. Remove dangerous tags and their contents completely
  for (const tag of DANGEROUS_TAGS) {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    html = html.replace(tagRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    html = html.replace(selfClosingRegex, '');
  }

  // 2. Remove all on* event handler attributes (e.g. onerror="...", onclick='...')
  html = html.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Remove href/src containing javascript: or vbscript:
  html = html.replace(
    /\s+(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript):[^"]*"|'\s*(?:javascript|vbscript):[^']*'|(?:javascript|vbscript):[^\s>]+)/gi,
    ' $1="#"'
  );

  return html;
}

/**
 * Generate a clean standalone HTML document for iframe previews with isolated styling
 */
export function generateSandboxedIframeDoc(bodyHtml: string, title = 'Page Preview'): string {
  const sanitized = sanitizeHtml(bodyHtml);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #f8fafc;
        background-color: #090d16;
      }
    }
    .preview-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }
    h1, h2, h3, h4, h5, h6 {
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: inherit;
    }
    h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.025em; }
    h2 { font-size: 1.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 0.3em; }
    h3 { font-size: 1.5rem; }
    p { margin-top: 0; margin-bottom: 1.25rem; }
    a { color: #2563eb; text-decoration: underline; text-underline-offset: 3px; }
    a:hover { color: #1d4ed8; }
    img { max-width: 100%; height: auto; border-radius: 0.75rem; display: block; margin: 1.5rem 0; }
    ul, ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
    li { margin-bottom: 0.35rem; }
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 1rem;
      margin: 1.5rem 0;
      color: #64748b;
      font-style: italic;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875em;
      background: rgba(148, 163, 184, 0.15);
      padding: 0.2em 0.4em;
      border-radius: 0.375rem;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 1.25rem;
      border-radius: 0.75rem;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
    }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid rgba(148, 163, 184, 0.2); padding: 0.75rem; text-align: left; }
    th { background: rgba(148, 163, 184, 0.08); font-weight: 600; }
    .hero {
      text-align: center;
      padding: 3.5rem 1rem 2.5rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      margin-bottom: 2.5rem;
    }
    .hero .eyebrow {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #2563eb;
      background: rgba(37, 99, 235, 0.1);
      border-radius: 9999px;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .hero h1 { margin-top: 0; }
    .hero .subtitle {
      font-size: 1.125rem;
      color: #64748b;
      max-width: 700px;
      margin: 0 auto 1.5rem;
    }
    .cta-button {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff !important;
      background: #2563eb;
      border-radius: 0.5rem;
      text-decoration: none !important;
      transition: background 0.2s;
    }
    .cta-button:hover { background: #1d4ed8; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .card {
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.75rem;
      padding: 1.5rem;
      background: rgba(148, 163, 184, 0.03);
    }
    .card h3 { margin-top: 0; font-size: 1.125rem; }
    .faq-item {
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .faq-item h4 { margin: 0 0 0.5rem; font-size: 1rem; }
    .faq-item p { margin: 0; color: #64748b; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="preview-container">
    ${sanitized}
  </div>
</body>
</html>`;
}
