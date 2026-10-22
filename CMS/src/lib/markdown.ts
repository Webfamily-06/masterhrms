/**
 * Safely transforms explicit <br>, <br/>, and <br /> line breaks outside of code blocks
 * into standard Markdown hard breaks (two trailing spaces + newline).
 * This produces an authentic <br/> HTML element in the rendered output
 * while strictly preventing raw HTML rendering and XSS vulnerabilities.
 */
export function formatMarkdownWithSafeBreaks(markdown: string): string {
  if (!markdown) return '';
  // Split by fenced code blocks (```...```) and inline code (`...`) so code examples remain literal
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts
    .map((part, index) => {
      // Odd indices are code blocks or inline code snippets
      if (index % 2 === 1) return part;
      // Convert <br>, <br/>, <br /> into two spaces + newline (Markdown hard break)
      return part.replace(/<br\s*\/?>\n?/gi, '  \n');
    })
    .join('');
}
