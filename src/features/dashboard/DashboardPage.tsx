import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { MetricCard } from './MetricCard';
import { PipelineChart } from './PipelineChart';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  Calendar,
  FileText,
  GitCommit,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ContactFormModal } from '../contacts/ContactFormModal';
import { DealFormModal } from '../deals/DealFormModal';

export const DashboardPage: React.FC = () => {
  const { metrics, stageBreakdown, activities, loading } = useCRM();
  const { t, locale } = useI18n();

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-blue-600" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-amber-600" />;
      case 'meeting':
        return <Calendar className="w-3.5 h-3.5 text-purple-600" />;
      case 'stage_change':
        return <GitCommit className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setContactModalOpen(true)}
            icon={<Plus className="w-4 h-4 text-slate-600" />}
          >
            {t('dashboard.addContactCta')}
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => setDealModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('dashboard.addDealCta')}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('dashboard.totalContacts')}
          value={metrics.totalContacts}
          subtitle="Qualified accounts & leads"
          icon={Users}
        />
        <MetricCard
          title={t('dashboard.activeDeals')}
          value={metrics.activeDealsCount}
          subtitle={`Pipeline: ${formatCurrency(metrics.openPipelineValue, 'USD', locale)}`}
          icon={Briefcase}
          highlight
        />
        <MetricCard
          title={t('dashboard.wonDeals')}
          value={metrics.wonDealsCount}
          subtitle={`Win rate: ${metrics.winRate}% (${formatCurrency(metrics.wonDealsValue, 'USD', locale)})`}
          icon={TrendingUp}
        />
        <MetricCard
          title={t('dashboard.tasksDueToday')}
          value={metrics.tasksDueToday}
          subtitle={`${metrics.tasksOverdue} overdue follow-ups`}
          icon={Clock}
          trend={
            metrics.tasksOverdue > 0
              ? { value: `${metrics.tasksOverdue} overdue`, positive: false }
              : undefined
          }
        />
      </div>

      {/* FlowAI Executive Assistant Insight Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0 border border-brand-gold/30 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight text-white">
                {locale === 'ar' ? 'رؤية FlowAI الذكية للمبيعات' : 'FlowAI Executive Workspace Pulse'}
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-gold/20 text-brand-goldPale font-medium border border-brand-gold/30">
                Grounded
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {locale === 'ar'
                ? `لديك ${metrics.activeDealsCount} صفقة نشطة بقيمة ${formatCurrency(metrics.openPipelineValue, 'USD', locale)}، مع ${metrics.tasksOverdue} مهام متأخرة تتطلب المتابعة الفورية لضمان نسبة إغلاق مثالية.`
                : `Active pipeline stands at ${metrics.activeDealsCount} opportunities worth ${formatCurrency(metrics.openPipelineValue, 'USD', locale)}. ${metrics.tasksOverdue > 0 ? `${metrics.tasksOverdue} follow-ups are currently overdue.` : 'All task follow-ups are on schedule.'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.pipelineDistribution')}</CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Total Open: {formatCurrency(metrics.openPipelineValue, 'USD', locale)}
            </span>
          </CardHeader>
          <CardContent>
            <PipelineChart data={stageBreakdown} />
          </CardContent>
        </Card>

        {/* Recent Activities Feed */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <p className="p-6 text-xs text-slate-500 text-center">
                {t('dashboard.noActivitiesYet')}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {activities.slice(0, 6).map(act => (
                  <div key={act.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-900 font-medium leading-relaxed">
                          {act.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{formatDateTime(act.occurred_at, locale)}</span>
                          {act.contact && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-medium truncate">
                                {act.contact.full_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Creation Modals */}
      <ContactFormModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
      <DealFormModal
        isOpen={dealModalOpen}
        onClose={() => setDealModalOpen(false)}
      />
    </div>
  );
};
