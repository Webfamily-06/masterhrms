import React from 'react';
import type { Components } from 'react-markdown';
import { isValidCssColor, parseSpanStyles } from './markdown-styles';

/**
 * Strict Safe Span component for ReactMarkdown.
 * Guarantees that only valid, safe color and background-color CSS properties are ever rendered.
 * Completely strips all attributes, event handlers, scripts, and non-whitelisted CSS.
 */
export const SafeSpan: React.FC<React.HTMLAttributes<HTMLSpanElement> & { node?: any }> = ({
  style,
  children,
}) => {
  const safeStyle: React.CSSProperties = {};

  if (style) {
    if (typeof style === 'object') {
      const s = style as Record<string, any>;
      if (s.color && isValidCssColor(s.color)) {
        safeStyle.color = s.color;
      }
      const bg = s.backgroundColor || s['background-color'] || s.background;
      if (bg && isValidCssColor(bg)) {
        safeStyle.backgroundColor = bg;
      }
    } else if (typeof style === 'string') {
      const parsed = parseSpanStyles(style);
      if (parsed.color) safeStyle.color = parsed.color;
      if (parsed.backgroundColor) safeStyle.backgroundColor = parsed.backgroundColor;
    }
  }

  // If highlight is present, add subtle rounded padding for clean visual aesthetics
  if (safeStyle.backgroundColor) {
    safeStyle.padding = '0.1em 0.3em';
    safeStyle.borderRadius = '0.25rem';
  }

  return <span style={safeStyle}>{children}</span>;
};

/**
 * Safe Mark component for highlight elements
 */
export const SafeMark: React.FC<React.HTMLAttributes<HTMLElement> & { node?: any }> = ({
  style,
  children,
}) => {
  let bg = '#fef08a'; // default amber/yellow highlight
  if (style) {
    if (typeof style === 'object') {
      const s = style as Record<string, any>;
      const cand = s.backgroundColor || s['background-color'] || s.background;
      if (cand && isValidCssColor(cand)) bg = cand;
    } else if (typeof style === 'string') {
      const parsed = parseSpanStyles(style);
      if (parsed.backgroundColor) bg = parsed.backgroundColor;
    }
  }

  return (
    <mark
      style={{
        backgroundColor: bg,
        padding: '0.1em 0.3em',
        borderRadius: '0.25rem',
      }}
    >
      {children}
    </mark>
  );
};

// Strict drop of dangerous tags
const DisallowedNode: React.FC = () => null;

/**
 * Whitelist-enforced safe Markdown components map.
 * Used by ReactMarkdown in Split View, Live Preview, and Public Blog Details.
 */
export const safeMarkdownComponents: Components = {
  span: SafeSpan as any,
  mark: SafeMark as any,
  script: DisallowedNode,
  iframe: DisallowedNode,
  object: DisallowedNode,
  embed: DisallowedNode,
  style: DisallowedNode,
  link: DisallowedNode,
};
