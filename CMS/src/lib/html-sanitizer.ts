/**
 * MASTERHRMS — Safe HTML Sanitization Utility (PENTEST-001 Hardened)
 *
 * Enforces strict multi-pass XSS security for CMS, Careers, Recruitment, HR Letters, and Document Previews:
 * 1. Multi-pass stripping of dangerous elements (<script>, <style>, <iframe>, <object>, <embed>, <applet>,
 *    <base>, <link>, <meta>, <form>, <input>, <textarea>, <button>, <select>, <svg>, <math>, <template>, <noscript>)
 *    to defeat nested obfuscation like <scr<script>ipt>.
 * 2. Strips all inline event handler attributes (on*= including quoted, unquoted, backtick, and whitespace variants).
 * 3. Strips srcdoc, formaction, xlink:href, and unsafe javascript:/vbscript:/data: URIs.
 * 4. Strips dangerous CSS expressions / javascript URLs inside inline style attributes.
 * 5. Preserves safe semantic markup (h1-h6, p, div, span, section, table, ul, ol, li, strong, em, a, img, br, hr).
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
  'svg',
  'math',
  'template',
  'noscript',
  'portal',
];

/**
 * Strips dangerous HTML tags, attributes, event handlers, and unsafe URL protocols (multi-pass).
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let html = rawHtml.replace(/\0/g, '');
  let previous = '';
  let passes = 0;

  // Multi-pass loop prevents nested tag reconstruction (e.g. <scr<script>ipt>)
  while (html !== previous && passes < 5) {
    previous = html;
    passes++;

    // 1. Remove HTML comments (can conceal conditional/mXSS payloads)
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Remove dangerous tags and their contents completely
    for (const tag of DANGEROUS_TAGS) {
      const pairedRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
      html = html.replace(pairedRegex, '');
      const openOrSelfClosingRegex = new RegExp(`<\\/?${tag}\\b[^>]*\\/?>`, 'gi');
      html = html.replace(openOrSelfClosingRegex, '');
    }

    // 3. Remove all on* event handlers and dangerous attributes (srcdoc, formaction, xlink:href)
    html = html.replace(
      /\s+(?:on[a-zA-Z0-9_-]+|srcdoc|formaction|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]+)/gi,
      ''
    );
    // Also remove bare/valueless event attributes
    html = html.replace(/\s+on[a-zA-Z0-9_-]+(?=\s|>|\/)/gi, '');

    // 4. Neutralize javascript:, vbscript:, and non-image data: URIs in href/src/action/poster
    html = html.replace(
      /\s+(href|src|action|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (_match, attr: string, dVal?: string, sVal?: string, uVal?: string) => {
        const rawVal = (dVal ?? sVal ?? uVal ?? '').trim();
        // Normalize control chars & whitespace inside scheme check (defeats java\tscript:)
        const compact = rawVal.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
        const isSafeDataImage =
          attr.toLowerCase() === 'src' &&
          /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,/i.test(compact);
        if (
          compact.startsWith('javascript:') ||
          compact.startsWith('vbscript:') ||
          (compact.startsWith('data:') && !isSafeDataImage)
        ) {
          return ` ${attr}="#"`;
        }
        return ` ${attr}="${rawVal.replace(/"/g, '&quot;')}"`;
      }
    );

    // 5. Strip dangerous CSS constructs (expression(), behavior:, -moz-binding, javascript: urls)
    html = html.replace(/\s+style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_m, dVal?: string, sVal?: string) => {
      const val = dVal ?? sVal ?? '';
      if (/expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import/i.test(val)) {
        return '';
      }
      return ` style="${val.replace(/"/g, '&quot;')}"`;
    });
  }

  return html;
}

/**
 * Converts raw SVG text into a sandboxed image data URI so SVG scripts/event handlers CANNOT execute.
 */
export function toSafeSvgImageSrc(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return '';
  const cleaned = svgContent
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\s+on[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      const utf8Bytes = new TextEncoder().encode(cleaned);
      let binary = '';
      utf8Bytes.forEach((b) => { binary += String.fromCharCode(b); });
      return `data:image/svg+xml;base64,${window.btoa(binary)}`;
    } catch {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
    }
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
}

/**
 * Generate a clean standalone HTML document for iframe previews with isolated styling
 */
export function generateSandboxedIframeDoc(bodyHtml: string, title = 'Page Preview'): string {
  const sanitized = sanitizeHtml(bodyHtml);
  const safeTitle = String(title || 'Page Preview').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
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
  </style>
</head>
<body>
  <div class="preview-container">${sanitized}</div>
</body>
</html>`;
}
