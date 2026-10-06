import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
} from "lucide-react";

export interface SettingsNavItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  hidden?: boolean;
}

export interface SettingsNavCategory {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: SettingsNavItem[];
  hidden?: boolean;
}

interface SettingsNestedNavProps {
  categories: SettingsNavCategory[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  title?: string;
  subtitle?: string;
  className?: string;
  searchPlaceholder?: string;
}

export function SettingsNestedNav({
  categories,
  activeTab,
  onSelectTab,
  title = "Navigation",
  subtitle = "Settings & Preferences",
  className,
  searchPlaceholder = "Search settings...",
}: SettingsNestedNavProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Filter visible categories and items
  const visibleCategories = useMemo(() => {
    return categories
      .filter((cat) => !cat.hidden)
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => !item.hidden),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories]);

  // Find currently active item and its category
  const activeItemInfo = useMemo(() => {
    for (const cat of visibleCategories) {
      const found = cat.items.find((item) => item.id === activeTab);
      if (found) {
        return { category: cat, item: found };
      }
    }
    return null;
  }, [visibleCategories, activeTab]);

  // Initialize all categories as open by default
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of visibleCategories) {
      initial[cat.id] = true;
    }
    setOpenCategories(initial);
  }, [visibleCategories]);

  // Auto-expand category containing active tab
  useEffect(() => {
    if (activeItemInfo?.category.id) {
      setOpenCategories((prev) => ({
        ...prev,
        [activeItemInfo.category.id]: true,
      }));
    }
  }, [activeItemInfo?.category.id]);

  // Filter based on search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleCategories;

    return visibleCategories
      .map((cat) => {
        const catMatches = cat.label.toLowerCase().includes(q);
        const filteredItems = cat.items.filter(
          (item) =>
            catMatches ||
            item.label.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.badge?.toLowerCase().includes(q),
        );
        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [visibleCategories, searchQuery]);

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleItemClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileSheetOpen(false);
  };

  const renderNavList = () => {
    if (filteredCategories.length === 0) {
      return (
        <div className="py-8 px-4 text-center">
          <p className="text-xs font-semibold text-muted-foreground">
            No settings found
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            Try searching for &quot;GST&quot;, &quot;Theme&quot;, &quot;SMTP&quot;, or &quot;Profile&quot;
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs h-7 gap-1"
            >
              <X className="size-3" /> Clear search
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {filteredCategories.map((cat) => {
          const isOpen = searchQuery ? true : (openCategories[cat.id] ?? true);
          const hasActiveChild = cat.items.some((item) => item.id === activeTab);
          const CatIcon = cat.icon;

          return (
            <Collapsible
              key={cat.id}
              open={isOpen}
              onOpenChange={() => toggleCategory(cat.id)}
              className="space-y-1"
            >
              {/* Category Header (Submenu Group) */}
              <div className="flex items-center justify-between px-2 py-1">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-between text-left group hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      {CatIcon && (
                        <div
                          className={cn(
                            "p-1 rounded-md text-muted-foreground transition-colors",
                            hasActiveChild
                              ? "text-primary bg-primary/10"
                              : "group-hover:text-foreground",
                          )}
                        >
                          <CatIcon className="size-3.5" />
                        </div>
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 group-hover:text-foreground">
                        {cat.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/40">
                        {cat.items.length}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="size-3 text-muted-foreground/70" />
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground/70" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
              </div>

              {/* Nested Submenu Items */}
              <CollapsibleContent className="space-y-0.5 pl-2">
                <div className="border-l-2 border-border/50 pl-2 space-y-1 my-1">
                  {cat.items.map((item) => {
                    const isActive = item.id === activeTab;
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 relative group",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "hover:bg-muted/70 text-foreground/85 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {ItemIcon && (
                            <div
                              className={cn(
                                "p-1.5 rounded-lg shrink-0 transition-colors",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted/80 text-muted-foreground group-hover:text-foreground group-hover:bg-muted",
                              )}
                            >
                              <ItemIcon className="size-3.5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-xs font-semibold truncate leading-tight block",
                                  isActive ? "text-primary-foreground" : "text-foreground",
                                )}
                              >
                                {item.label}
                              </span>
                            </div>

                            {item.description && (
                              <p
                                className={cn(
                                  "text-[10px] truncate leading-tight mt-0.5",
                                  isActive
                                    ? "text-primary-foreground/90"
                                    : "text-muted-foreground",
                                )}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Badges or Active Pill */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.2 rounded-md font-mono border",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                  : item.badgeColor || "bg-muted text-muted-foreground border-border/40",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}

                          {isActive && (
                            <ChevronRight className="size-3.5 text-primary-foreground/90 animate-in fade-in slide-in-from-left-1 duration-150" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Sticky Selector Bar (< lg screens) */}
      <div className="lg:hidden w-full mb-4">
        <div className="p-3.5 rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {activeItemInfo?.item && (() => {
              const ActiveIcon = activeItemInfo.item.icon;
              return (
                <>
                  {ActiveIcon && (
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <ActiveIcon className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {activeItemInfo.category.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">•</span>
                      <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-primary/20 text-primary">
                        Active
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {activeItemInfo.item.label}
                    </h4>
                  </div>
                </>
              );
            })()}
          </div>

          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 shrink-0 rounded-xl">
                <Menu className="size-3.5" />
                <span>Sub Menus</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm p-4 overflow-y-auto">
              <SheetHeader className="pb-3 border-b border-border/60 text-left">
                <SheetTitle className="text-base font-bold text-foreground">
                  {title}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </SheetHeader>

              <div className="pt-3 space-y-3">
                {/* Search Bar in Mobile Drawer */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-7 h-8.5 text-xs bg-muted/40 rounded-xl"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {renderNavList()}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sticky Vertical Sidebar (>= lg screens) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-2xs overflow-hidden",
          className,
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/60 bg-muted/15">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm tracking-tight text-foreground">
              {title}
            </h3>
            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
              {visibleCategories.reduce((acc, c) => acc + c.items.length, 0)} Sections
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>

          {/* Quick Filter Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8.5 text-xs bg-background/90 border-border/70 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 p-0.5 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Nested Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {renderNavList()}
        </div>

        {/* Sidebar Footer Info */}
        {activeItemInfo?.item && (
          <div className="p-3 border-t border-border/60 bg-muted/15 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">
              Viewing: <strong className="text-foreground">{activeItemInfo.item.label}</strong>
            </span>
          </div>
        )}
      </aside>
    </>
  );
}

/**
 * Top breadcrumb & section header for the active right content area.
 * Provides immediate visual clarity of current nested sub-menu location with No Tab Space!
 */
export function SettingsSectionBreadcrumb({
  categoryLabel,
  itemLabel,
  itemDescription,
  icon: Icon,
  badge,
  actions,
}: {
  categoryLabel?: string;
  itemLabel: string;
  itemDescription?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xs shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {categoryLabel && (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {categoryLabel}
                </span>
                <span className="text-muted-foreground/40 text-xs">/</span>
              </>
            )}
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {itemLabel}
            </h2>
            {badge}
          </div>
          {itemDescription && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {itemDescription}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
