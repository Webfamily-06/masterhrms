import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  User,
  Package,
  Calendar,
  Clock,
  Tag,
  Banknote,
  Hash,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Landmark,
  StickyNote
} from 'lucide-react';
import { getImagePath } from '@/utils/helpers';

interface ViewPlanOrderProps {
  planOrder: any;
}

export default function View({ planOrder }: ViewPlanOrderProps) {
  const { t } = useTranslation();

  const statusColors: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    approved:  'bg-green-50 text-green-700 ring-green-600/20',
    rejected:  'bg-red-50 text-red-700 ring-red-600/20',
    cancelled: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending:   <Clock className="h-4 w-4" />,
    approved:  <CheckCircle className="h-4 w-4" />,
    rejected:  <XCircle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    return window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString();
  };

  const DetailRow = ({ icon, label, value, children }: { icon: React.ReactNode; label: string; value?: string | React.ReactNode; children?: React.ReactNode }) => (
    <div>
      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
        {icon}
        {label}
      </label>
      {children ? (
        <div className="mt-1">{children}</div>
      ) : (
        <p className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</p>
      )}
    </div>
  );

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
      <DialogHeader className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">{t('Plan Order Details')}</DialogTitle>
        </div>
      </DialogHeader>

      <div className="px-6 py-4 pb-6 space-y-4">
        {/* Order Number & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailRow
            icon={<Hash className="h-4 w-4" />}
            label={t('Order Number')}
            value={planOrder.order_number}
          />
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
              {statusIcons[planOrder.status] || <Clock className="h-4 w-4" />}
              {t('Status')}
            </label>
            <div className="mt-1">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${statusColors[planOrder.status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                {t(planOrder.status)}
              </span>
            </div>
          </div>
        </div>

        {/* User & Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label={t('User')}
            value={planOrder.user?.name || '-'}
          />
          <DetailRow
            icon={<Package className="h-4 w-4" />}
            label={t('Plan')}
            value={planOrder.plan?.name || '-'}
          />
        </div>

        {/* Billing Cycle & Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label={t('Billing Cycle')}
            value={planOrder.billing_cycle ? t(planOrder.billing_cycle) : '-'}
          />
          <DetailRow
            icon={<Landmark className="h-4 w-4" />}
            label={t('Payment Method')}
            value={planOrder.payment_method ? t(planOrder.payment_method) : '-'}
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label={t('Original Price')}
          >
            <p className="mt-1 text-sm font-medium font-mono text-gray-900">{`${planOrder.currencySymbol || ''}${planOrder.original_price || 0}`}</p>
          </DetailRow>
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label={t('Discount')}
          >
            <p className="mt-1 text-sm font-medium font-mono text-gray-900">{planOrder.discount_amount > 0 ? `-${planOrder.currencySymbol || ''}${planOrder.discount_amount}` : '-'}</p>
          </DetailRow>
          <DetailRow
            icon={<Banknote className="h-4 w-4" />}
            label={t('Final Price')}
          >
            <p className="mt-1 text-sm font-medium font-mono text-gray-900">{`${planOrder.currencySymbol || ''}${planOrder.final_price || 0}`}</p>
          </DetailRow>
        </div>

        {/* Coupon & Payment ID */}
        {(planOrder.coupon_code || planOrder.payment_id) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {planOrder.coupon_code && (
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label={t('Coupon Code')}
                value={planOrder.coupon_code}
              />
            )}
            {planOrder.payment_id && (
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label={t('Payment ID')}
                value={planOrder.payment_id}
              />
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label={t('Order Date')}
            value={formatDate(planOrder.ordered_at)}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label={t('Processed Date')}
            value={formatDate(planOrder.processed_at)}
          />
        </div>

        {/* Processed By */}
        {planOrder.processed_by && (
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label={t('Processed By')}
            value={planOrder.processed_by?.name || '-'}
          />
        )}

        {/* Notes */}
        {planOrder.notes && (
          <DetailRow
            icon={<StickyNote className="h-4 w-4" />}
            label={t('Notes')}
            value={planOrder.notes}
          />
        )}

        {/* Receipt */}
        {planOrder.receipt && (
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('Receipt')}
            </label>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                const link = document.createElement('a');
                link.href = getImagePath(planOrder.receipt);
                link.download = planOrder.receipt.split('/').pop() || 'receipt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('Download Receipt')}
            </Button>
          </div>
        )}
      </div>
    </DialogContent>
  );
}
