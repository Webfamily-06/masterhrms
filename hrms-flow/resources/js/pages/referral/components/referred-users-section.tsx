import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Users, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';

interface ReferredUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
  plan?: {
    id: number;
    name: string;
    price: number;
    yearly_price?: number;
  };
  plan_orders?: Array<{
    id: number;
    billing_cycle: string;
    final_price: number;
  }>;
  referrals?: Array<{
    id: number;
    amount: number;
    commission_percentage: number;
    created_at: string;
  }>;
}

interface ReferredUsersSectionProps {
  referredUsers: {
    data: ReferredUser[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: any[];
  };
  userType: string;
  currencySymbol: string;
}

export default function ReferredUsersSection({ referredUsers, userType, currencySymbol }: ReferredUsersSectionProps) {
  const { t } = useTranslation();
  const getInitials = useInitials();

const getTotalCommission = (user: ReferredUser) => {
    return user.referrals?.reduce((total, referral) => total + (Number(referral.amount) || 0), 0) || 0;
  };

  const getTotalCommissionAll = () => {
    return referredUsers.data.reduce((total, user) => total + getTotalCommission(user), 0) || 0;
  };

  const getPlanDisplayInfo = (user: ReferredUser) => {
    if (!user.plan) return null;

    const latestOrder = user.plan_orders?.[0];

    if (latestOrder) {
      const isYearly = latestOrder.billing_cycle === 'yearly';
      return {
        name: user.plan.name,
        price: latestOrder.final_price,
        cycle: isYearly ? 'year' : 'month'
      };
    }

    return {
      name: user.plan.name,
      price: user.plan.price,
      cycle: 'month'
    };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500 rounded-bl-full opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Referred Users')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{referredUsers.total}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('All time')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-bl-full opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Users with Plans')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{referredUsers.data.filter(user => user.plan).length}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Active subscriptions')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <CheckCircle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 rounded-bl-full opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Commission Earned')}</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{currencySymbol}{getTotalCommissionAll().toFixed(2)}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t('Commission earned')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <DollarSign className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('Referred Users List')}</CardTitle>
        </CardHeader>
        <CardContent>
          {referredUsers.data.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-base font-semibold text-muted-foreground mb-2">{t('No referred users yet')}</p>
              <p className="text-sm text-muted-foreground">
                {userType === 'superadmin'
                  ? t('No users have registered using referral codes yet.')
                  : t('Share your referral link to start earning commissions.')
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referredUsers.data.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-3 flex-1">
                      {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white flex-shrink-0 ${user.avatar ? 'hidden' : ''}`}>
                          {getInitials(user.name)}
                        </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {t('Registered')} {window.appSettings?.formatDateTimeSimple(user.created_at, false) || new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-6 flex-shrink-0">
                      <div className="text-right">
                        {(() => {
                          const planInfo = getPlanDisplayInfo(user);
                          return planInfo ? (
                            <div>
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-1.5">
                                {planInfo.name}
                              </span>
                              <p className="text-sm text-muted-foreground font-mono">
                                {currencySymbol}{planInfo.price}/{t(planInfo.cycle)}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              {t('No Plan')}
                            </span>
                          );
                        })()}
                      </div>

                      {getTotalCommission(user) > 0 && (
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-semibold font-mono text-green-600">
                            +{currencySymbol}{getTotalCommission(user)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('Commission')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {user.referrals && user.referrals.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-semibold mb-2">{t('Commission History')}</p>
                      <div className="space-y-2">
                        {user.referrals.map((referral) => (
                          <div key={referral.id} className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {referral.commission_percentage}% {t('commission')}
                            </span>
                            <span className="text-sm font-semibold font-mono text-green-600">
                              +{currencySymbol}{referral.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {referredUsers.last_page > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
            <Pagination
            from={referredUsers.from}
            to={referredUsers.to}
            total={referredUsers.total}
            links={referredUsers.links}
            currentPage={referredUsers.current_page}
            lastPage={referredUsers.last_page}
            entityName={t('users')}
            hidePerPage
            onPageChange={(url) => {
                router.visit(url, {
                preserveState: true,
                preserveScroll: true,
                only: ['referredUsers']
                });
            }}
            />
        </div>
      )}
    </div>
  );
}
