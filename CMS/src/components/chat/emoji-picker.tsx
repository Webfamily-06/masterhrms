import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Clock } from "lucide-react";
import { EMOJI_CATEGORIES, ALL_EMOJIS, searchEmojis, EmojiItem } from "./emoji-data";

const RECENT_KEY = "chat_recent_emojis";
const MAX_RECENT = 16;

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

export function EmojiPicker({ onSelectEmoji, onClose, className = "" }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load recent emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentEmojis(parsed.slice(0, MAX_RECENT));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSelect = (emojiChar: string) => {
    onSelectEmoji(emojiChar);

    // Save to recents
    try {
      const updated = [emojiChar, ...recentEmojis.filter((e) => e !== emojiChar)].slice(0, MAX_RECENT);
      setRecentEmojis(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentEmojis([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // Ignore
    }
  };

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return searchEmojis(search);
  }, [search]);

  // Scroll to category header
  const scrollToCategory = (catId: string) => {
    setActiveTab(catId);
    if (catId === "all") {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(`emoji-cat-${catId}`);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className={`w-72 sm:w-80 h-96 flex flex-col bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden font-sans select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Bar */}
      <div className="p-2 border-b border-border/70 bg-muted/20">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all emojis..."
            className="w-full h-8 pl-8 pr-7 text-xs bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 font-sans"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 p-0.5 text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (shown only when not searching) */}
      {!search.trim() && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/50 bg-muted/10 overflow-x-auto no-scrollbar text-xs">
          {recentEmojis.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToCategory("recent")}
              title="Recent"
              className={`p-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center ${
                activeTab === "recent" ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              <Clock className="size-3.5" />
            </button>
          )}
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => scrollToCategory(cat.id)}
              title={cat.label}
              className={`p-1 text-sm rounded-md hover:bg-muted transition-colors flex items-center justify-center shrink-0 ${
                activeTab === cat.id ? "bg-muted" : "opacity-75 hover:opacity-100"
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-2 overflow-y-auto space-y-3 custom-scrollbar"
      >
        {search.trim() ? (
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5 px-1 flex items-center justify-between">
              <span>Search Results</span>
              <span className="text-[10px] opacity-75">{searchResults.length} found</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No emojis found for &quot;{search}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.emoji}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(item.emoji)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    className="size-8 text-xl flex items-center justify-center hover:bg-muted rounded-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Recent Section */}
            {recentEmojis.length > 0 && (
              <div id="emoji-cat-recent">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1 px-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> Recent
                  </span>
                  <button
                    type="button"
                    onClick={clearRecents}
                    className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                  {recentEmojis.map((emoji, idx) => (
                    <button
                      key={`recent-${emoji}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      onMouseEnter={() => {
                        const found = ALL_EMOJIS.find((e) => e.emoji === emoji);
                        setHoveredEmoji(found || { emoji, name: "recent emoji", keywords: [] });
                      }}
                      className="size-8 text-xl flex items-center justify-center hover:bg-muted rounded-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorized Emojis */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.id} id={`emoji-cat-${cat.id}`}>
                <div className="text-[11px] font-semibold text-muted-foreground mb-1 px-1 sticky top-0 bg-popover/90 backdrop-blur-xs py-0.5 z-1">
                  {cat.label}
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                  {cat.emojis.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={() => handleSelect(item.emoji)}
                      onMouseEnter={() => setHoveredEmoji(item)}
                      className="size-8 text-xl flex items-center justify-center hover:bg-muted rounded-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                      title={item.name}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer Preview Bar */}
      <div className="px-3 py-1.5 border-t border-border/70 bg-muted/20 flex items-center gap-2 min-h-8">
        {hoveredEmoji ? (
          <>
            <span className="text-xl shrink-0">{hoveredEmoji.emoji}</span>
            <span className="text-[11px] text-muted-foreground truncate capitalize">
              {hoveredEmoji.name}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">Hover over an emoji to preview</span>
        )}
      </div>
    </div>
  );
}

