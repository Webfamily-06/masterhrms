import { useEffect, useState, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { usePage, router } from '@inertiajs/react';
import ReactCountryFlag from 'react-country-flag';
import { cn } from '@/lib/utils';
import { Ban, Trash2, Eye, Save } from 'lucide-react';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Pagination } from '@/components/ui/pagination';
import { useLayout } from '@/contexts/LayoutContext';

interface Language {
  code: string;
  name: string;
  countryCode?: string;
  enabled?: boolean;
}

interface PageProps {
  languages: Language[];
  defaultLang: string;
  defaultData: Record<string, string>;
  [key: string]: any; // Fix for Inertia PageProps constraint
}

export default function ManageLanguagePage() {
  const { t } = useTranslation();
  const { languages, defaultLang, defaultData, globalSettings } = usePage<PageProps>().props;
  const isDemo = globalSettings?.is_demo || false;
  const { position } = useLayout();

  // Initialize selectedLang from props
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [labels, setLabels] = useState<{ [key: string]: string }>(defaultData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 30;

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Reset page to 1 when language changes
  useEffect(() => {
    setCurrentPage(1);
    setSearch('');
  }, [selectedLang]);

  // Update selectedLang when defaultLang changes (from Inertia navigation)
  useEffect(() => {
    setSelectedLang(defaultLang);
  }, [defaultLang]);

  // Load language data from backend when component mounts or language changes
  useEffect(() => {
    // If defaultData is already available for the current language, use it
    if (selectedLang === defaultLang && Object.keys(defaultData).length > 0) {
      setLabels(defaultData);
      return;
    }

    setLoading(true);
    fetch(`${route('language.load')}?lang=${selectedLang}`)
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setLabels(res.data);
        } else {
          setLabels({});
        }
        setLoading(false);
      })
      .catch(() => {
        setLabels({});
        setLoading(false);
        toast.error(t('Failed to load language file'));
      });
  }, [selectedLang, defaultLang, defaultData, t]);

  // Filtered labels based on search — used for pagination count
  const filteredEntries = useMemo(() => {
    return Object.entries(labels).filter(([key, value]) =>
      key.toLowerCase().includes(search.toLowerCase()) ||
      value.toLowerCase().includes(search.toLowerCase())
    );
  }, [labels, search]);

  // Paginated slice of filtered entries
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredEntries.slice(start, start + perPage);
  }, [filteredEntries, currentPage, perPage]);

  // Build pagination links with dots truncation like reference screenshot
  const paginationLinks = useMemo(() => {
    const totalPages = Math.ceil(filteredEntries.length / perPage);
    const links: { url: string | null; label: string; active: boolean }[] = [];

    if (totalPages <= 1) return links;

    // Previous
    links.push({
      url: currentPage > 1 ? `?page=${currentPage - 1}` : null,
      label: '&laquo; Previous',
      active: false,
    });

    // Build page number range with dots
    // Always show: first, last, current, and 2 around current
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    // Always include page 1
    rangeWithDots.push(1);

    // Dots after page 1 if needed
    if (range[0] > 2) {
      rangeWithDots.push('...');
    }

    // Middle pages
    range.forEach(p => rangeWithDots.push(p));

    // Dots before last page if needed
    if (range[range.length - 1] < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always include last page
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    // Build link objects
    rangeWithDots.forEach((page) => {
      if (page === '...') {
        links.push({ url: null, label: '...', active: false });
      } else {
        links.push({
          url: `?page=${page}`,
          label: String(page),
          active: page === currentPage,
        });
      }
    });

    // Next
    links.push({
      url: currentPage < totalPages ? `?page=${currentPage + 1}` : null,
      label: 'Next &raquo;',
      active: false,
    });

    return links;
  }, [filteredEntries.length, currentPage, perPage]);

  const paginationFrom = filteredEntries.length === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const paginationTo = Math.min(currentPage * perPage, filteredEntries.length);

  const handlePageChange = (url: string) => {
    const pageNum = parseInt(new URL(url, window.location.origin).searchParams.get('page') || '1');
    setCurrentPage(pageNum);
    // Scroll to top of translation grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLabelChange = (key: string, value: string) => {
    setLabels((prev) => ({ ...prev, [key]: value }));
  };

  // Save language data to backend
  const handleSave = (e) => {
    // Prevent default form submission behavior
    if (e) e.preventDefault();

    setSaving(true);

    // Use fetch instead of Inertia to prevent page refresh
    fetch(route('language.save'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Add this to ensure Laravel detects AJAX request
      },
      body: JSON.stringify({
        _method: 'PATCH', // Laravel method spoofing for PATCH
        lang: selectedLang,
        data: labels
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast.success(data.success);
        } else if (data.error) {
          if (isDemo && data.message) {
            toast.error(data.message);
          } else {
            toast.error(data.error);
          }
        } else {
          if (isDemo && data.message) {
            toast.error(data.message);
          } else {
            toast.success(t('Language updated successfully'));
          }
        }
        setSaving(false);
      })
      .catch(error => {
        toast.error(t('Failed to update language file'));
        setSaving(false);
      });

    // Return false to prevent any form submission
    return false;
  };

  const handleDisableLanguage = () => {
    fetch(route('languages.toggle', { languageCode: selectedLang }), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        'Accept': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message || t('Language status updated successfully'));
          // Refresh the page to update the language list
          window.location.reload();
        } else {
          if (isDemo && data.message) {
            toast.error(data.message);
          } else {
            toast.error(data.error || t('Failed to update language status'));
          }
        }
      })
      .catch(error => {
        toast.error(t('Failed to update language status'));
      });
  };

  const handleDeleteLanguage = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteLanguage = () => {
    setShowDeleteModal(false);

    fetch(route('languages.delete', { languageCode: selectedLang }), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        'Accept': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message || t('Language deleted successfully'));
          // Redirect to first available language or English
          const remainingLanguages = languages.filter(l => l.code !== selectedLang);
          const nextLang = remainingLanguages.find(l => l.code === 'en') || remainingLanguages[0];
          if (nextLang) {
            router.get(route('manage-language', { lang: nextLang.code }));
          } else {
            router.get(route('manage-language'));
          }
        } else {
          if (isDemo && data.message) {
            toast.error(data.message);
          } else {
            toast.error(data.error || t('Failed to delete language'));
          }
        }
      })
      .catch(error => {
        toast.error(t('Failed to delete language'));
      });
  };

  return (
    <PageTemplate
      title={t('Manage Language')}
      description="Manage language translations"
      url="/manage-language"
      actions={(() => {
        const currentLang = languages.find(l => l.code === selectedLang);
        const isDisabled = currentLang?.enabled === false;
        const actions: any[] = [
          {
            label: saving ? t('Saving...') : t('Save Changes'),
            icon: saving
              ? <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
              : <Save className="h-4 w-4" />,
            variant: 'default',
            onClick: () => handleSave(null)
          }
        ];
        if (selectedLang !== 'en') {
          actions.push(
            {
              label: isDisabled ? t('Enable Language') : t('Disable Language'),
              icon: isDisabled ? <Eye className="h-4 w-4" /> : <Ban className="h-4 w-4" />,
              variant: isDisabled ? 'secondary' : 'outline',
              onClick: handleDisableLanguage
            },
            {
              label: t('Delete Language'),
              icon: <Trash2 className="h-4 w-4" />,
              variant: 'destructive',
              onClick: handleDeleteLanguage
            }
          );
        }
        return actions;
      })()}
    >
    <style>{`
        main {
        max-width: 100vw;
        overflow-x: clip !important;
        }
        body {
        overflow-x: clip !important;
        }
    `}</style>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar: Language List */}
        <div className="md:w-64 flex-shrink-0">
          <div className="sticky top-20">
            <ScrollArea className="h-[calc(100vh-5rem)]" dir={position === 'right' ? 'rtl' : 'ltr'}>
              <Card className="p-3 flex flex-col gap-2">
                {languages.map((lang) => {
                  const isDisabled = lang.enabled === false;
                  return (
                    <Button
                      key={lang.code}
                      variant="ghost"
                      className={cn('w-full text-start', {
                        'bg-muted font-medium': selectedLang === lang.code,
                        'opacity-60': isDisabled,
                      })}
                      onClick={() => {
                        if (selectedLang !== lang.code) {
                          // Navigate to the language page using Inertia
                          router.get(route('manage-language', { lang: lang.code }));
                        }
                      }}
                    >
                      {lang.countryCode && (
                        <ReactCountryFlag
                          countryCode={lang.countryCode}
                          svg
                          style={{ width: '1.2em', height: '1.2em' }}
                        />
                      )}
                      <span className="flex-1">{lang.name}</span>
                      {isDisabled && (
                        <Ban className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  );
                })}
              </Card>
            </ScrollArea>
          </div>
        </div>
        {/* Main Content: Language Labels */}
        <div className="flex-1">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold">{t('Edit Labels for')} {languages.find(l => l.code === selectedLang)?.name}</h2>
              <Input
                placeholder={t('Search labels...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-72"
              />
            </div>
            {loading ? (
              <div>{t('Loading...')}</div>
            ) : (
              <>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(e); return false; }}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {paginatedEntries.map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground truncate mb-1">{key}</label>
                          <Input
                            className="w-full"
                            value={value}
                            onChange={e => handleLabelChange(key, e.target.value)}
                          />
                        </div>
                      ))}
                      {paginatedEntries.length === 0 && (
                        <div className="col-span-3 text-center py-8 text-muted-foreground">
                          {t('No labels found')}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
                {/* Pagination — outside form to prevent form submit on page change */}
                <div className="mt-4">
                  <Pagination
                    from={paginationFrom}
                    to={paginationTo}
                    total={filteredEntries.length}
                    links={paginationLinks}
                    entityName={t('labels')}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <CrudDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteLanguage}
        itemName={languages.find(l => l.code === selectedLang)?.name || ''}
        entityName={t('Language')}
      />
    </PageTemplate>
  );
}
