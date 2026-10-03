import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Filter, Search, List, LayoutGrid, Grid3X3, Columns, RefreshCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, type ReactNode } from 'react';

interface ViewOption {
    value: string;
    label: string;
    icon: string;
}

interface StatusTab {
    value: string;
    label: string;
    icon: ReactNode;
    count?: number;
}

interface FilterOption {
    name: string;
    label: string;
    type: 'select' | 'date';
    searchable?: boolean;
    options?: { value: string; label: string }[];
    value: string | Date | undefined;
    hideBadgeCancelButton?: boolean;
    onChange: (value: any) => void;
}

interface SearchAndFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSearch: (e: React.FormEvent) => void;
    hideSearch?: boolean;
    searchPlaceholder?: string;
    filters?: FilterOption[];
    statusFilter?: object;
    statusTabs?: StatusTab[];
    activeStatusTab?: string;
    onStatusTabChange?: (value: string) => void;
    hasActiveFilters: () => boolean;
    activeFilterCount: () => number;
    onResetFilters: () => void;
    // View toggle props
    showViewToggle?: boolean;
    activeView?: string;
    onViewChange?: (view: string) => void;
    viewOptions?: ViewOption[];
}

export function SearchAndFilterBar({
    searchTerm,
    onSearchChange,
    onSearch,
    searchPlaceholder,
    filters = [],
    hasActiveFilters,
    activeFilterCount,
    onResetFilters,
    statusTabs,
    activeStatusTab,
    onStatusTabChange,
    // View toggle props
    showViewToggle = false,
    activeView = 'list',
    hideSearch = false,
    onViewChange,
    viewOptions = [
        { value: 'list', label: 'List View', icon: 'List' },
        { value: 'grid', label: 'Grid View', icon: 'Grid3X3' }
    ],
}: SearchAndFiltersProps) {
    const { t } = useTranslation();

    // Build active filter pills from non-empty filter values
    const activeFilters = filters.filter(f => {
        if (!f.value) return false;
        if (typeof f.value === 'string' && (f.value === '_empty_' || f.value === '')) return false;
        return true;
    });

    const getFilterLabel = (filter: FilterOption) => {
        if (filter.type === 'select' && filter.options) {
            const opt = filter.options.find(o => o.value === filter.value);
            return opt?.label ?? String(filter.value);
        }
        if (filter.value instanceof Date) {
            return window?.appSettings?.formatDateTimeSimple(filter.value, false);
        }
        return String(filter.value);
    };

    const removeFilter = (filter: FilterOption) => {
        filter.onChange(filter.type === 'select' ? '_empty_' : undefined);
    };

    const formRef = useRef<HTMLFormElement>(null);
    const isInitialSearchMount = useRef(true);

    useEffect(() => {
        if (isInitialSearchMount.current) {
            isInitialSearchMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            formRef.current?.requestSubmit();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <>
        <div className="w-full p-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {!hideSearch && <form ref={formRef} onSubmit={onSearch} className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder || t("Search...")}
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full px-9 h-8"
                            />
                            {searchTerm && <X className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground cursor-pointer" onClick={(e) => onSearchChange('')} />}
                        </div>
                    </form>}

                    {filters.map((filter) => (
                        <div key={filter.name} className="space-y-2">
                            {filter.type === 'select' && filter.options && (
                                <Select
                                    value={filter.value as string}
                                    onValueChange={(value) => filter.onChange(value)}
                                >
                                    <SelectTrigger className="w-auto h-9 gap-2 w-40">
                                        <SelectValue placeholder={t(`All ${filter.label}`)} />
                                    </SelectTrigger>
                                    <SelectContent searchable={filter.searchable}>
                                        {filter.options.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {filter.type === 'date' && (
                                <DatePicker
                                    selected={filter.value as Date | undefined}
                                    onSelect={(date) => filter.onChange(date)}
                                    onChange={(date) => filter.onChange(date)}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {filters.length > 0 && <>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-gray-500 bg-transparent hover:bg-transparent hover:text-gray-500 dark:text-gray-700  dark:hover:text-gray-700"
                            onClick={onResetFilters}
                            hidden={!hasActiveFilters()}
                        >
                            <RefreshCcw />
                            {t("Clear Filters")}
                        </Button>
                        <Button
                            variant={hasActiveFilters() ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 py-1 cursor-default"
                        >
                            <Filter className="h-4 w-4 mr-1.5" />
                            {t('Filters')}
                            {hasActiveFilters() && (
                                <span className="ml-1 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                    {activeFilterCount()}
                                </span>
                            )}
                        </Button>
                    </>}
                    {showViewToggle && onViewChange && (
                        <div className="border rounded-md p-0.5 mr-2">
                            {viewOptions.map((option) => {
                                const IconComponent = option.icon === 'List' ? List :
                                    option.icon === 'Grid3X3' ? Grid3X3 :
                                        option.icon === 'Columns' ? Columns : LayoutGrid;
                                return (
                                    <Button
                                        key={option.value}
                                        size="sm"
                                        variant={activeView === option.value ? "default" : "ghost"}
                                        className="h-7 px-2"
                                        onClick={() => onViewChange(option.value)}
                                        title={option.label}
                                    >
                                        {option.text ? option.text : <IconComponent className="h-4 w-4" />}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active filter pills (always visible when filters applied) ── */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                    {activeFilters.map((filter) => (
                        <span
                            key={filter.name}
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20"
                        >
                            <span>{filter.label}: {getFilterLabel(filter)}</span>
                            {!filter.hideBadgeCancelButton &&
                                <button
                                    type="button"
                                    onClick={() => removeFilter(filter)}
                                    className="ml-0.5 rounded-full p-0.5 cursor-pointer"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            }
                        </span>
                    ))}
                </div>
            )}

        </div>
            {statusTabs && statusTabs.length > 0 && (
                <div className="border-t px-3">
                    <div className="flex gap-0 overflow-x-auto">
                        {statusTabs.map((tab) => {
                            const isActive = activeStatusTab === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => onStatusTabChange?.(tab.value)}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                        }`}
                                >
                                    <span className="h-4 w-4 flex items-center justify-center">{tab.icon}</span>
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-[1.25rem] ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            </>
    );
}
