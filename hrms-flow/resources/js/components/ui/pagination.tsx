/**
 * Pagination component with dark mode support
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface PaginationProps {
    from?: number;
    to?: number;
    total?: number;
    links?: any[];
    currentPage?: number;
    lastPage?: number;
    entityName?: string;
    onPageChange?: (url: string) => void;
    className?: string;
    perPageOptions?: number[];
    currentPerPage: string;
    onPerPageChange: (value: string) => void;
    hidePerPage?: boolean;
}

export function Pagination({
    from = 0,
    to = 0,
    total = 0,
    links = [],
    currentPage,
    lastPage,
    entityName = 'results',
    perPageOptions = [10, 25, 50, 100],
    hidePerPage = false,
    currentPerPage,
    onPerPageChange,
    onPageChange,
    className = '',
}: PaginationProps) {
    const { t } = useTranslation();

    const handlePageChange = (url: string) => {
        if (onPageChange) {
            onPageChange(url);
        } else if (url) {
            window.location.href = url;
        }
    };

    return (
        <div className={cn(
            "p-4 border-t flex flex-wrap gap-3 items-center justify-center md:justify-center lg:justify-between",
            className
        )}>
            <div className="text-sm text-muted-foreground dark:text-gray-300">
                {t("Showing")} <span className="font-medium dark:text-white">{from}</span> {t("to")}{" "}
                <span className="font-medium dark:text-white">{to}</span> {t("of")}{" "}
                <span className="font-medium dark:text-white">{total}</span> {t('results')}
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-center">
                {!hidePerPage && (
                    <>
                        <Label className="text-xs text-muted-foreground">{t("Raws per page:")}</Label>
                        <Select
                            value={currentPerPage || "10"}
                            onValueChange={onPerPageChange}
                        >
                            <SelectTrigger className="w-16 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {perPageOptions.map(option => (
                                    <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                )}
                <div  className="flex flex-wrap gap-1 items-center">
                    {links && links.length > 0 ? (
                        links.map((link: any, i: number) => {
                            // Check if the link is "Next" or "Previous" to use text instead of icon
                            const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";

                            return (
                                <Button
                                    key={`pagination-${i}-${link.label}`}
                                    variant={link.active ? 'default' : 'outline'}
                                    size={isTextLink ? "sm" : "icon"}
                                    className={isTextLink ? "px-3" : "h-8 w-8"}
                                    disabled={!link.url}
                                    onClick={() => link.url && handlePageChange(link.url)}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                </Button>
                            );
                        })
                    ) : (
                        // Simple pagination if links are not available
                        currentPage && lastPage && lastPage > 1 && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={() => handlePageChange(`?page=${currentPage - 1}`)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="px-3 py-1 dark:text-white">
                                    {currentPage} of {lastPage}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= lastPage}
                                    onClick={() => handlePageChange(`?page=${currentPage + 1}`)}
                                >
                                    {t("Next")} <ChevronRight />
                                </Button>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
