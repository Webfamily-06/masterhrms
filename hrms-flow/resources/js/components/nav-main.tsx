import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Store expanded menu state in localStorage
const STORAGE_KEY = 'nav_expanded_items';

export function NavMain({ items = [], position, searchQuery = '' }: { items: NavItem[]; position: 'left' | 'right'; searchQuery?: string }) {
    const page = usePage();
    const { state } = useSidebar();
    const { t } = useTranslation();

    // Check if the document is in RTL mode
    const isRtl = document.documentElement.dir === 'rtl';

    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    // Determine the actual position considering RTL mode
    const effectivePosition = isRtl ? (position === 'left' ? 'right' : 'left') : position;

    // Initialize expanded state
    useEffect(() => {
        // Start with a clean slate - close all menus
        const newExpandedItems: Record<string, boolean> = {};

        // Process menus that should be expanded
        const processMenuItems = (menuItems: NavItem[], parentKey?: string) => {
            menuItems.forEach(item => {
                // If this is the active item or contains the active item
                const isItemActive = isActive(item.href);
                const hasActiveChild = item.children && isChildActive(item.children);

                // If this item or its children are active, expand it
                if (parentKey && (isItemActive || hasActiveChild)) {
                    newExpandedItems[parentKey] = true;
                }

                // If this item has children and is active, has active children, or defaultOpen is true, expand it
                if (item.children && (isItemActive || hasActiveChild || item.defaultOpen === true)) {
                    newExpandedItems[item.title] = true;

                    // Recursively check children
                    processMenuItems(item.children, item.title);
                }

                // Check nested children with their own keys
                if (item.children) {
                    checkNestedChildren(item.children, 1, newExpandedItems);
                }
            });
        };

        processMenuItems(items);

        // Update state and save to localStorage
        setExpandedItems(newExpandedItems);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpandedItems));
        } catch (e) {
        }
    }, [page.url, items]); // Re-run when URL changes or items change

    // Helper function to check nested children for active items
    const checkNestedChildren = (
        children: NavItem[],
        level: number,
        newExpandedItems: Record<string, boolean>
    ) => {
        children.forEach(child => {
            const childKey = `${level}-${child.title}`;
            const isChildItemActive = isActive(child.href);
            const hasActiveChild = child.children && isChildActive(child.children);

            if (child.children && (isChildItemActive || hasActiveChild)) {
                newExpandedItems[childKey] = true;
                checkNestedChildren(child.children, level + 1, newExpandedItems);
            }
        });
    };

    const toggleExpand = (title: string) => {
        const newExpandedItems = {
            ...expandedItems,
            [title]: !expandedItems[title]
        };

        setExpandedItems(newExpandedItems);

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpandedItems));
        } catch (e) {
        }
    };

    const isActive = (href?: string) => {
        if (!href) return false;

        // Extract pathname from href if it's a full URL
        const hrefPath = href.startsWith('http') ? new URL(href).pathname : href;


        // Get current path without query parameters or hash
        const currentPath = page.url.split('?')[0].split('#')[0];

        // Normalize paths by removing trailing slashes
        const normalizedHref = hrefPath.replace(/\/$/, '');
        const normalizedCurrent = currentPath.replace(/\/$/, '');

        // Check exact match first
        if (normalizedCurrent === normalizedHref) {
            return true;
        }

        // Check if current path is a sub-path of href
        // This handles cases like:
        // - /coupons/123 when href is /coupons
        // - /hr/employees/create when href is /hr/employees
        // - /meetings/meetings when href is /meetings/meetings
        if (normalizedCurrent.startsWith(normalizedHref + '/')) {
            return true;
        }

        return false;
    };

    const isChildActive = (children?: NavItem[]) => {
        if (!children) return false;
        return children.some(child => isActive(child.href) || isChildActive(child.children));
    };

    const renderSubMenu = (children: NavItem[], level: number = 1) => {
        return (
            <SidebarMenuSub>
                {children.map(child => (
                    <div key={child.title}>
                        {child.children ? (
                            // Nested submenu item with children
                            <>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton
                                        isActive={isChildActive(child.children)}
                                        onClick={() => toggleExpand(`${level}-${child.title}`)}
                                        className="cursor-pointer"
                                    >
                                        <div className={`flex items-center gap-2 ${effectivePosition === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}>
                                            <span>{child.title}</span>
                                            {state !== "collapsed" && (
                                                expandedItems[`${level}-${child.title}`] ?
                                                    <ChevronDown className="h-3 w-3 ml-auto" /> :
                                                    <ChevronRight className="h-3 w-3 ml-auto" />
                                            )}
                                        </div>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>

                                {/* Render nested children */}
                                {expandedItems[`${level}-${child.title}`] && renderSubMenu(child.children, level + 1)}
                            </>
                        ) : (
                            // Regular submenu item
                            <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={isActive(child.href)}>
                                    {child.target === '_blank' ? (
                                        <a
                                            href={child.href || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-2 ${effectivePosition === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}
                                        >
                                            <span>{child.title}</span>
                                        </a>
                                    ) : (
                                        <Link
                                            href={child.href || '#'}
                                            preserveState={false}
                                            className={`flex items-center gap-2 ${effectivePosition === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}
                                        >
                                            <span>{child.title}</span>
                                        </Link>
                                    )}
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        )}
                    </div>
                ))}
            </SidebarMenuSub>
        );
    };

    // Render dropdown menu items for collapsed sidebar
    const renderCollapsedDropdownItems = (children: NavItem[]) => {
        return children.map(child => {
            if (child.children && child.children.length > 0) {
                return (
                    <DropdownMenuSub key={child.title}>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                            <span>{child.title}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent sideOffset={4}>
                            {renderCollapsedDropdownItems(child.children)}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                );
            }

            return (
                <DropdownMenuItem key={child.title} asChild className="cursor-pointer">
                    {child.target === '_blank' ? (
                        <a
                            href={child.href || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span>{child.title}</span>
                        </a>
                    ) : (
                        <Link href={child.href || '#'} preserveState={false}>
                            <span>{child.title}</span>
                        </Link>
                    )}
                </DropdownMenuItem>
            );
        });
    };

    return (
        <>
            {searchQuery && items.length === 0 && state !== 'collapsed' ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                    <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('No menu found')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">"{searchQuery}"</p>
                </div>
            ) : (
            <>{(() => {
                // Group items by their group label
                const groups: { label: string | null; items: NavItem[] }[] = [];
                let currentGroup: { label: string | null; items: NavItem[] } | null = null;

                items.forEach(item => {
                    const groupLabel = item.group || null;
                    if (!currentGroup || currentGroup.label !== groupLabel) {
                        currentGroup = { label: groupLabel, items: [] };
                        groups.push(currentGroup);
                    }
                    currentGroup.items.push(item);
                });

                return groups.map((group, groupIndex) => (
                    <SidebarGroup key={groupIndex} className={`px-1.5 py-0 ${groupIndex > 0 ? 'mt-3' : ''}`}>
                        {group.label && state !== 'collapsed' && (
                            <SidebarGroupLabel
                                className={`flex w-full px-2 pt-2 pb-1.5 ${effectivePosition === 'right' ? 'justify-end' : 'justify-start'}`}
                            >
                                <span className="text-[13px] font-bold capitalize tracking-wide text-gray-500 dark:text-gray-400 leading-none">
                                    {group.label}
                                </span>
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <div key={item.title}>
                                    {item.children ? (
                                        <>
                                            {state === 'collapsed' ? (
                                                // Collapsed sidebar: show dropdown menu on hover/click
                                                <SidebarMenuItem>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <SidebarMenuButton
                                                                isActive={isChildActive(item.children)}
                                                                tooltip={{ children: item.title }}
                                                                className="cursor-pointer"
                                                            >
                                                                <div className={`flex items-center gap-2 w-full justify-center`}>
                                                                    {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                                                                </div>
                                                            </SidebarMenuButton>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            side={effectivePosition === 'right' ? 'left' : 'right'}
                                                            align="start"
                                                            className="min-w-[200px]"
                                                        >
                                                            <DropdownMenuItem disabled className="opacity-100 cursor-default">
                                                                <span className="font-semibold text-sm">{item.title}</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {renderCollapsedDropdownItems(item.children)}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </SidebarMenuItem>
                                            ) : (
                                                // Expanded sidebar: normal expand/collapse behavior
                                                <>
                                                    <SidebarMenuItem>
                                                        <SidebarMenuButton
                                                            isActive={isChildActive(item.children)}
                                                            onClick={() => toggleExpand(item.title)}
                                                            className="cursor-pointer"
                                                        >
                                                            <div className={`flex items-center gap-2 w-full min-w-0 ${effectivePosition === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}>
                                                                {effectivePosition === 'right' ? (
                                                                    <>
                                                                        <span className="truncate">{item.title}</span>
                                                                        {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                                                                        {expandedItems[item.title] ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                                                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                            <span className="truncate">{item.title}</span>
                                                                            {item.badge && (
                                                                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary text-white flex-shrink-0">
                                                                                    {item.badge.label}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {expandedItems[item.title] ? <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0" /> : <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                    {expandedItems[item.title] && renderSubMenu(item.children)}
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={{ children: item.title }}>
                                                {item.target === '_blank' ? (
                                                    <a
                                                        href={item.href || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`flex items-center gap-2 ${effectivePosition === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}
                                                    >
                                                        {effectivePosition === 'right' ? (
                                                            <>
                                                                {state !== 'collapsed' && <span>{item.title}</span>}
                                                                {item.icon && <item.icon className="h-4 w-4" />}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {item.icon && <item.icon className="h-4 w-4" />}
                                                                {state !== 'collapsed' && <span>{item.title}</span>}
                                                            </>
                                                        )}
                                                    </a>
                                                ) : (
                                                    <Link
                                                        href={item.href || '#'}
                                                        preserveState={false}
                                                        className={`flex items-center gap-2 ${effectivePosition === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}
                                                    >
                                                        {effectivePosition === 'right' ? (
                                                            <>
                                                                {state !== 'collapsed' && <span>{item.title}</span>}
                                                                {item.icon && <item.icon className="h-4 w-4" />}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {item.icon && <item.icon className="h-4 w-4" />}
                                                                {state !== 'collapsed' && <span>{item.title}</span>}
                                                            </>
                                                        )}
                                                    </Link>
                                                )}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )}
                                </div>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ));
            })()}</>
            )}
        </>
    );
}
