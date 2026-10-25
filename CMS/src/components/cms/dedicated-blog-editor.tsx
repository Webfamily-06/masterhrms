'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapArray } from '@/lib/api';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BookOpen,
  ArrowLeft,
  Save,
  CheckCircle2,
  Eye,
  Loader2,
  Upload,
  Image as ImageIcon,
  Calendar,
  User,
  Tag as TagIcon,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Strikethrough,
  Palette,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Eraser,
  Columns,
  Sparkles,
  X,
  AlertCircle,
  Clock,
  Layers,
  Globe,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { formatMarkdownWithSafeBreaks } from '@/lib/markdown';
import { safeMarkdownComponents } from '@/lib/safe-markdown-components';
import { applyStyleToText } from '@/lib/markdown-styles';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { getResolvedPublicDomain, getResolvedPublicBlogUrl, getTrustedCanonicalBlogUrl } from '@/lib/platform-domain';
import type { CmsPage } from '@/app/super/cms/page';
import type { BlogCategory, BlogTag } from '@/components/cms/blog-manager-studio';
import { MediaPickerModal, type MediaFileItem } from '@/components/media/media-picker-modal';

interface DedicatedBlogEditorProps {
  articleId?: string;
  isNew?: boolean;
}

const DEFAULT_CATEGORIES: BlogCategory[] = [
  { id: 'cat-1', name: 'ERP Systems', slug: 'erp-systems', description: 'Core ERP architecture, databases, and enterprise planning.' },
  { id: 'cat-2', name: 'Global Payroll & Tax', slug: 'global-payroll-tax', description: 'Automated payroll calculations, statutory deductions, and cross-border pay runs.' },
  { id: 'cat-3', name: 'Workforce AI', slug: 'workforce-ai', description: 'Generative AI, talent analytics, and automated decision workflows.' },
  { id: 'cat-4', name: 'Supply Chain & Operations', slug: 'supply-chain-operations', description: 'Procurement, inventory tracking, and warehouse logistics.' },
  { id: 'cat-5', name: 'Compliance & HRMS', slug: 'compliance-hrms', description: 'Labor laws, audits, privacy standards, and statutory filings.' },
  { id: 'cat-6', name: 'Financial Ledgers', slug: 'financial-ledgers', description: 'Double-entry ledgers, reconciliation, and automated invoicing.' },
];

