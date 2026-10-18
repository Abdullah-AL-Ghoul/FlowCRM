import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../lib/utils';
import { generateCSV, downloadCSV } from '../../lib/csv';
import {
  BarChart3,
  Download,
  ShieldCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { NLAnalyticsSection } from '../ai/components/NLAnalyticsSection';

export const ReportsPage: React.FC = () => {
  const { contacts, deals, metrics, stageBreakdown } = useCRM();
  const { t, locale } = useI18n();

  // Export Contacts
  const exportContactsCSV = () => {
    const data = contacts.map(c => ({
      name: c.full_name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      status: c.status,
      source: c.lead_source || '',
      created_at: c.created_at,
    }));

    const csv = generateCSV(data, [
      { key: 'name', header: 'Full Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'company', header: 'Company' },
      { key: 'status', header: 'Status' },
      { key: 'source', header: 'Source' },
      { key: 'created_at', header: 'Created Date' },
    ]);

    downloadCSV(csv, `flowcrm_contacts_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export Deals
  const exportDealsCSV = () => {
    const data = deals.map(d => ({
      title: d.title,
      value: d.value,
      currency: d.currency,
      stage: d.stage,
      client: d.contact?.full_name || '',
      company: d.contact?.company || '',
      close_date: d.expected_close_date || '',
      created_at: d.created_at,
    }));

    const csv = generateCSV(data, [
      { key: 'title', header: 'Deal Name' },
      { key: 'value', header: 'Value' },
      { key: 'currency', header: 'Currency' },
      { key: 'stage', header: 'Pipeline Stage' },
      { key: 'client', header: 'Associated Client' },
      { key: 'company', header: 'Company' },
      { key: 'close_date', header: 'Expected Close' },
      { key: 'created_at', header: 'Created Date' },
    ]);

    downloadCSV(csv, `flowcrm_deals_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Source Distribution Calculation
  const sourceStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach(c => {
      const src = c.lead_source || 'website';
      counts[src] = (counts[src] || 0) + 1;
    });

    const colors = ['#C9A961', '#38BDF8', '#818CF8', '#10B981', '#F59E0B', '#94A3B8'];
    return Object.entries(counts).map(([name, value], i) => ({
      name: t(`contacts.sources.${name}`, name),
      value,
      color: colors[i % colors.length],
    }));
  }, [contacts, t]);

  const wonDealsCount = deals.filter(d => d.stage === 'won').length;
  const lostDealsCount = deals.filter(d => d.stage === 'lost').length;
  const totalDecided = wonDealsCount + lostDealsCount;
  const winRate = totalDecided > 0 ? Math.round((wonDealsCount / totalDecided) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('reports.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportContactsCSV}
            icon={<Download className="w-4 h-4 text-slate-600" />}
          >
            {t('reports.exportContactsCSV')}
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={exportDealsCSV}
            icon={<Download className="w-4 h-4" />}
          >
            {t('reports.exportDealsCSV')}
          </Button>
        </div>
      </div>

      {/* CSV Injection Safety Guarantee Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="flex items-center gap-2.5 text-xs">
          <ShieldCheck className="w-5 h-5 text-brand-gold shrink-0" />
          <span className="text-slate-300">
            {t('reports.exportNotice')}
          </span>
        </div>
        <Badge variant="gold" size="sm">CWE-1236 Protected</Badge>
      </div>

      {/* FlowAI Natural-Language Analytics Section */}
      <NLAnalyticsSection />

      {/* High-Level Conversion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Win Rate Ratio
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{winRate}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {wonDealsCount} Won vs {lostDealsCount} Lost
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Closed Won Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-brand-gold" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(metrics?.wonDealsValue || 0, 'USD', locale)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across {wonDealsCount} completed engagements
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Pipeline Value
            </span>
            <BarChart3 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(metrics?.openPipelineValue || 0, 'USD', locale)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {metrics?.activeDealsCount || 0} open deals currently in progress
          </p>
        </Card>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Distribution Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.dealDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stageBreakdown.map(item => {
                const totalPipelineValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
                const percent = totalPipelineValue > 0 ? Math.round((item.totalValue / totalPipelineValue) * 100) : 0;

                return (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800">{t(`deals.stages.${item.stage}`)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{item.count} deals</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.totalValue, 'USD', locale)}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-gold h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lead Acquisition Channels */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.sourceDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={sourceStats}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {sourceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {sourceStats.map(stat => (
                  <div key={stat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="text-slate-700 font-medium">{stat.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
