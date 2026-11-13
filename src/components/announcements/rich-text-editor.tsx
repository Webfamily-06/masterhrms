import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  RotateCcw,
  RotateCw,
  Eye,
  Edit3,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write announcement content here...",
  minHeight = "220px",
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const pushHistory = (newVal: string) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newVal);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    onChange(newVal);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChange(next);
    }
  };

  const applyWrap = (prefix: string, suffix: string, defaultPlaceholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    const replacement = selected.length > 0 ? `${prefix}${selected}${suffix}` : `${prefix}${defaultPlaceholder}${suffix}`;
    const nextVal = value.substring(0, start) + replacement + value.substring(end);
    pushHistory(nextVal);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = start + replacement.length - suffix.length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 10);
  };

  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const beforeCursor = value.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf("\n");
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const currentLine = value.substring(lineStart, end);
    let nextVal = "";

    if (currentLine.startsWith(prefix)) {
      nextVal = value.substring(0, lineStart) + currentLine.substring(prefix.length) + value.substring(end);
    } else {
      nextVal = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    }

    pushHistory(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const insertLink = () => {
    const url = prompt("Enter hyperlink URL (e.g. https://example.com):", "https://");
    if (!url) return;
    applyWrap("[", `](${url})`, "Link Title");
  };

  const renderPreview = (text: string) => {
    if (!text || !text.trim()) {
      return <p className="text-muted-foreground italic text-sm">No content entered yet.</p>;
    }

    const lines = text.split("\n");
    return (
      <div className="space-y-3 text-sm leading-relaxed text-foreground">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("### ")) {
            return <h3 key={idx} className="text-base font-semibold text-foreground pt-1">{renderInline(trimmed.slice(4))}</h3>;
          }
          if (trimmed.startsWith("## ")) {
            return <h2 key={idx} className="text-lg font-bold text-foreground pt-1.5">{renderInline(trimmed.slice(3))}</h2>;
          }
          if (trimmed.startsWith("# ")) {
            return <h1 key={idx} className="text-xl font-bold text-foreground pt-2">{renderInline(trimmed.slice(2))}</h1>;
          }
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote key={idx} className="border-l-4 border-primary/50 pl-3 py-1 my-1 italic text-muted-foreground bg-muted/20 rounded-r">
                {renderInline(trimmed.slice(2))}
              </blockquote>
            );
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <li key={idx} className="ml-4 list-disc text-foreground">
                {renderInline(trimmed.slice(2))}
              </li>
            );
          }
          if (/^\d+\.\s/.test(trimmed)) {
            const content = trimmed.replace(/^\d+\.\s/, "");
            return (
              <li key={idx} className="ml-4 list-decimal text-foreground">
                {renderInline(content)}
              </li>
            );
          }
          if (trimmed.length === 0) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx}>{renderInline(line)}</p>;
        })}
      </div>
    );
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let current = text;
    let key = 0;
    const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(current)) !== null) {
      if (match.index > lastIndex) {
        parts.push(current.substring(lastIndex, match.index));
      }
      if (match[2] && match[3]) {
        parts.push(
          <a
            key={key++}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {match[2]}
          </a>
        );
      } else if (match[4]) {
        parts.push(<strong key={key++} className="font-semibold text-foreground">{match[4]}</strong>);
      } else if (match[5]) {
        parts.push(<em key={key++} className="italic">{match[5]}</em>);
      } else if (match[6]) {
        parts.push(<del key={key++} className="line-through text-muted-foreground">{match[6]}</del>);
      } else if (match[7]) {
        parts.push(<code key={key++} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{match[7]}</code>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < current.length) {
      parts.push(current.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 bg-muted/40 border-b">
        <div className="flex flex-wrap items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyWrap("**", "**", "Bold text")}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyWrap("*", "*", "Italic text")}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyWrap("~~", "~~", "Strikethrough text")}
            className="h-8 w-8 p-0"
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyLinePrefix("# ")}
            className="h-8 w-8 p-0"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyLinePrefix("## ")}
            className="h-8 w-8 p-0"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyLinePrefix("### ")}
            className="h-8 w-8 p-0"
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyLinePrefix("- ")}
            className="h-8 w-8 p-0"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyLinePrefix("1. ")}
            className="h-8 w-8 p-0"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyLinePrefix("> ")}
            className="h-8 w-8 p-0"
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyWrap("`", "`", "code")}
            className="h-8 w-8 p-0"
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertLink}
            className="h-8 w-8 p-0"
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted p-0.5 rounded border">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "write"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="h-3 w-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {activeTab === "write" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            pushHistory(e.target.value);
          }}
          placeholder={placeholder}
          className="border-0 focus-visible:ring-0 rounded-none resize-y p-3.5 font-mono text-sm leading-relaxed"
          style={{ minHeight }}
        />
      ) : (
        <div
          className="p-4 bg-muted/10 overflow-y-auto"
          style={{ minHeight }}
        >
          {renderPreview(value)}
        </div>
      )}
    </div>
  );
}

export function FormattedAnnouncementContent({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split("\n");

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let current = text;
    let key = 0;
    const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(current)) !== null) {
      if (match.index > lastIndex) {
        parts.push(current.substring(lastIndex, match.index));
      }
      if (match[2] && match[3]) {
        parts.push(
          <a
            key={key++}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {match[2]}
          </a>
        );
      } else if (match[4]) {
        parts.push(<strong key={key++} className="font-semibold text-foreground">{match[4]}</strong>);
      } else if (match[5]) {
        parts.push(<em key={key++} className="italic">{match[5]}</em>);
      } else if (match[6]) {
        parts.push(<del key={key++} className="line-through text-muted-foreground">{match[6]}</del>);
      } else if (match[7]) {
        parts.push(<code key={key++} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{match[7]}</code>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < current.length) {
      parts.push(current.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return <h3 key={idx} className="text-base font-semibold text-foreground pt-1">{renderInline(trimmed.slice(4))}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={idx} className="text-lg font-bold text-foreground pt-1.5">{renderInline(trimmed.slice(3))}</h2>;
        }
        if (trimmed.startsWith("# ")) {
          return <h1 key={idx} className="text-xl font-bold text-foreground pt-2">{renderInline(trimmed.slice(2))}</h1>;
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-4 border-primary/50 pl-3 py-1 my-1 italic text-muted-foreground bg-muted/20 rounded-r">
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <li key={idx} className="ml-4 list-disc text-foreground">
              {renderInline(trimmed.slice(2))}
            </li>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const c = trimmed.replace(/^\d+\.\s/, "");
          return (
            <li key={idx} className="ml-4 list-decimal text-foreground">
              {renderInline(c)}
            </li>
          );
        }
        if (trimmed.length === 0) {
          return <div key={idx} className="h-1.5" />;
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