export function DedicatedBlogEditor({ articleId, isNew = false }: DedicatedBlogEditorProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const historyRef = useRef<{ items: string[]; index: number }>({ items: [], index: -1 });

  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editorView, setEditorView] = useState<'editor' | 'split' | 'preview'>('split');
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [bodyImagePickerOpen, setBodyImagePickerOpen] = useState(false);
  const [socialImagePickerOpen, setSocialImagePickerOpen] = useState(false);
  const [textColorPopoverOpen, setTextColorPopoverOpen] = useState(false);
  const [highlightPopoverOpen, setHighlightPopoverOpen] = useState(false);
  const [customTextColor, setCustomTextColor] = useState('#e11d48');
  const [customHighlightColor, setCustomHighlightColor] = useState('#fef08a');

  // Form State
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    category: 'ERP Systems',
    tags: [] as string[],
    author: 'Master ERP Editorial',
    readTime: '5 min read',
    coverImage: '',
    coverImageAlt: '',
    body: '',
    published: true,
    publishedAt: new Date().toISOString().split('T')[0],
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    socialImage: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [resolvedDomain, setResolvedDomain] = useState(getResolvedPublicDomain);

  useEffect(() => {
    setResolvedDomain(getResolvedPublicDomain());
  }, []);

  // 1. Fetch Categories
  const { data: categories = DEFAULT_CATEGORIES } = useQuery<BlogCategory[]>({
    queryKey: ['cms-blog-categories'],
    queryFn: async () => {
      try {
        const page = await api.get('/cms/pages/system-blog-categories');
        if (page?.content && Array.isArray(page.content.categories)) {
          return page.content.categories.map((c: any) =>
            typeof c === 'string'
              ? { id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, name: c, slug: c.toLowerCase().replace(/[^a-z0-9]/g, '-') }
              : c
          );
        }
        return DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
  });

  // 2. Fetch Article Data if Editing
  const {
    data: article,
    isLoading: isArticleLoading,
    isError: isArticleError,
  } = useQuery<CmsPage | null>({
    queryKey: ['cms-blog-article', articleId],
    queryFn: async () => {
      if (!articleId || isNew) return null;
      try {
        // Try dedicated by-id endpoint first
        const res = await api.get(`/cms/pages/by-id/${articleId}`).catch(async () => {
          return await api.get(`/cms/blogs/${articleId}`);
        });
        return res as CmsPage;
      } catch {
        // Fallback to slug search
        const pages = await api.get('/cms/pages');
        const list = unwrapArray<CmsPage>(pages);
        const match = list.find((p) => p.id === articleId || p.slug === articleId || p.slug === `blog-${articleId}`);
        if (!match) throw new Error('Article not found');
        return match;
      }
    },
    enabled: Boolean(articleId && !isNew),
  });

  // Sync article data into form and initialize history
  useEffect(() => {
    if (article) {
      const c = article.content || {};
      const initialBody = c.body || c.richText || '';
      setForm({
        title: article.title || '',
        slug: article.slug.replace(/^blog-/, ''),
        excerpt: c.excerpt || article.meta_description || c.hero?.subtitle || '',
        category: c.category || categories[0]?.name || 'ERP Systems',
        tags: Array.isArray(c.tags) ? c.tags : [],
        author: c.author || 'Master ERP Editorial',
        readTime: c.readTime || '5 min read',
        coverImage: c.coverImage || '',
        coverImageAlt: c.coverImageAlt || article.title,
        body: initialBody,
        published: article.published ?? true,
        publishedAt: c.publishedAt || (article.created_at ? new Date(article.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        seoTitle: c.seoTitle || article.title,
        seoDescription: c.seoDescription || article.meta_description || '',
        canonicalUrl: c.canonicalUrl || '',
        socialImage: c.socialImage || c.coverImage || '',
      });
      historyRef.current = { items: [initialBody], index: 0 };
      setHistory([initialBody]);
      setHistoryIndex(0);
      savedSelectionRef.current = { start: 0, end: 0 };
    } else if (isNew && historyRef.current.items.length === 0) {
      historyRef.current = { items: [''], index: 0 };
      setHistory(['']);
      setHistoryIndex(0);
      savedSelectionRef.current = { start: 0, end: 0 };
    }
  }, [article, categories, isNew]);

  // Helper to obtain active textarea
  const getTextarea = (): HTMLTextAreaElement | null => {
    return textareaRef.current || (document.getElementById('blog-editor-body') as HTMLTextAreaElement | null);
  };

  // Synchronize selection tracking from native textarea events
  const handleUpdateSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    savedSelectionRef.current = {
      start: target.selectionStart,
      end: target.selectionEnd,
    };
  };

  // Synchronous layout effect: reliably restores focus & selection after React DOM commit
  useIsomorphicLayoutEffect(() => {
    if (pendingSelectionRef.current) {
      const { start, end } = pendingSelectionRef.current;
      pendingSelectionRef.current = null;
      const textarea = getTextarea();
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start, end);
        savedSelectionRef.current = { start, end };
      }
    }
  }, [form.body, editorView]);

  // Update body with history tracking
  const updateBody = (newBody: string, addToHistory = true) => {
    setForm((prev) => ({ ...prev, body: newBody }));
    if (addToHistory) {
      const cur = historyRef.current;
      if (cur.items[cur.index] !== newBody) {
        const nextItems = cur.items.slice(0, cur.index + 1);
        nextItems.push(newBody);
        if (nextItems.length > 100) nextItems.shift();
        const nextIndex = nextItems.length - 1;
        historyRef.current = { items: nextItems, index: nextIndex };
        setHistory(nextItems);
        setHistoryIndex(nextIndex);
      }
    }
  };

  const handleUndo = () => {
    const cur = historyRef.current;
    if (cur.index > 0) {
      const nextIndex = cur.index - 1;
      const targetText = cur.items[nextIndex];
      cur.index = nextIndex;
      setHistoryIndex(nextIndex);
      setForm((prev) => ({ ...prev, body: targetText }));
      pendingSelectionRef.current = {
        start: targetText.length,
        end: targetText.length,
      };
      savedSelectionRef.current = {
        start: targetText.length,
        end: targetText.length,
      };
      const textarea = getTextarea();
      if (textarea) {
        textarea.value = targetText;
        textarea.focus();
        textarea.setSelectionRange(targetText.length, targetText.length);
      }
    }
  };

  const handleRedo = () => {
    const cur = historyRef.current;
    if (cur.index < cur.items.length - 1) {
      const nextIndex = cur.index + 1;
      const targetText = cur.items[nextIndex];
      cur.index = nextIndex;
      setHistoryIndex(nextIndex);
      setForm((prev) => ({ ...prev, body: targetText }));
      pendingSelectionRef.current = {
        start: targetText.length,
        end: targetText.length,
      };
      savedSelectionRef.current = {
        start: targetText.length,
        end: targetText.length,
      };
      const textarea = getTextarea();
      if (textarea) {
        textarea.value = targetText;
        textarea.focus();
        textarea.setSelectionRange(targetText.length, targetText.length);
      }
    }
  };

  // Centralized Formatting Engine
  interface FormattingResult {
    newText: string;
    selectionStart: number;
    selectionEnd: number;
  }

  const executeFormatting = (
    transform: (text: string, start: number, end: number) => FormattingResult
  ) => {
    if (editorView === 'preview') {
      setEditorView('split');
    }

    const textarea = getTextarea();
    const text = (textarea ? textarea.value : form.body) || '';

    let start = textarea ? textarea.selectionStart : savedSelectionRef.current.start;
    let end = textarea ? textarea.selectionEnd : savedSelectionRef.current.end;

    // Fallback if textarea selection reset to (0,0) on button click / blur
    if (
      textarea &&
      start === 0 &&
      end === 0 &&
      (savedSelectionRef.current.start > 0 || savedSelectionRef.current.end > 0)
    ) {
      start = savedSelectionRef.current.start;
      end = savedSelectionRef.current.end;
    }

    start = Math.max(0, Math.min(start, text.length));
    end = Math.max(start, Math.min(end, text.length));

    const result = transform(text, start, end);

    updateBody(result.newText, true);

    pendingSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };
    savedSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };

    if (textarea) {
      textarea.value = result.newText;
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    }
  };

  // 1. Inline Formatting (Bold, Italic, Strikethrough)
  const handleToggleInline = (prefix: string, suffix: string, placeholder: string) => {
    executeFormatting((text, start, end) => {
      const pLen = prefix.length;
      const sLen = suffix.length;

      if (start === end) {
        // Nothing selected: insert paired markers with placeholder selected
        const replacement = `${prefix}${placeholder}${suffix}`;
        const newText = text.substring(0, start) + replacement + text.substring(end);
        return {
          newText,
          selectionStart: start + pLen,
          selectionEnd: start + pLen + placeholder.length,
        };
      }

      const selected = text.substring(start, end);

      // Case A: Selected text itself has the markers: e.g. **sample**
      if (
        selected.startsWith(prefix) &&
        selected.endsWith(suffix) &&
        selected.length >= pLen + sLen
      ) {
        const unwrapped = selected.substring(pLen, selected.length - sLen);
        const newText = text.substring(0, start) + unwrapped + text.substring(end);
        return {
          newText,
          selectionStart: start,
          selectionEnd: start + unwrapped.length,
        };
      }

      // Case B: Markers are immediately outside the selection: **|sample|**
      if (
        start >= pLen &&
        end + sLen <= text.length &&
        text.substring(start - pLen, start) === prefix &&
        text.substring(end, end + sLen) === suffix
      ) {
        const newText = text.substring(0, start - pLen) + selected + text.substring(end + sLen);
        return {
          newText,
          selectionStart: start - pLen,
          selectionEnd: end - pLen,
        };
      }

      // Case C: Wrap selection
      const wrapped = `${prefix}${selected}${suffix}`;
      const newText = text.substring(0, start) + wrapped + text.substring(end);
      return {
        newText,
        selectionStart: start + pLen,
        selectionEnd: start + pLen + selected.length,
      };
    });
  };

  // 2. Headings (H1, H2, H3) at line level
  const handleToggleHeading = (level: 1 | 2 | 3) => {
    executeFormatting((text, start, end) => {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;

      const lineText = text.substring(lineStart, lineEnd);
      const targetPrefix = '#'.repeat(level) + ' ';

      let newLineText: string;
      let newSelectionStart = lineStart;
      let newSelectionEnd = lineStart;

      const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        if (headingMatch[1].length === level) {
          // Same heading level -> toggle off
          newLineText = headingMatch[2];
          newSelectionStart = lineStart + newLineText.length;
          newSelectionEnd = newSelectionStart;
        } else {
          // Different heading level -> switch to target level
          newLineText = `${targetPrefix}${headingMatch[2]}`;
          newSelectionStart = lineStart + newLineText.length;
          newSelectionEnd = newSelectionStart;
        }
      } else if (!lineText.trim()) {
        newLineText = `${targetPrefix}Heading ${level}`;
        newSelectionStart = lineStart + targetPrefix.length;
        newSelectionEnd = lineStart + newLineText.length;
      } else {
        newLineText = `${targetPrefix}${lineText}`;
        newSelectionStart = lineStart + newLineText.length;
        newSelectionEnd = newSelectionStart;
      }

      const newText = text.substring(0, lineStart) + newLineText + text.substring(lineEnd);
      return {
        newText,
        selectionStart: newSelectionStart,
        selectionEnd: newSelectionEnd,
      };
    });
  };

  // 3. Lists (Bulleted or Numbered)
  const handleToggleList = (ordered: boolean) => {
    executeFormatting((text, start, end) => {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;

      const rangeText = text.substring(lineStart, lineEnd);
      const lines = rangeText.split('\n');

      const allHaveTarget = lines.every((line) => {
        if (!line.trim()) return true;
        return ordered ? /^\s*\d+\.\s+/.test(line) : /^\s*[-*+]\s+/.test(line);
      });

      const transformedLines = lines.map((line, idx) => {
        if (!line.trim() && lines.length === 1) {
          return ordered ? '1. List item' : '- List item';
        }
        if (!line.trim()) return line;

        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const stripped = line.replace(/^\s*([-*+]|\d+\.)\s+/, '');

        if (allHaveTarget) {
          return `${indent}${stripped}`;
        }
        return ordered ? `${indent}${idx + 1}. ${stripped}` : `${indent}- ${stripped}`;
      });

      const replacement = transformedLines.join('\n');
      const newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
      return {
        newText,
        selectionStart: lineStart,
        selectionEnd: lineStart + replacement.length,
      };
    });
  };

  // 4. Blockquote
  const handleToggleBlockquote = () => {
    executeFormatting((text, start, end) => {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;

      const rangeText = text.substring(lineStart, lineEnd);
      const lines = rangeText.split('\n');

      const allHaveQuote = lines.every((line) => !line.trim() || /^\s*>+\s*/.test(line));

      const transformed = lines.map((line) => {
        if (!line.trim() && lines.length === 1) return '> Quote text';
        if (!line.trim()) return line;
        if (allHaveQuote) {
          return line.replace(/^(\s*)>+\s?/, '$1');
        }
        return `> ${line.replace(/^(\s*)>+\s?/, '$1')}`;
      });

      const replacement = transformed.join('\n');
      const newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
      return {
        newText,
        selectionStart: lineStart,
        selectionEnd: lineStart + replacement.length,
      };
    });
  };

  // 5. Code (inline vs fenced multiline)
  const handleInsertCode = () => {
    executeFormatting((text, start, end) => {
      let selected = text.substring(start, end);

      // Expand to line boundaries for clean code block checks
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;

      const blockText = text.substring(lineStart, lineEnd);

      // Check 1: Selection or block itself matches fenced block ```lang\n...\n```
      const directFencedMatch = (selected.includes('```') ? selected : blockText).match(
        /^```[a-z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/
      );
      if (directFencedMatch) {
        const targetStart = selected.includes('```') ? start : lineStart;
        const targetEnd = selected.includes('```') ? end : lineEnd;
        const innerCode = directFencedMatch[1];
        const newText = text.substring(0, targetStart) + innerCode + text.substring(targetEnd);
        return {
          newText,
          selectionStart: targetStart,
          selectionEnd: targetStart + innerCode.length,
        };
      }

      // Check 2: Outside fences (previous line is ```lang and next line is ```)
      if (lineStart > 0 && lineEnd < text.length) {
        const prevNewline = text.lastIndexOf('\n', lineStart - 2);
        const prevLineStart = prevNewline === -1 ? 0 : prevNewline + 1;
        const prevLine = text.substring(prevLineStart, lineStart - 1).trim();

        const nextNewline = text.indexOf('\n', lineEnd + 1);
        const nextLineEnd = nextNewline === -1 ? text.length : nextNewline;
        const nextLine = text.substring(lineEnd + 1, nextLineEnd).trim();

        if (/^```[a-z0-9_-]*$/.test(prevLine) && nextLine === '```') {
          // Inside fenced block -> toggle off
          const newText = text.substring(0, prevLineStart) + blockText + text.substring(nextLineEnd);
          return {
            newText,
            selectionStart: prevLineStart,
            selectionEnd: prevLineStart + blockText.length,
          };
        }
      }

      // Multiline code block
      if (selected.includes('\n')) {
        const replacement = `\`\`\`typescript\n${blockText}\n\`\`\``;
        const newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        return {
          newText,
          selectionStart: lineStart + 14,
          selectionEnd: lineStart + 14 + blockText.length,
        };
      }

      // Empty selection: insert placeholder
      if (!selected) {
        const replacement = '`code`';
        const newText = text.substring(0, start) + replacement + text.substring(end);
        return {
          newText,
          selectionStart: start + 1,
          selectionEnd: start + 5,
        };
      }

      // Case A: Selected text itself has markers: `code`
      if (
        selected.startsWith('`') &&
        selected.endsWith('`') &&
        !selected.startsWith('```') &&
        selected.length >= 2
      ) {
        const unwrapped = selected.substring(1, selected.length - 1);
        const newText = text.substring(0, start) + unwrapped + text.substring(end);
        return {
          newText,
          selectionStart: start,
          selectionEnd: start + unwrapped.length,
        };
      }

      // Case B: Markers immediately outside selection: `|code|`
      if (
        start >= 1 &&
        end < text.length &&
        text.charAt(start - 1) === '`' &&
        (start < 2 || text.charAt(start - 2) !== '`') &&
        text.charAt(end) === '`' &&
        (end + 1 >= text.length || text.charAt(end + 1) !== '`')
      ) {
        const newText = text.substring(0, start - 1) + selected + text.substring(end + 1);
        return {
          newText,
          selectionStart: start - 1,
          selectionEnd: end - 1,
        };
      }

      // Case C: Wrap selection
      const replacement = `\`${selected}\``;
      const newText = text.substring(0, start) + replacement + text.substring(end);
      return {
        newText,
        selectionStart: start + 1,
        selectionEnd: start + 1 + selected.length,
      };
    });
  };

  // 6. Link insertion
  const handleInsertLink = () => {
    executeFormatting((text, start, end) => {
      const selected = text.substring(start, end);

      if (!selected) {
        const replacement = `[Link title](https://example.com)`;
        const newText = text.substring(0, start) + replacement + text.substring(end);
        return {
          newText,
          selectionStart: start + 1,
          selectionEnd: start + 11,
        };
      }

      if (/^https?:\/\//i.test(selected.trim())) {
        const replacement = `[Link title](${selected.trim()})`;
        const newText = text.substring(0, start) + replacement + text.substring(end);
        return {
          newText,
          selectionStart: start + 1,
          selectionEnd: start + 11,
        };
      }

      const replacement = `[${selected}](https://example.com)`;
      const newText = text.substring(0, start) + replacement + text.substring(end);
      const urlStart = start + selected.length + 3;
      return {
        newText,
        selectionStart: urlStart,
        selectionEnd: urlStart + 19,
      };
    });
  };

  // 7. Clear Formatting
  const handleClearFormatting = () => {
    executeFormatting((text, start, end) => {
      if (start === end) {
        // Clear line-level formatting on current line
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;

        const line = text.substring(lineStart, lineEnd);
        const cleaned = line.replace(/^\s*(#{1,6}\s+|>+\s+|[-*+]\s+|\d+\.\s+)/, '');
        const newText = text.substring(0, lineStart) + cleaned + text.substring(lineEnd);
        return {
          newText,
          selectionStart: lineStart + cleaned.length,
          selectionEnd: lineStart + cleaned.length,
        };
      }

      const selected = text.substring(start, end);
      let cleaned = selected.replace(/(\*\*|__)(.*?)\1/g, '$2');
      cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
      cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');
      cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
      cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
      cleaned = cleaned.replace(/^(\s*)(#{1,6}\s+|>+\s+|[-*+]\s+|\d+\.\s+)/gm, '$1');
      cleaned = cleaned.replace(/<span\s+style="[^"]*">([\s\S]*?)<\/span>/gi, '$1');
      cleaned = cleaned.replace(/<mark(?:\s+style="[^"]*")?>([\s\S]*?)<\/mark>/gi, '$1');

      const newText = text.substring(0, start) + cleaned + text.substring(end);
      return {
        newText,
        selectionStart: start,
        selectionEnd: start + cleaned.length,
      };
    });
  };

  // 8. Text Color and Background Highlight Handlers
  const handleApplyTextColor = (color: string | null) => {
    executeFormatting((text, start, end) => {
      return applyStyleToText(text, start, end, 'color', color);
    });
    setTextColorPopoverOpen(false);
  };

  const handleApplyHighlight = (color: string | null) => {
    executeFormatting((text, start, end) => {
      return applyStyleToText(text, start, end, 'backgroundColor', color);
    });
    setHighlightPopoverOpen(false);
  };

  // 8. Body Image Insertion via Media Library
  const handleOpenBodyImagePicker = () => {
    const textarea = getTextarea();
    if (textarea) {
      savedSelectionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    } else if (savedSelectionRef.current.start === 0 && savedSelectionRef.current.end === 0) {
      savedSelectionRef.current = {
        start: form.body.length,
        end: form.body.length,
      };
    }
    setBodyImagePickerOpen(true);
  };

  const handleInsertBodyImage = (file: MediaFileItem) => {
    const text = form.body;
    const { start, end } = savedSelectionRef.current;
    const alt = file.originalName.replace(/\.[^.]+$/, '').trim() || 'Article illustration';
    const markdownImage = `\n![${alt}](${file.url})\n`;

    const newText = text.substring(0, start) + markdownImage + text.substring(end);
    updateBody(newText, true);
    toast.success(`Image inserted: ${file.originalName}`);

    const nextPos = start + markdownImage.length;
    pendingSelectionRef.current = { start: nextPos, end: nextPos };
    savedSelectionRef.current = { start: nextPos, end: nextPos };

    if (editorView === 'preview') {
      setEditorView('split');
    }
  };

  // 9. Keyboard Shortcuts inside textarea
  // 9. Keyboard Shortcuts & Smart List Continuation inside textarea
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.ctrlKey || e.metaKey;

    // Shortcuts: Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+Z, Ctrl+Y
    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleToggleInline('**', '**', 'bold text');
      return;
    }
    if (isMod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleToggleInline('*', '*', 'italic text');
      return;
    }
    if (isMod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handleInsertLink();
      return;
    }
    if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (isMod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }

    const textarea = e.currentTarget;
    const text = form.body;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // TAB / SHIFT+TAB List & Text Indentation
    if (e.key === 'Tab') {
      e.preventDefault();

      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;

      const lines = text.substring(lineStart, lineEnd).split('\n');

      if (e.shiftKey) {
        // Shift+Tab: Outdent by up to 2 spaces
        let removedFirst = 0;
        let totalRemoved = 0;

        const outdented = lines.map((line, idx) => {
          let rem = 0;
          let newLine = line;
          if (newLine.startsWith('  ')) {
            newLine = newLine.substring(2);
            rem = 2;
          } else if (newLine.startsWith('\t') || newLine.startsWith(' ')) {
            newLine = newLine.substring(1);
            rem = 1;
          }
          if (idx === 0) removedFirst = rem;
          totalRemoved += rem;
          return newLine;
        });

        const replacement = outdented.join('\n');
        const newBody = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        updateBody(newBody);

        setTimeout(() => {
          textarea.focus();
          const newStart = Math.max(lineStart, start - removedFirst);
          const newEnd = Math.max(newStart, end - totalRemoved);
          textarea.setSelectionRange(newStart, newEnd);
        }, 0);
      } else {
        // Tab: Indent current line or all selected lines by 2 spaces
        const indented = lines.map((line) => '  ' + line);
        const replacement = indented.join('\n');
        const newBody = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        updateBody(newBody);

        setTimeout(() => {
          textarea.focus();
          const newStart = start + 2;
          const newEnd = end + (lines.length * 2);
          textarea.setSelectionRange(newStart, newEnd);
        }, 0);
      }
      return;
    }

    // ENTER: Automatic List Continuation & Clean Exit
    if (e.key === 'Enter') {
      // Shift+Enter: soft line break without continuation
      if (e.shiftKey) {
        e.preventDefault();
        const newBody = text.substring(0, start) + '\n' + text.substring(end);
        updateBody(newBody);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 1, start + 1);
        }, 0);
        return;
      }

      // Normal Enter: Inspect active line
      e.preventDefault(); // Prevent accidental form submission

      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;

      const currentLine = text.substring(lineStart, lineEnd);
      const textBeforeCursor = text.substring(lineStart, start);

      // 1. Ordered list item (e.g., "1. ", "  2. ", "10. ")
      const orderedMatch = textBeforeCursor.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (orderedMatch) {
        const indent = orderedMatch[1];
        const num = parseInt(orderedMatch[2], 10);
        const itemContent = orderedMatch[3];

        // Empty list item: Exit the list by clearing the marker on this line
        if (!itemContent.trim() && currentLine.trim() === `${orderedMatch[2]}.`) {
          const newBody = text.substring(0, lineStart) + text.substring(lineEnd);
          updateBody(newBody);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Continue ordered list with incremented number
        const nextNum = num + 1;
        const continuation = `\n${indent}${nextNum}. `;
        const newBody = text.substring(0, start) + continuation + text.substring(end);
        updateBody(newBody);
        setTimeout(() => {
          textarea.focus();
          const nextPos = start + continuation.length;
          textarea.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }

      // 2. Bulleted list item (e.g., "- ", "* ", "+ ", "  - ")
      const bulletMatch = textBeforeCursor.match(/^(\s*)([-*+])\s*(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const marker = bulletMatch[2];
        const itemContent = bulletMatch[3];

        // Empty bullet item: Exit the list by clearing marker
        if (!itemContent.trim() && currentLine.trim() === marker) {
          const newBody = text.substring(0, lineStart) + text.substring(lineEnd);
          updateBody(newBody);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Continue bullet list with matching marker and indentation
        const continuation = `\n${indent}${marker} `;
        const newBody = text.substring(0, start) + continuation + text.substring(end);
        updateBody(newBody);
        setTimeout(() => {
          textarea.focus();
          const nextPos = start + continuation.length;
          textarea.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }

      // 3. Blockquote item (e.g., "> ")
      const quoteMatch = textBeforeCursor.match(/^(\s*>+\s*)(.*)$/);
      if (quoteMatch) {
        const prefix = quoteMatch[1];
        const quoteContent = quoteMatch[2];

        // Empty quote line: Exit blockquote
        if (!quoteContent.trim() && currentLine.trim() === prefix.trim()) {
          const newBody = text.substring(0, lineStart) + text.substring(lineEnd);
          updateBody(newBody);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        const continuation = `\n${prefix}`;
        const newBody = text.substring(0, start) + continuation + text.substring(end);
        updateBody(newBody);
        setTimeout(() => {
          textarea.focus();
          const nextPos = start + continuation.length;
          textarea.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }

      // 4. Standard paragraph newline
      const newBody = text.substring(0, start) + '\n' + text.substring(end);
      updateBody(newBody);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  // Tag Handling
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!form.tags.includes(trimmed)) {
      setForm((p) => ({ ...p, tags: [...p.tags, trimmed] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  // Image Upload Handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setForm((p) => ({ ...p, coverImage: base64 }));
      toast.success(`Image "${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  };

  // Save Mutation
  const saveArticleMutation = useMutation({
    mutationFn: async (overridePublished?: boolean) => {
      if (!form.title.trim()) throw new Error('Blog title is required');

      const rawSlug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
      const cleanSlug = rawSlug.replace(/^blog-/, '');
      const finalSlug = `blog-${cleanSlug}`;
      const isPublished = typeof overridePublished === 'boolean' ? overridePublished : form.published;

      const contentObj = {
        category: form.category,
        tags: form.tags,
        author: form.author,
        readTime: form.readTime,
        coverImage: form.coverImage,
        coverImageAlt: form.coverImageAlt,
        body: form.body,
        excerpt: form.excerpt,
        publishedAt: form.publishedAt,
        seoTitle: form.seoTitle || form.title,
        seoDescription: form.seoDescription || form.excerpt,
        canonicalUrl: form.canonicalUrl || getTrustedCanonicalBlogUrl(finalSlug),
        socialImage: form.socialImage || form.coverImage,
        hero: {
          title: form.title,
          eyebrow: form.category,
          subtitle: form.excerpt,
        },
      };

      if (!isNew && articleId) {
        // Update existing article by persistent ID
        await api.put(`/cms/pages/by-id/${articleId}`, {
          title: form.title,
          slug: finalSlug,
          metaDescription: form.seoDescription || form.excerpt,
          content: contentObj,
          published: isPublished,
          expectedUpdatedAt: article?.updated_at || (article as any)?.updatedAt,
        });
      } else {
        // Create new article with persistent UUID
        const res = await api.post('/cms/blogs', {
          title: form.title,
          slug: finalSlug,
          metaDescription: form.seoDescription || form.excerpt,
          content: contentObj,
          published: isPublished,
        });
        return res;
      }
    },
    onSuccess: (data: any) => {
      toast.success(isNew ? 'New blog article created successfully!' : 'Blog article updated successfully!');
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      qc.invalidateQueries({ queryKey: ['cms-blog-article', articleId] });
      qc.invalidateQueries({ queryKey: ['public-resources-articles'] });

      if (isNew && data?.id) {
        router.push(`/super/blogs/${data.id}/edit`);
      } else {
        router.push('/super/blogs');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save blog article');
    },
  });

  const cleanSlug = (form.slug || form.title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')).replace(/^blog-/, '');
  const publicBlogUrl = getResolvedPublicBlogUrl(cleanSlug, { isDraft: !form.published });

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicBlogUrl);
    setCopiedLink(true);
    toast.success('Public URL copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Not Found State
  if (articleId && !isNew && isArticleError) {
    return (
      <div className="w-full max-w-[1200px] mx-auto py-16 px-4">
        <Card className="border-destructive/40 bg-card p-8 text-center space-y-4">
          <div className="size-14 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Blog Article Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The article with ID <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{articleId}</code> does not exist or may have been deleted.
          </p>
          <div className="pt-2">
            <Button onClick={() => router.push('/super/blogs')} className="gap-2">
              <ArrowLeft className="size-4" /> Return to Blog Insights
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Loading State
  if (articleId && !isNew && isArticleLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto py-24 px-4 text-center space-y-4">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading article details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-24">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/super/blogs')}
              className="gap-1.5 text-xs h-8 px-2.5"
            >
              <ArrowLeft className="size-3.5" /> Back to Articles
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="size-4" />
              </span>
              {isNew ? 'Create New Article' : `Edit: ${form.title || 'Untitled'}`}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {isNew
              ? 'Author a new editorial insight, technical playbook, or industry analysis.'
              : `Persistent ID: ${articleId || article?.id || 'Auto-assigned'}`}
          </p>
        </div>

        <BreadcrumbNav
          items={[
            { label: 'Dashboard', href: '/super' },
            { label: 'CMS Studio', href: '/super/cms' },
            { label: 'Blogs & Insights', href: '/super/blogs' },
            { label: isNew ? 'New Article' : 'Edit Article' },
          ]}
        />
      </div>

      {/* Dynamic Domain Bar & Action Header */}
      <Card className="p-4 border-border/70 shadow-xs bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1 px-2.5 bg-muted/40">
              <Globe className="size-3.5 text-primary" />
              <span>Domain: {resolvedDomain}</span>
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/30 px-2.5 py-1 rounded-md border border-border/50">
              <span className="truncate max-w-[320px] sm:max-w-[450px]">{publicBlogUrl}</span>
              <button
                type="button"
                onClick={copyPublicLink}
                className="hover:text-foreground transition-colors p-0.5"
                title="Copy public link"
              >
                {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            <a
              href={publicBlogUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <span>Open Public Page</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/super/blogs')}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveArticleMutation.mutate(false)}
              disabled={saveArticleMutation.isPending}
              className="text-xs h-9"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveArticleMutation.mutate(true)}
              disabled={saveArticleMutation.isPending}
              className="gap-2 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              {saveArticleMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {isNew ? 'Publish Article' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-Column Editor Grid (Matches Reference Layout Standard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (8 Cols): Blog Details & Rich Text Editor */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" /> Blog Details
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Craft the article title, permalink slug, and formatted markdown body.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Blog Title */}
              <div className="space-y-1.5">
                <Label htmlFor="blog-title" className="text-xs font-semibold text-foreground">
                  Blog Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="blog-title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Building Autonomous Multi-Country Payroll Systems"
                  className="text-sm font-semibold h-10"
                />
              </div>

              {/* Permalink Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="blog-slug" className="text-xs font-semibold text-foreground">
                  Permalink Slug
                </Label>
                <div className="flex items-center rounded-lg border border-border/70 bg-muted/20 overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                  <span className="px-3 py-2 text-xs font-mono text-muted-foreground bg-muted/40 border-r border-border/70 shrink-0">
                    {resolvedDomain}/blog/
                  </span>
                  <Input
                    id="blog-slug"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    placeholder="autonomous-payroll-systems"
                    className="border-0 shadow-none focus-visible:ring-0 text-xs font-mono h-9 rounded-none"
                  />
                </div>
              </div>

              {/* Rich-Text Markdown Editor Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label htmlFor="blog-editor-body" className="text-xs font-semibold text-foreground">
                    Article Content (Markdown)
                  </Label>
                  <div className="flex items-center gap-1 border border-border/70 p-0.5 rounded-lg bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setEditorView('editor')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        editorView === 'editor' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('split')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        editorView === 'split' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Split View
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('preview')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        editorView === 'preview' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>
                </div>

                {/* Rich-Text Toolbar */}
                <div className="flex items-center gap-1 p-1.5 rounded-t-lg border border-border/70 bg-muted/40 flex-wrap">
                  {/* Undo / Redo */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo (Ctrl+Y)"
                    aria-label="Redo"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCw className="pointer-events-none size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Formatting: Bold, Italic, Strikethrough */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleInline('**', '**', 'bold text')}
                    title="Bold (**text** - Ctrl+B)"
                    aria-label="Bold"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Bold className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleInline('*', '*', 'italic text')}
                    title="Italic (*text* - Ctrl+I)"
                    aria-label="Italic"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Italic className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleInline('~~', '~~', 'strikethrough text')}
                    title="Strikethrough (~~text~~)"
                    aria-label="Strikethrough"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Strikethrough className="pointer-events-none size-3.5" />
                  </Button>

                  {/* Text Color Popover */}
                  <Popover open={textColorPopoverOpen} onOpenChange={setTextColorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onMouseDown={(e) => e.preventDefault()}
                        title="Text Color"
                        aria-label="Text Color"
                        className={`size-7 ${textColorPopoverOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Palette className="pointer-events-none size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className="w-64 p-3 bg-popover border border-border shadow-lg rounded-xl z-50"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Text Color</span>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleApplyTextColor(null)}
                            className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                          >
                            Reset Color
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {[
                            { label: 'Default', value: '#0f172a' },
                            { label: 'Rose / Red', value: '#e11d48' },
                            { label: 'Orange', value: '#ea580c' },
                            { label: 'Amber', value: '#d97706' },
                            { label: 'Green', value: '#16a34a' },
                            { label: 'Teal', value: '#0d9488' },
                            { label: 'Blue', value: '#2563eb' },
                            { label: 'Indigo', value: '#4f46e5' },
                            { label: 'Purple', value: '#7c3aed' },
                            { label: 'Pink', value: '#db2777' },
                            { label: 'Gray', value: '#64748b' },
                          ].map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              title={p.label}
                              aria-label={p.label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleApplyTextColor(p.value)}
                              className="size-7 rounded-md border border-border/80 flex items-center justify-center transition-transform hover:scale-110 focus:ring-2 focus:ring-primary/40 cursor-pointer"
                              style={{ backgroundColor: p.value }}
                            />
                          ))}
                        </div>
                        <div className="pt-2 border-t border-border/60 flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customTextColor}
                            onChange={(e) => setCustomTextColor(e.target.value)}
                            className="size-7 rounded cursor-pointer border border-border p-0.5 bg-background shrink-0"
                            title="Custom Hex Picker"
                            aria-label="Custom color picker"
                          />
                          <Input
                            value={customTextColor}
                            onChange={(e) => setCustomTextColor(e.target.value)}
                            placeholder="#e11d48"
                            className="h-7 text-xs font-mono px-2"
                            aria-label="Custom hex value"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleApplyTextColor(customTextColor)}
                            className="h-7 px-2.5 text-xs font-medium shrink-0 cursor-pointer"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Text Highlight / Background Color Popover */}
                  <Popover open={highlightPopoverOpen} onOpenChange={setHighlightPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onMouseDown={(e) => e.preventDefault()}
                        title="Text Highlight / Background Color"
                        aria-label="Text Highlight"
                        className={`size-7 ${highlightPopoverOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Highlighter className="pointer-events-none size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className="w-64 p-3 bg-popover border border-border shadow-lg rounded-xl z-50"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Highlight Color</span>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleApplyHighlight(null)}
                            className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                          >
                            Reset Highlight
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {[
                            { label: 'Yellow', value: '#fef08a' },
                            { label: 'Green', value: '#bbf7d0' },
                            { label: 'Blue', value: '#bfdbfe' },
                            { label: 'Purple', value: '#e9d5ff' },
                            { label: 'Pink', value: '#fbcfe8' },
                            { label: 'Orange', value: '#fed7aa' },
                          ].map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              title={p.label}
                              aria-label={p.label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleApplyHighlight(p.value)}
                              className="size-7 rounded-md border border-border/80 flex items-center justify-center transition-transform hover:scale-110 focus:ring-2 focus:ring-primary/40 cursor-pointer"
                              style={{ backgroundColor: p.value }}
                            />
                          ))}
                        </div>
                        <div className="pt-2 border-t border-border/60 flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customHighlightColor}
                            onChange={(e) => setCustomHighlightColor(e.target.value)}
                            className="size-7 rounded cursor-pointer border border-border p-0.5 bg-background shrink-0"
                            title="Custom Highlight Picker"
                            aria-label="Custom highlight color picker"
                          />
                          <Input
                            value={customHighlightColor}
                            onChange={(e) => setCustomHighlightColor(e.target.value)}
                            placeholder="#fef08a"
                            className="h-7 text-xs font-mono px-2"
                            aria-label="Custom highlight hex value"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleApplyHighlight(customHighlightColor)}
                            className="h-7 px-2.5 text-xs font-medium shrink-0 cursor-pointer"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Headings */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleHeading(1)}
                    title="Heading 1 (# text)"
                    aria-label="Heading 1"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Heading1 className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleHeading(2)}
                    title="Heading 2 (## text)"
                    aria-label="Heading 2"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Heading2 className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleHeading(3)}
                    title="Heading 3 (### text)"
                    aria-label="Heading 3"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Heading3 className="pointer-events-none size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Lists */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleList(false)}
                    title="Bulleted List (- text)"
                    aria-label="Bulleted List"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <List className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggleList(true)}
                    title="Numbered List (1. text)"
                    aria-label="Numbered List"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ListOrdered className="pointer-events-none size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Quotes, Code, Links */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleToggleBlockquote}
                    title="Blockquote (> text)"
                    aria-label="Blockquote"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Quote className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleInsertCode}
                    title="Code / Code Block (`inline` or ```block```)"
                    aria-label="Code"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Code className="pointer-events-none size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleInsertLink}
                    title="Insert Link ([text](url) - Ctrl+K)"
                    aria-label="Insert Link"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="pointer-events-none size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Media Library Image Insertion */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleOpenBodyImagePicker}
                    title="Insert Image from Media Library"
                    aria-label="Insert Image"
                    className="size-7 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <ImageIcon className="pointer-events-none size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Clear formatting */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClearFormatting}
                    title="Clear Formatting from selected text"
                    aria-label="Clear Formatting"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Eraser className="pointer-events-none size-3.5" />
                  </Button>
                </div>

                {/* Editor Content Area */}
                {editorView === 'editor' && (
                  <div className="space-y-0">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border border-t-0 border-border/70 text-[11px] text-muted-foreground">
                      <span>Markdown Source Mode — Headings and styles are represented by Markdown syntax (e.g. <code className="text-primary font-mono font-bold"># H1</code>, <code className="text-primary font-mono font-bold">**bold**</code>).</span>
                      <button
                        type="button"
                        onClick={() => setEditorView('split')}
                        className="text-primary hover:underline font-medium text-[11px] cursor-pointer"
                      >
                        Switch to Split View for live visual sizing &rarr;
                      </button>
                    </div>
                    <Textarea
                      id="blog-editor-body"
                      ref={textareaRef}
                      value={form.body}
                      onChange={(e) => updateBody(e.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      onSelect={handleUpdateSelection}
                      onKeyUp={handleUpdateSelection}
                      onMouseUp={handleUpdateSelection}
                      onClick={handleUpdateSelection}
                      rows={18}
                      placeholder="Write your article in GitHub-flavored Markdown..."
                      className="rounded-t-none border-t-0 font-mono text-xs leading-relaxed focus-visible:ring-1 resize-y"
                    />
                  </div>
                )}

                {editorView === 'split' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-t-0 border-border/70 rounded-b-lg overflow-hidden">
                    <Textarea
                      id="blog-editor-body"
                      ref={textareaRef}
                      value={form.body}
                      onChange={(e) => updateBody(e.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      onSelect={handleUpdateSelection}
                      onKeyUp={handleUpdateSelection}
                      onMouseUp={handleUpdateSelection}
                      onClick={handleUpdateSelection}
                      rows={18}
                      placeholder="Write markdown here..."
                      className="border-0 rounded-none font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 border-r border-border/60"
                    />
                    <div className="p-5 bg-muted/10 overflow-y-auto max-h-[460px] blog-details-markdown prose">
                      {form.body ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw, rehypeSlug]}
                          components={safeMarkdownComponents}
                        >
                          {formatMarkdownWithSafeBreaks(form.body)}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground italic text-xs">Live styled preview will appear here...</p>
                      )}
                    </div>
                  </div>
                )}

                {editorView === 'preview' && (
                  <div className="p-6 rounded-b-lg border border-t-0 border-border/70 bg-card overflow-y-auto min-h-[400px] max-h-[600px] blog-details-markdown prose">
                    {form.body ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSlug]}
                        components={safeMarkdownComponents}
                      >
                        {formatMarkdownWithSafeBreaks(form.body)}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">No content to preview.</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Formatting: Markdown supported</span>
                  <span>{form.body.split(/\s+/).filter(Boolean).length} words • {form.body.length} characters</span>
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="blog-excerpt" className="text-xs font-semibold text-foreground">
                  Summary / Excerpt
                </Label>
                <Textarea
                  id="blog-excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                  rows={3}
                  placeholder="A concise synopsis displayed on article cards, search listings, and social previews."
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column (4 Cols): Settings & Organization */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Publishing & Status Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Publishing & Status</span>
                <Badge variant={form.published ? 'default' : 'secondary'} className="text-[10px]">
                  {form.published ? 'Published' : 'Draft'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="publish-status-toggle" className="text-xs font-semibold cursor-pointer">
                    Live Publication
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {form.published ? 'Article is visible to the public' : 'Article is saved as an unpublished draft'}
                  </p>
                </div>
                <Switch
                  id="publish-status-toggle"
                  checked={form.published}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, published: checked }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="published-date" className="text-xs font-semibold text-foreground">
                  Publish Date
                </Label>
                <div className="relative">
                  <Input
                    id="published-date"
                    type="date"
                    value={form.publishedAt}
                    onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="author-name" className="text-xs font-semibold text-foreground">
                  Author Name
                </Label>
                <Input
                  id="author-name"
                  value={form.author}
                  onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Master ERP Editorial"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="read-time" className="text-xs font-semibold text-foreground">
                  Reading Time
                </Label>
                <Input
                  id="read-time"
                  value={form.readTime}
                  onChange={(e) => setForm((p) => ({ ...p, readTime: e.target.value }))}
                  placeholder="5 min read"
                  className="text-xs h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Cover Image Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" /> Featured Cover Image
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {form.coverImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border/70 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.coverImage}
                      alt={form.coverImageAlt || 'Cover image'}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, coverImage: '' }))}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/70 text-white hover:bg-destructive transition-colors"
                      title="Remove image"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {/* Replace actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaLibraryOpen(true)}
                      className="text-xs h-8 gap-1.5 text-primary border-primary/40 hover:bg-primary/5 font-medium"
                    >
                      <ImageIcon className="size-3.5" /> Media Library
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="size-3.5" /> Upload File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Drop-zone: opens Media Library */}
                  <div
                    onClick={() => setMediaLibraryOpen(true)}
                    className="border-2 border-dashed border-primary/30 hover:border-primary/70 rounded-xl p-5 text-center cursor-pointer transition-colors bg-primary/5 hover:bg-primary/10 space-y-1.5 group"
                  >
                    <div className="size-10 mx-auto rounded-full bg-primary/15 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ImageIcon className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Choose from Media Library</p>
                    <p className="text-[11px] text-muted-foreground">Select existing media or upload new cover image</p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">or</span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>

                  {/* Quick direct file upload */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="size-3.5" />
                    Direct File Upload from Device
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Media Library Modal */}
              <MediaPickerModal
                open={mediaLibraryOpen}
                onOpenChange={setMediaLibraryOpen}
                allowedTypes={['image/*']}
                title="Choose Cover Image from Media Library"
                onSelect={(file) => {
                  setForm((p) => ({
                    ...p,
                    coverImage: file.url,
                    coverImageAlt: p.coverImageAlt || file.originalName.replace(/\.[^.]+$/, ''),
                  }));
                  toast.success(`Cover image set: ${file.originalName}`);
                }}
              />

              <div className="space-y-1.5">
                <Label htmlFor="cover-url" className="text-xs font-semibold text-foreground">
                  Or paste Image URL
                </Label>
                <Input
                  id="cover-url"
                  value={form.coverImage}
                  onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                  placeholder="/images/blog/blog-1.jpg or https://..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover-alt" className="text-xs font-semibold text-foreground">
                  Alt Text (SEO & Accessibility)
                </Label>
                <Input
                  id="cover-alt"
                  value={form.coverImageAlt}
                  onChange={(e) => setForm((p) => ({ ...p, coverImageAlt: e.target.value }))}
                  placeholder="Descriptive alt text for the cover image"
                  className="text-xs h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Organization & Tags Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Categorization & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="blog-category" className="text-xs font-semibold text-foreground">
                  Primary Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((p) => ({ ...p, category: val }))}
                >
                  <SelectTrigger id="blog-category" className="text-xs h-9">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name} className="text-xs">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-tags" className="text-xs font-semibold text-foreground">
                  Article Tags
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="blog-tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder="Type tag and press enter..."
                    className="text-xs h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddTag(tagInput)}
                    className="text-xs h-8 px-2.5"
                  >
                    Add
                  </Button>
                </div>

                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-destructive transition-colors ml-0.5"
                          title={`Remove ${t}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4. SEO & Social Metadata Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" /> SEO & Social Metadata
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">Search & Share Optimization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* SEO Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seo-title" className="text-xs font-semibold text-foreground">
                    SEO Meta Title
                  </Label>
                  <span className={`text-[10px] ${
                    (form.seoTitle || form.title).length > 60 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'
                  }`}>
                    {(form.seoTitle || form.title).length}/60 chars
                  </span>
                </div>
                <Input
                  id="seo-title"
                  value={form.seoTitle}
                  onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                  placeholder={form.title || 'Optimal 50-60 character title'}
                  className="text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Falls back to article title if left empty. Used in &lt;title&gt; and og:title tags.
                </p>
              </div>

              {/* SEO Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seo-desc" className="text-xs font-semibold text-foreground">
                    SEO Meta Description
                  </Label>
                  <span className={`text-[10px] ${
                    (form.seoDescription || form.excerpt).length > 160 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'
                  }`}>
                    {(form.seoDescription || form.excerpt).length}/160 chars
                  </span>
                </div>
                <Textarea
                  id="seo-desc"
                  value={form.seoDescription}
                  onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                  rows={2}
                  placeholder={form.excerpt || 'Brief 140-160 character description'}
                  className="text-xs resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Falls back to article excerpt if left empty. Used in meta description and og:description tags.
                </p>
              </div>

              {/* Featured Social Preview Image */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Social Share / Open Graph Image</span>
                  {form.socialImage ? (
                    <span className="text-[10px] text-primary font-medium">Custom set</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Inheriting cover image</span>
                  )}
                </Label>

                <div className="relative aspect-[1200/630] max-h-[140px] rounded-lg overflow-hidden border border-border/70 bg-muted/20 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.socialImage || form.coverImage || '/images/blog/blog-1.svg'}
                    alt="Social preview banner"
                    className="size-full object-cover"
                  />
                  {form.socialImage && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, socialImage: '' }))}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/70 text-white hover:bg-destructive transition-colors text-[10px] flex items-center gap-1 px-1.5"
                      title="Revert to article cover image"
                    >
                      <X className="size-3" /> Revert
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSocialImagePickerOpen(true)}
                    className="flex-1 text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <ImageIcon className="size-3.5" /> Select from Media Library
                  </Button>
                </div>

                <Input
                  value={form.socialImage}
                  onChange={(e) => setForm((p) => ({ ...p, socialImage: e.target.value }))}
                  placeholder="Or paste external social image URL..."
                  className="text-xs h-8"
                />
              </div>

              {/* Canonical URL Override */}
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <Label htmlFor="canonical-url" className="text-xs font-semibold text-foreground">
                  Canonical URL Override
                </Label>
                <Input
                  id="canonical-url"
                  value={form.canonicalUrl}
                  onChange={(e) => setForm((p) => ({ ...p, canonicalUrl: e.target.value }))}
                  placeholder={getTrustedCanonicalBlogUrl(cleanSlug)}
                  className="text-xs font-mono h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Default: <span className="font-mono text-[9px] text-foreground/80">{getTrustedCanonicalBlogUrl(cleanSlug)}</span> (Derived from platform canonical domain)
                </p>
              </div>

              {/* Live SERP & Social Snippet Preview */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Google Search Snippet Preview
                </Label>
                <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-1 text-left">
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                    {form.canonicalUrl || getTrustedCanonicalBlogUrl(cleanSlug)}
                  </p>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline line-clamp-1 cursor-pointer">
                    {(form.seoTitle || form.title || 'Untitled Post')} - Master HRMS
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {form.seoDescription || form.excerpt || 'Discover actionable strategies, technical insights, and enterprise workforce automation best practices from Master HRMS.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Body Image Insertion Modal */}
      <MediaPickerModal
        open={bodyImagePickerOpen}
        onOpenChange={setBodyImagePickerOpen}
        allowedTypes={['image/*']}
        title="Insert Image into Article Body"
        onSelect={handleInsertBodyImage}
      />

      {/* Social Preview Image Picker Modal */}
      <MediaPickerModal
        open={socialImagePickerOpen}
        onOpenChange={setSocialImagePickerOpen}
        allowedTypes={['image/*']}
        title="Choose Social Preview / Open Graph Image"
        onSelect={(file) => {
          setForm((p) => ({ ...p, socialImage: file.url }));
          toast.success(`Social preview image set: ${file.originalName}`);
        }}
      />
    </div>
  );
}
