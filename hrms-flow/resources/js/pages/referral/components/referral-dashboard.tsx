import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Copy, Check, Users, DollarSign, TrendingUp, Award, Clock, Mail, Calendar } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { cn } from '@/lib/utils';
import { useInitials } from '@/hooks/use-initials';

interface ReferralDashboardProps {
  userType: string;
  stats: any;
  referralLink?: string;
  recentReferredUsers?: any[];
  currencySymbol?: string;
}

export default function ReferralDashboard({ userType, stats, referralLink, recentReferredUsers,currencySymbol }: ReferralDashboardProps) {
  const { t } = useTranslation();
  const getInitials = useInitials();



  const [copied, setCopied] = useState(false);

  const copyReferralLink = async () => {
    if (referralLink) {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t('Referral link copied to clipboard'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (userType === 'superadmin') {
    return (
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-bl-full opacity-10" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Referral Users')}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReferralUsers}</h3>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Registered users')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 rounded-bl-full opacity-10" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Pending Payouts')}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingPayouts}</h3>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t('Awaiting approval')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500 rounded-bl-full opacity-10" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Commission Paid')}</p>
                <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{currencySymbol}{stats.totalCommissionPaid}</h3>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Total payouts')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
                <DollarSign className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 rounded-bl-full opacity-10" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Active Companies')}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.topCompanies?.length || 0}</h3>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{t('Referring companies')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
                <TrendingUp className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{t('Top Referring Companies')}</CardTitle>
                  <CardDescription className="text-xs">{t('Companies with most referrals')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {stats.topCompanies && stats.topCompanies.length > 0 ? (
                <div className="space-y-2">
                  {stats.topCompanies.slice(0, 5).map((company: any, index: number) => (
                    <div key={company.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3 min-w-0">
                        {company.avatar ? (
                          <img
                            src={company.avatar}
                            alt={company.name}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white flex-shrink-0 ${company.avatar ? 'hidden' : ''}`}>
                          {getInitials(company.name || '')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{company.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{company.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <div className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                          <Users className="h-4 w-4" />
                          {company.referral_count}
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium font-mono">{currencySymbol}{company.total_earned || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Award className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground">{t('No companies yet')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{t('Monthly Performance')}</CardTitle>
                  <CardDescription className="text-xs">{t('This year statistics')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('Referral Signups')}</p>
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.monthlyReferrals || 0}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('Total this year')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">{t('Payouts Processed')}</p>
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                    {currencySymbol}{stats.monthlyPayouts || 0}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('Total this year')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500 rounded-bl-full opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Referrals')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReferrals}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('All referrals')}</span>
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Referred Users')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.referredUsersCount || 0}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Active users')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 rounded-bl-full opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Earned')}</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{currencySymbol}{stats.totalEarned}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t('Commission earned')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <DollarSign className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 rounded-bl-full opacity-10" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Available Balance')}</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{currencySymbol}{stats.availableBalance.toFixed(2)}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{t('Ready to withdraw')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
              <Award className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{t('Your Referral Link')}</CardTitle>
                <CardDescription className="text-xs">{t('Share and earn commissions')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex space-x-2">
              <Input
                value={referralLink || ''}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                onClick={copyReferralLink}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded-lg">
              {t('Share this link to earn commissions when users sign up and purchase plans')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{t('Recent Referred Users')}</CardTitle>
                <CardDescription className="text-xs">{t('Latest referrals')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recentReferredUsers && recentReferredUsers.length > 0 ? (
              <div className="space-y-2">
                {recentReferredUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      {user.plan ? (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {user.plan.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {t('No Plan')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('No referred users yet')}</p>
                <p className="text-xs text-muted-foreground">{t('Share your link to get started')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
