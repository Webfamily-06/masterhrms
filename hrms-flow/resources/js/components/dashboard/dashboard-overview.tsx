import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  CreditCard,
  Eye,
  TrendingUp,
  ArrowRight,
  Sparkles,
  DollarSign,
  Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@inertiajs/react';

interface DashboardOverviewProps {
  userType: 'superadmin' | 'company';
  stats: any;
}

export function DashboardOverview({ userType, stats }: DashboardOverviewProps) {
  const { t } = useTranslation();

  const superAdminFeatures = [
    {
      title: t('Company Management'),
      description: t('Manage all registered companies and their subscriptions'),
      icon: Building2,
      color: 'blue',
      href: route('companies.index'),
      count: stats?.totalCompanies || 0
    },
    {
      title: t('Plan Management'),
      description: t('Create and manage subscription plans'),
      icon: CreditCard,
      color: 'purple',
      href: route('plans.index'),
      count: stats?.activePlans || 0
    },

    {
      title: t('Revenue Tracking'),
      description: t('Track and manage plan orders and revenue'),
      icon: DollarSign,
      color: 'green',
      href: route('plan-orders.index'),
      count: stats?.totalRevenue ? window.appSettings.formatCurrency(stats.totalRevenue) : 0
    },
    {
      title: t('Coupon Management'),
      description: t('Create and manage discount coupons'),
      icon: Tag,
      color: 'orange',
      href: route('coupons.index'),
      count: stats?.activeCoupons || 0
    }
  ];

  const companyFeatures = [
    {
      title: t('Business Views'),
      description: t('Track views of your digital business cards'),
      icon: Eye,
      color: 'orange',
      href: route('dashboard'),
      count: stats?.totalViews || 0
    }
  ];

  const features = userType === 'superadmin' ? superAdminFeatures : companyFeatures;

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
      green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
      teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
      purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
      orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-semibold">
            {t('Features')}
          </CardTitle>
        </div>
        <p className="text-base text-muted-foreground">
          {userType === 'superadmin'
            ? t('Comprehensive system management and oversight tools')
            : t('Everything you need to manage your digital business presence')
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <Link key={feature.title} href={feature.href} className="group relative">
                <Card className="h-full transition-all duration-200 hover:shadow-md cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`rounded-full p-2 ${getColorClasses(feature.color)}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        {feature.count}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {feature.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      <span>{t('Explore')}</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">
              {userType === 'superadmin'
                ? t('System growing at {{growth}}% monthly', { growth: stats?.monthlyGrowth || 0 })
                : t('Your business views increased by {{growth}}%', { growth: stats?.monthlyGrowth || 0 })
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}