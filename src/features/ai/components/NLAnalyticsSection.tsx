import React, { useState } from 'react';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import { NLAnalyticsResult } from '../types/ai.types';
import { EvidenceCitation } from './EvidenceCitation';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import {
  Sparkles,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

export const NLAnalyticsSection: React.FC = () => {
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLAnalyticsResult | null>(null);

  const sampleQueries = isArabic
    ? [
        'عرض الصفقات الرابحة',
        'توزيع العملاء حسب قنوات الاكتساب',
        'شرح وتوزيع مراحل خط أنابيب المبيعات',
      ]
    : [
        'Show closed won deals',
        'Customer acquisition sources distribution',
        'Breakdown of sales pipeline stages',
      ];

  const handleQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await flowAIService.queryAnalytics(
        q,
        'workspace-active',
        locale === 'ar' ? 'ar' : 'en'
      );
      setResult(res);
    } catch (err) {
      console.error('Failed to run NL analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#C9A961', '#38BDF8', '#818CF8', '#10B981', '#F59E0B', '#94A3B8'];

  return (
    <Card className="p-5 border-amber-200/70 bg-gradient-to-b from-white to-amber-50/20 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{isArabic ? 'التحليلات الذكية باللغة الطبيعية — FlowAI' : 'FlowAI Natural-Language Analytics'}</span>
              <Badge variant="gold" size="sm">
                {isArabic ? 'حسابات موثقة' : 'Authoritative Math'}
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-500">
              {isArabic
                ? 'استعلام مباشر عن مؤشرات الأداء بدون كتابة أو تشغيل أكواد SQL عشوائية'
                : 'Direct conversational reporting without arbitrary SQL execution risks'}
            </p>
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery(query)}
            placeholder={
              isArabic
                ? 'اطرح سؤالاً تحليلياً (مثال: أداء الصفقات الرابحة، مصادر اكتساب العملاء...)'
                : 'Ask a reporting question (e.g. Show won deals, Breakdown pipeline stages...)'
            }
            className="w-full text-xs ps-9 pe-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <Button
          variant="gold"
          size="sm"
          onClick={() => handleQuery(query)}
          disabled={loading || !query.trim()}
          icon={<Sparkles className="w-3.5 h-3.5" />}
        >
          {loading ? (isArabic ? 'جاري التحليل...' : 'Analyzing...') : isArabic ? 'استعلام' : 'Query'}
        </Button>
      </div>

      {/* Suggested Quick Queries */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 me-1">
          {isArabic ? 'استعلامات مقترحة:' : 'Quick Reports:'}
        </span>
        {sampleQueries.map((sq, i) => (
          <button
            key={i}
            onClick={() => {
              setQuery(sq);
              handleQuery(sq);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-brand-gold/60 hover:bg-amber-50/40 transition-all shadow-2xs font-medium cursor-pointer"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Result Display */}
      {result && (
        <div className="pt-4 border-t border-slate-200/80 space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900">{result.answerExplanation}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  <span>Period: {result.periodDescription}</span>
                  <span>•</span>
                  <span>Filters: {result.appliedFilters.join(', ')}</span>
                </div>
              </div>

              {result.kpiHighlight && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-end shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {result.kpiHighlight.label}
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {result.kpiHighlight.value}
                  </p>
                  {result.kpiHighlight.subtext && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{result.kpiHighlight.subtext}</p>
                  )}
                </div>
              )}
            </div>

            {/* Visual Chart if applicable */}
            {result.chartData && result.chartData.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {result.chartType === 'pie' ? (
                      <RechartsPie>
                        <Pie
                          data={result.chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {result.chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    ) : (
                      <BarChart data={result.chartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#C9A961" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Record Links */}
            {result.recordLinks.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {isArabic ? 'السجلات المعتمدة المرتبطة:' : 'Supporting CRM Records:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.recordLinks.map(rec => (
                    <EvidenceCitation key={rec.id} evidence={rec} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
