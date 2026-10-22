/**
 * Safe Rich-Text Markdown Styles Engine
 * Handles Text Color and Background Color / Highlight formatting,
 * storage contract, validation, and sanitization for MASTERHRMS Blog CMS.
 */

// Strict regex allowing only safe hex, rgb, rgba, hsl, hsla, or recognized CSS color keywords
const SAFE_COLOR_REGEX =
  /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*\)|hsla\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+\s*\)|[a-zA-Z]+)$/;

const DISALLOWED_COLOR_TOKENS = ['url', 'expression', 'javascript', ';', '<', '>', '"', "'", '\\', '\n', '\r'];

/**
 * Validates that a color string is safe and conforms to accepted CSS color syntax.
 */
export function isValidCssColor(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  const lower = clean.toLowerCase();
  for (const token of DISALLOWED_COLOR_TOKENS) {
    if (lower.includes(token)) return false;
  }
  return SAFE_COLOR_REGEX.test(clean);
}

export interface ParsedSpanStyles {
  color?: string;
  backgroundColor?: string;
}

/**
 * Parses style string from <span style="..."> into safe style object
 */
export function parseSpanStyles(styleStr?: string): ParsedSpanStyles {
  const result: ParsedSpanStyles = {};
  if (!styleStr || typeof styleStr !== 'string') return result;

  const declarations = styleStr.split(';');
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();

    if (prop === 'color' && isValidCssColor(val)) {
      result.color = val;
    } else if ((prop === 'background-color' || prop === 'background') && isValidCssColor(val)) {
      result.backgroundColor = val;
    }
  }
  return result;
}

/**
 * Serializes parsed styles back into clean style="..." string
 */
export function serializeSpanStyles(styles: ParsedSpanStyles): string {
  const parts: string[] = [];
  if (styles.color && isValidCssColor(styles.color)) {
    parts.push(`color: ${styles.color}`);
  }
  if (styles.backgroundColor && isValidCssColor(styles.backgroundColor)) {
    parts.push(`background-color: ${styles.backgroundColor}`);
  }
  return parts.join('; ');
}

export interface StyleTransformResult {
  newText: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Applies or removes text color or background-color on a given selection.
 * Handles existing span unwrapping, property merging, and selection range updates.
 */
export function applyStyleToText(
  text: string,
  start: number,
  end: number,
  styleType: 'color' | 'backgroundColor',
  colorValue: string | null // null means remove
): StyleTransformResult {
  if (colorValue !== null && !isValidCssColor(colorValue)) {
    // Malicious or invalid color rejected; return unchanged
    return { newText: text, selectionStart: start, selectionEnd: end };
  }

  let selected = text.substring(start, end);

  // If empty selection, insert placeholder with desired style
  if (!selected) {
    if (!colorValue) {
      return { newText: text, selectionStart: start, selectionEnd: end };
    }
    const styles: ParsedSpanStyles = { [styleType]: colorValue };
    const styleAttr = serializeSpanStyles(styles);
    const replacement = `<span style="${styleAttr}">styled text</span>`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    const innerStart = start + `<span style="${styleAttr}">`.length;
    return {
      newText,
      selectionStart: innerStart,
      selectionEnd: innerStart + 'styled text'.length,
    };
  }

  // Check Case 1: The selection itself is a single span: <span style="...">inner</span>
  const exactSpanMatch = selected.match(/^<span\s+style="([^"]*)">([\s\S]*?)<\/span>$/i);
  if (exactSpanMatch) {
    const existingStyles = parseSpanStyles(exactSpanMatch[1]);
    const innerContent = exactSpanMatch[2];

    if (colorValue) {
      existingStyles[styleType] = colorValue;
      const newStyleAttr = serializeSpanStyles(existingStyles);
      const replacement = `<span style="${newStyleAttr}">${innerContent}</span>`;
      const newText = text.substring(0, start) + replacement + text.substring(end);
      return {
        newText,
        selectionStart: start,
        selectionEnd: start + replacement.length,
      };
    } else {
      // Remove styleType
      delete existingStyles[styleType];
      if (existingStyles.color || existingStyles.backgroundColor) {
        const newStyleAttr = serializeSpanStyles(existingStyles);
        const replacement = `<span style="${newStyleAttr}">${innerContent}</span>`;
        const newText = text.substring(0, start) + replacement + text.substring(end);
        return {
          newText,
          selectionStart: start,
          selectionEnd: start + replacement.length,
        };
      } else {
        // No styles remain: completely unwrap span
        const newText = text.substring(0, start) + innerContent + text.substring(end);
        return {
          newText,
          selectionStart: start,
          selectionEnd: start + innerContent.length,
        };
      }
    }
  }

  // Check Case 2: The selection is inside a span whose opening tag is immediately before start
  // and closing tag is immediately after end: <span style="...">|selected|</span>
  const textBefore = text.substring(0, start);
  const textAfter = text.substring(end);
  const openSpanMatch = textBefore.match(/<span\s+style="([^"]*)">$/i);
  const closeSpanMatch = textAfter.match(/^<\/span>/i);

  if (openSpanMatch && closeSpanMatch) {
    const outerSpanStart = start - openSpanMatch[0].length;
    const outerSpanEnd = end + closeSpanMatch[0].length;
    const existingStyles = parseSpanStyles(openSpanMatch[1]);

    if (colorValue) {
      existingStyles[styleType] = colorValue;
      const newStyleAttr = serializeSpanStyles(existingStyles);
      const replacement = `<span style="${newStyleAttr}">${selected}</span>`;
      const newText = text.substring(0, outerSpanStart) + replacement + text.substring(outerSpanEnd);
      const newInnerStart = outerSpanStart + `<span style="${newStyleAttr}">`.length;
      return {
        newText,
        selectionStart: newInnerStart,
        selectionEnd: newInnerStart + selected.length,
      };
    } else {
      delete existingStyles[styleType];
      if (existingStyles.color || existingStyles.backgroundColor) {
        const newStyleAttr = serializeSpanStyles(existingStyles);
        const replacement = `<span style="${newStyleAttr}">${selected}</span>`;
        const newText = text.substring(0, outerSpanStart) + replacement + text.substring(outerSpanEnd);
        const newInnerStart = outerSpanStart + `<span style="${newStyleAttr}">`.length;
        return {
          newText,
          selectionStart: newInnerStart,
          selectionEnd: newInnerStart + selected.length,
        };
      } else {
        // Unwrap completely
        const newText = text.substring(0, outerSpanStart) + selected + text.substring(outerSpanEnd);
        return {
          newText,
          selectionStart: outerSpanStart,
          selectionEnd: outerSpanStart + selected.length,
        };
      }
    }
  }

  // Case 3: Standard selection wrap or removal
  if (!colorValue) {
    // If removing style and not enclosed, return as-is
    return { newText: text, selectionStart: start, selectionEnd: end };
  }

  const styles: ParsedSpanStyles = { [styleType]: colorValue };
  const styleAttr = serializeSpanStyles(styles);
  const replacement = `<span style="${styleAttr}">${selected}</span>`;
  const newText = text.substring(0, start) + replacement + text.substring(end);
  const newInnerStart = start + `<span style="${styleAttr}">`.length;

  return {
    newText,
    selectionStart: newInnerStart,
    selectionEnd: newInnerStart + selected.length,
  };
}
