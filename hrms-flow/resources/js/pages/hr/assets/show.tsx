// pages/hr/assets/show.tsx
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, QrCode, Eye, Calendar, Download, DollarSign, Package,
  CheckCircle2, MapPin, Truck, FileText, Hash, ShieldCheck, TrendingDown,
  Clock, Info, User, Edit, Trash2, ShieldAlert, AlertCircle, ExternalLink, Wrench, RefreshCw, UserCheck, Layers
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { Progress } from '@/components/ui/progress';
import { getImagePath } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AssetShow() {
  const { t } = useTranslation();
  const { auth, asset, employees, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [isUpdateMaintenanceModalOpen, setIsUpdateMaintenanceModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fadeUp = (delay = 0) =>
    `transition-all duration-500 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`
    + (delay ? ` delay-${delay}` : '');

  // Generate depreciation trend chart data
  const generateChartData = () => {
    if (!asset.purchase_cost) return [];

    const startYear = asset.purchase_date ? new Date(asset.purchase_date).getFullYear() : new Date().getFullYear();
    const usefulYears = asset.depreciation?.useful_life_years || (asset.useful_life ? Math.ceil(asset.useful_life / 12) : 5);
    const purchaseCost = Number(asset.purchase_cost);
    const salvageVal = Number(asset.depreciation?.salvage_value || asset.salvage_value || 0);

    const annualDepreciation = (purchaseCost - salvageVal) / usefulYears;
    const data = [];

    for (let i = 0; i <= usefulYears; i++) {
      const yearVal = Math.max(salvageVal, Math.round(purchaseCost - (annualDepreciation * i)));
      data.push({
        year: (startYear + i).toString(),
        value: yearVal,
        label: window.appSettings?.formatCurrency(yearVal) || `$${yearVal}`
      });
    }
    return data;
  };

  const chartData = generateChartData();
  const [currentMaintenance, setCurrentMaintenance] = useState<any>(null);

  const handleBackToList = () => {
    router.get(route('hr.assets.index'));
  };

  const handleUpdateMaintenance = (maintenance: any) => {
    setCurrentMaintenance(maintenance);
    setIsUpdateMaintenanceModalOpen(true);
  };

  const handleDownloadQrCode = () => {
    window.open(route('hr.assets.download-qrcode', asset.id), '_blank');
  };

  const handleUpdateMaintenanceSubmit = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating maintenance'));

    router.put(route('hr.assets.update-maintenance', currentMaintenance.id), formData, {
      onSuccess: (page) => {
        setIsUpdateMaintenanceModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash?.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update maintenance {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const badgeColorPalette = [
    'bg-amber-50 text-amber-700 ring-amber-600/20',
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    'bg-blue-50 text-blue-700 ring-blue-600/20',
    'bg-purple-50 text-purple-700 ring-purple-600/20',
    'bg-rose-50 text-rose-700 ring-rose-600/20',
    'bg-teal-50 text-teal-700 ring-teal-600/20'
  ];

  const getTypeBadgeStyle = (str: string) => {
    if (!str) return badgeColorPalette[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % badgeColorPalette.length;
    return badgeColorPalette[index];
  };

  const handleAssignSubmit = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Assigning asset...'));

    router.post(route('hr.assets.assign', asset.id), formData, {
      onSuccess: (page) => {
        setIsAssignModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash?.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to assign asset: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  // Define page actions
  const pageActions = [];

  pageActions.push({
    label: t('Back'),
    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
    variant: 'outline' as const,
    onClick: handleBackToList
  });

  if (asset.qr_code) {
    pageActions.push({
      label: t('Download QR'),
      icon: <QrCode className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: handleDownloadQrCode
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Asset Management') },
    { title: t('Assets'), href: route('hr.assets.index') },
    { title: asset.name || t('Asset Details') }
  ];

  // Status badges config matching system design standards
  const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
    'available': { label: t('Available'), class: 'bg-green-50 text-green-700 ring-green-600/20', icon: CheckCircle2 },
    'assigned': { label: t('Assigned'), class: 'bg-blue-50 text-blue-700 ring-blue-600/20', icon: UserCheck },
    'under_maintenance': { label: t('Under Maintenance'), class: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: Wrench },
    'disposed': { label: t('Disposed'), class: 'bg-red-50 text-red-700 ring-red-600/20', icon: AlertCircle }
  };

  const conditionConfig: Record<string, { label: string; class: string }> = {
    'new': { label: t('New'), class: 'bg-green-50 text-green-700 ring-green-600/20' },
    'good': { label: t('Good'), class: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
    'fair': { label: t('Fair'), class: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    'poor': { label: t('Poor'), class: 'bg-red-50 text-red-700 ring-red-600/20' }
  };

  const maintenanceStatusColors: Record<string, string> = {
    'scheduled': 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'in_progress': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    'completed': 'bg-green-50 text-green-700 ring-green-600/20',
    'cancelled': 'bg-red-50 text-red-700 ring-red-600/20'
  };

  // Calculate depreciation percentage
  const calculateDepreciationPercentage = () => {
    if (!asset.purchase_cost || asset.purchase_cost === 0 || !asset.depreciation) return 0;
    const pct = ((asset.purchase_cost - asset.depreciation.current_value) / asset.purchase_cost) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  const depPercentage = calculateDepreciationPercentage();

  // Warranty Days Remaining
  const getWarrantyInfo = () => {
    if (!asset.warranty_expiry_date) return null;
    const expiry = new Date(asset.warranty_expiry_date);
    const today = new Date();
    const daysLeft = differenceInDays(expiry, today);
    return {
      dateFormatted: window.appSettings?.formatDateTimeSimple(asset.warranty_expiry_date, false) || format(expiry, 'MMM dd, yyyy'),
      isExpired: daysLeft < 0,
      daysLeft: Math.abs(daysLeft)
    };
  };

  const warrantyInfo = getWarrantyInfo();
  const currentStatus = statusConfig[asset.status] || { label: asset.status, class: 'bg-gray-50 text-gray-700 border-gray-200', icon: Info };
  const StatusIcon = currentStatus.icon;

  return (
    <PageTemplate
      title={t('Asset Details')}
      description={t('Full specs, current assignment, maintenance logs, and financial depreciation.')}
      url={`/hr/assets/${asset.id}`}
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding={true}
    >
      <style>{`
        main {
          overflow-x: clip !important;
        }
        body {
          overflow-x: clip !important;
        }
      `}</style>
      <div className="space-y-6 pb-8">

        {/* 1. Header Banner & Quick Specs Card */}
        <Card className={`overflow-hidden border-gray-300 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900 ${fadeUp(0)}`}>
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* Asset Media Preview */}
              <div className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-300 dark:border-gray-700 p-6 flex flex-col items-center justify-center bg-gray-50/70 dark:bg-gray-950/40 relative">
                <a
                  href={asset.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative group w-full h-[220px] flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 p-4 shadow-sm overflow-hidden"
                >
                  <img
                    src={asset.image_url}
                    alt={asset.name}
                    className="max-w-full max-h-full object-contain group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </a>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${currentStatus.class}`}>

                    {currentStatus.label}
                  </Badge>
                  {asset.condition && (
                    <Badge variant="outline" className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${(conditionConfig[asset.condition] || {}).class || ''}`}>
                      {t(asset.condition)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Main Information Header */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 dark:border-gray-700 pb-4 mb-5">
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{asset.name}</h1>
                        <Badge variant="outline" className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-800/60 dark:text-gray-300">
                          {asset.asset_code || 'N/A'}
                        </Badge>
                      </div>
                      {asset.asset_type?.name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          <span>{asset.asset_type.name}</span>
                          {asset.location && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">•</span>
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span>{asset.location}</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {asset.purchase_cost && (
                      <div className="text-left sm:text-right px-4 py-2.5 rounded-xl">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Original Cost')}</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {window.appSettings?.formatCurrency(asset.purchase_cost)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Specifications Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                        <Hash className="h-3.5 w-3.5 text-gray-400" />
                        <span>{t('Serial Number')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={asset.serial_number || '-'}>
                        {asset.serial_number || '-'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{t('Purchase Date')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{asset.purchase_date ? (window.appSettings?.formatDateTimeSimple(asset.purchase_date, false) || format(new Date(asset.purchase_date), 'MMM dd, yyyy')) : '-'}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                        <span>{t('Warranty')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {warrantyInfo ? (
                          <span className={warrantyInfo.isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {warrantyInfo.isExpired ? t('Expired') : warrantyInfo.dateFormatted}
                          </span>
                        ) : '-'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{t('Useful Life')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {(asset.useful_life || asset.depreciation?.useful_life_years) ? `${asset.useful_life || (asset.depreciation?.useful_life_years * 12)} ${t('Months')}` : '-'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                        <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                        <span>{t('Salvage Value')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {(asset.salvage_value || asset.depreciation?.salvage_value) ? window.appSettings?.formatCurrency(asset.salvage_value || asset.depreciation?.salvage_value) : '-'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-3.5 w-3.5 text-gray-400" />
                        <span>{t('Depreciation Method')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize truncate">
                        {asset.depreciation?.method ? asset.depreciation.method.replace('_', ' ') : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {asset.description && (
                  <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1.5">{t('Notes')}:</span>
                    <div className="mt-1 max-h-[100px] overflow-y-auto pr-1">
                      {asset.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Content Grid (70% Left Main Details, 30% Right Quick Panel) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Tabs & Detailed Views) */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="assignments" className="w-full">
              <TabsList className="w-full justify-start bg-white dark:bg-gray-900 p-1.5 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm gap-1">
                <TabsTrigger
                  value="assignments"
                  className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  {t('Assignments')}
                </TabsTrigger>
                <TabsTrigger
                  value="maintenance"
                  className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <Wrench className="h-3.5 w-3.5 mr-1.5" />
                  {t('Maintenance')}
                </TabsTrigger>
                <TabsTrigger
                  value="depreciation"
                  className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                  {t('Depreciation')}
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  {t('Documents')}
                </TabsTrigger>
              </TabsList>              {/* Assignment History Tab */}
              <TabsContent value="assignments" className="mt-4">
                <Card className="shadow-sm border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                  <CardHeader className="py-4 px-6 border-b border-gray-300 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Assignment History')}</CardTitle>
                    <CardDescription className="text-xs">{t('Complete history of users who have been assigned this asset.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {asset.assignments && asset.assignments.length > 0 ? (
                      <div className="max-h-[700px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 shadow-xs">
                            <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                              <TableHead>{t('Employee')}</TableHead>
                              <TableHead>{t('Check-Out')}</TableHead>
                              <TableHead>{t('Return Date')}</TableHead>
                              <TableHead>{t('Status')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {asset.assignments.map((assignment: any) => (
                              <TableRow key={assignment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                <TableCell>
                                  {assignment.employee ? (
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={assignment.employee?.avatar || getImagePath('avatars/avatar.png')}
                                        alt={assignment.employee?.name}
                                        className="h-8 w-8 rounded-full object-cover border border-gray-300"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = getImagePath('avatars/avatar.png');
                                        }}
                                      />
                                      <div>
                                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{assignment.employee?.name}</div>
                                        <div className="text-[11px] text-gray-500">{assignment.employee?.email}</div>
                                      </div>
                                    </div>
                                  ) : <span className="text-xs text-gray-400">-</span>}
                                </TableCell>
                                <TableCell className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                  {assignment.checkout_date ? (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                      <span>{window.appSettings?.formatDateTimeSimple(assignment.checkout_date, false) || assignment.checkout_date}</span>
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                  {assignment.checkin_date ? (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                      <span>{window.appSettings?.formatDateTimeSimple(assignment.checkin_date, false) || assignment.checkin_date}</span>
                                    </div>
                                  ) : assignment.expected_return_date ? (
                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                      <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                      <span>{t('Expected')}: {window.appSettings?.formatDateTimeSimple(assignment.expected_return_date, false) || assignment.expected_return_date}</span>
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  {assignment.checkin_date ? (
                                    <Badge variant="outline" className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20">
                                      {t('Returned')}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                                      {t('Assigned')}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-xs text-gray-500">
                        <User className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        {t('No assignment history recorded')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Maintenance History Tab */}
              <TabsContent value="maintenance" className="mt-4">
                <Card className="shadow-sm border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                  <CardHeader className="py-4 px-6 border-b border-gray-300 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Maintenance History')}</CardTitle>
                    <CardDescription className="text-xs">{t('Scheduled and past repairs or servicing for this asset.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {asset.maintenances && asset.maintenances.length > 0 ? (
                      <div className="max-h-[700px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 shadow-xs">
                            <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                              <TableHead>{t('Type')}</TableHead>
                              <TableHead>{t('Dates')}</TableHead>
                              <TableHead>{t('Status')}</TableHead>
                              <TableHead>{t('Cost')}</TableHead>
                              <TableHead className="text-right">{t('Action')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {asset.maintenances.map((m: any) => (
                              <TableRow key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                <TableCell>
                                  <Badge variant="outline" className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${getTypeBadgeStyle(m.maintenance_type || '')}`}>
                                    {m.maintenance_type ? t(m.maintenance_type.replace('_', ' ')) : '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                  {m.start_date ? (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                      <span>{window.appSettings?.formatDateTimeSimple(m.start_date, false)}</span>
                                    </div>
                                  ) : <div>-</div>}
                                  {m.end_date && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                                      <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                                      <span>{t('To')}: {window.appSettings?.formatDateTimeSimple(m.end_date, false)}</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${maintenanceStatusColors[m.status] || ''}`}>
                                    {m.status ? t(m.status.replace('_', ' ')) : '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                  {m.cost ? window.appSettings?.formatCurrency(m.cost) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {['scheduled', 'in_progress'].includes(m.status) && hasPermission(permissions, 'manage-asset-maintenance') && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleUpdateMaintenance(m)}
                                            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{t('Edit')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-xs text-gray-500">
                        <Wrench className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        {t('No maintenance records available')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Depreciation Tab */}
              <TabsContent value="depreciation" className="mt-4">
                <Card className="shadow-sm border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                  <CardHeader className="py-4 px-6 border-b border-gray-300 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Depreciation Analytics')}</CardTitle>
                    <CardDescription className="text-xs">{t('Estimated asset valuation over time.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {asset.depreciation ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-300 dark:border-gray-700">
                          <div>
                            <div className="text-[11px] font-medium text-gray-500">{t('Depreciation Method')}</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize mt-0.5">
                              {asset.depreciation.method?.replace('_', ' ') || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-gray-500">{t('Current Value')}</div>
                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {window.appSettings?.formatCurrency(asset.depreciation.current_value || 0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-gray-500">{t('Salvage Value')}</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                              {window.appSettings?.formatCurrency(asset.depreciation.salvage_value || 0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-gray-500">{t('Total Depreciated')}</div>
                            <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                              {depPercentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-500">{t('Asset Life Consumed')}</span>
                            <span className="text-gray-900 dark:text-gray-100">{depPercentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={depPercentage} className="h-2" />
                        </div>

                        {/* Detailed Depreciation Metrics Breakdown Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                          <div className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>{t('Original Purchase Cost')}</span>
                              <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
                              {window.appSettings?.formatCurrency(asset.purchase_cost || 0)}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>{t('Total Depreciable Amount')}</span>
                              <TrendingDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
                              {window.appSettings?.formatCurrency(Math.max((asset.purchase_cost || 0) - (asset.depreciation.salvage_value || 0), 0))}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>{t('Useful Life Expectancy')}</span>
                              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
                              {asset.useful_life || (asset.depreciation.useful_life_years ? asset.depreciation.useful_life_years * 12 : 0)} {t('Months')}
                              <span className="text-xs font-normal text-gray-500 ml-1">
                                ({asset.depreciation.useful_life_years || Math.round((asset.useful_life || 0) / 12)} {t('Years')})
                              </span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>{t('Annual Depreciation')}</span>
                              <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
                              {asset.depreciation.useful_life_years
                                ? window.appSettings?.formatCurrency(((asset.purchase_cost || 0) - (asset.depreciation.salvage_value || 0)) / asset.depreciation.useful_life_years)
                                : '-'}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>{t('Monthly Depreciation')}</span>
                              <TrendingDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
                              {(asset.useful_life || (asset.depreciation.useful_life_years * 12))
                                ? window.appSettings?.formatCurrency(((asset.purchase_cost || 0) - (asset.depreciation.salvage_value || 0)) / (asset.useful_life || (asset.depreciation.useful_life_years * 12)))
                                : '-'}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 shadow-xs">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <span>{t('Accumulated Depreciation')}</span>
                              <ShieldCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="text-base font-semibold text-rose-600 dark:text-rose-400 mt-2">
                              {window.appSettings?.formatCurrency((asset.purchase_cost || 0) - (asset.depreciation.current_value || 0))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-xs text-gray-500">
                        <TrendingDown className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        {t('No depreciation model configured for this asset')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-4">
                <Card className="shadow-sm border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                  <CardHeader className="py-4 px-6 border-b border-gray-300 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Attached Documents')}</CardTitle>
                    <CardDescription className="text-xs">{t('Invoices, manuals, or warranty documentation.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {asset.document_url || asset.documents ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                            <TableHead>{t('File Name')}</TableHead>
                            <TableHead className="text-right">{t('Download')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const docPath = asset.document_url || (asset.documents ? (asset.documents.startsWith('http') ? asset.documents : `/storage/${asset.documents}`) : '');
                            const ext = (asset.documents || docPath).split('.').pop()?.toLowerCase() || '';
                            const isImageDoc = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

                            return (
                              <TableRow>
                                <TableCell className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center gap-3">
                                    {isImageDoc ? (
                                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 flex items-center justify-center">
                                        <img
                                          src={docPath}
                                          alt={t('Document')}
                                          className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => window.open(docPath, '_blank')}
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-10 w-10 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/40 shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <FileText className="h-5 w-5" />
                                      </div>
                                    )}
                                    <div className="overflow-hidden">
                                      <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                                        {asset.documents ? asset.documents.split('/').pop() : t('Asset Document')}
                                      </div>
                                      <div className="text-[11px] text-gray-400 uppercase">
                                        {ext ? ext : t('File')}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              const docPath = asset.document_url || (asset.documents ? (asset.documents.startsWith('http') ? asset.documents : `/storage/${asset.documents}`) : '');
                                              if (docPath) {
                                                const link = document.createElement('a');
                                                link.href = docPath;
                                                link.download = asset.documents ? asset.documents.split('/').pop() : 'document';
                                                link.target = '_blank';
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                              } else {
                                                window.open(route('hr.assets.download-document', asset.id), '_blank');
                                              }
                                            }}
                                            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{t('Download')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-xs text-gray-500">
                        <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        {t('No documents attached')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column Sidebar Widgets */}
          <div className="space-y-6 lg:sticky lg:top-24 z-10 self-start">

            {/* Quick Assign Widget when Asset is NOT assigned */}
            {asset.status !== 'assigned' && (
              hasPermission(permissions, 'assign-assets') ? (
                <Card className="shadow-sm border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 dark:from-emerald-950/20 dark:to-gray-900 rounded-xl overflow-hidden">
                  <CardHeader className="py-3.5 px-5 border-b border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4" />
                        {t('Quick Assign Asset')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 text-center space-y-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('This asset is currently available for checkout. Click below to quickly assign it to an employee.')}
                    </p>
                    <Button
                      className="w-full gap-2 shadow-xs"
                      onClick={() => setIsAssignModalOpen(true)}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>{t('Assign Asset')}</span>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 rounded-xl overflow-hidden">
                  <CardHeader className="py-3.5 px-5 border-b border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4" />
                        {t('Assignment Status')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 text-center space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Not Currently Assigned')}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('This asset is currently not assigned to any user.')}
                    </p>
                  </CardContent>
                </Card>
              )
            )}

            {/* Current Assignment Card */}
            {asset.status === 'assigned' && asset.current_assignment && (
              <Card className="shadow-sm border-blue-300 dark:border-blue-800 bg-gradient-to-br from-blue-50/40 to-indigo-50/20 dark:from-blue-950/20 dark:to-gray-900 rounded-xl overflow-hidden">
                <CardHeader className="py-3.5 px-5 border-b border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" />
                      {t('Currently Assigned')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={asset.current_assignment.employee?.avatar || getImagePath('avatars/avatar.png')}
                      alt={asset.current_assignment.employee?.name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getImagePath('avatars/avatar.png');
                      }}
                    />
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {asset.current_assignment.employee?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {asset.current_assignment.employee?.email || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-900/40 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">{t('Checkout Date')}:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {asset.current_assignment.checkout_date ? (window.appSettings?.formatDateTimeSimple(asset.current_assignment.checkout_date, false) || asset.current_assignment.checkout_date) : '-'}
                      </span>
                    </div>

                    {asset.current_assignment.expected_return_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">{t('Expected Return')}:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-amber-500" />
                          {window.appSettings?.formatDateTimeSimple(asset.current_assignment.expected_return_date, false) || asset.current_assignment.expected_return_date}
                        </span>
                      </div>
                    )}

                    {asset.current_assignment.notes && (
                      <div className="pt-2 text-gray-600 dark:text-gray-400 text-[11px] italic">
                        "{asset.current_assignment.notes}"
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Asset QR Code Widget */}
            {asset.qr_code && (
              <Card className="shadow-sm border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                <CardHeader className="py-3.5 px-5 border-b border-gray-300 dark:border-gray-700">
                  <CardTitle className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <QrCode className="h-4 w-4" />
                    {t('Asset QR Tag')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-gray-300 dark:border-gray-700 shadow-sm">
                    <img
                      src={`/storage/${asset.qr_code}`}
                      alt="Asset QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQrCode}
                    className="w-full text-xs border-gray-300 dark:border-gray-700"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t('Download QR Tag')}
                  </Button>
                </CardContent>
              </Card>
            )}

          </div>
        </div>

      </div>

      {/* Update Maintenance Modal */}
      <CrudFormModal
        isOpen={isUpdateMaintenanceModalOpen}
        onClose={() => setIsUpdateMaintenanceModalOpen(false)}
        onSubmit={handleUpdateMaintenanceSubmit}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'scheduled', label: t('Scheduled') },
                { value: 'in_progress', label: t('In Progress') },
                { value: 'completed', label: t('Completed') },
                { value: 'cancelled', label: t('Cancelled') }
              ]
            },
            {
              name: 'end_date',
              label: t('End Date'),
              type: 'date',
              required: true,
              placeholder: t('Select End Date'),
              showWhen: (formData) => ['completed', 'cancelled'].includes(formData.status)
            },
            {
              name: 'completion_notes',
              label: t('Completion Notes'),
              type: 'textarea',
              required: true,
              placeholder: t('e.g. Maintenance completed successfully, all parts replaced...'),
              showWhen: (formData) => ['completed', 'cancelled'].includes(formData.status)
            },
            {
              name: 'cost',
              label: t('Cost'),
              type: 'number',
              min: 0,
              step: 0.01,
              placeholder: t('e.g. 250.00')
            }
          ],
          modalSize: 'md'
        }}
        initialData={currentMaintenance}
        title={t('Update Maintenance')}
        mode="edit"
      />
      {/* Quick Assign Modal */}
      <CrudFormModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSubmit={handleAssignSubmit}
        formConfig={{
          fields: [
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              required: true,
              placeholder: t('Select Employee'),
              options: (employees || []).map((emp: any) => ({
                value: emp.id.toString(),
                label: `${emp.name} (${emp.employee_id})`
              }))
            },
            {
              name: 'checkout_date',
              label: t('Checkout Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Checkout Date'),
              defaultValue: new Date().toISOString().split('T')[0]
            },
            {
              name: 'expected_return_date',
              label: t('Expected Return Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Expected Return Date')
            },
            {
              name: 'checkout_condition',
              label: t('Checkout Condition'),
              type: 'select',
              required: true,
              placeholder: t('Select Condition'),
              options: [
                { value: 'new', label: t('New') },
                { value: 'good', label: t('Good') },
                { value: 'fair', label: t('Fair') },
                { value: 'poor', label: t('Poor') }
              ],
              defaultValue: asset.condition
            },
            {
              name: 'notes',
              label: t('Notes'),
              type: 'textarea',
              placeholder: t('e.g. Assigned for project use until end of quarter...')
            }
          ],
          modalSize: 'md'
        }}
        initialData={{}}
        title={t('Assign Asset')}
        mode="create"
      />
    </PageTemplate>
  );
}
