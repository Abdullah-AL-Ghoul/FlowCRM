import React, { useState, useEffect } from 'react';
import { Deal } from '../../../types/crm.types';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import { DealIntelligenceResult } from '../types/ai.types';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import {
  Sparkles,
  HelpCircle,
  ArrowRight,
  MessageSquare,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

export interface DealAIPanelProps {
  deal: Deal;
  onOpenSalesWriter?: (deal: Deal) => void;
}

export const DealAIPanel: React.FC<DealAIPanelProps> = ({
  deal,
  onOpenSalesWriter,
}) => {
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<DealIntelligenceResult | null>(null);

  const fetchDealIntelligence = async () => {
    setLoading(true);
    try {
      const res = await flowAIService.analyzeDeal(deal, deal.workspace_id, locale);
      setIntel(res);
    } catch (err) {
      console.error('Failed to analyze deal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealIntelligence();
  }, [deal.id, locale]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-gold animate-spin" />
          <span className="text-xs font-semibold text-slate-600">
            {isArabic ? 'جاري تحليل مخاطر الصفقة وتوقعاتها...' : 'Analyzing deal health & risk signals...'}
          </span>
        </div>
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-b from-amber-50/30 to-slate-50/50 border border-amber-200/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-brand-gold flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900">
            {isArabic ? 'ذكاء ومخاطر الصفقة (Deal Intelligence)' : 'FlowAI Deal Intelligence'}
          </span>
          <Badge variant="gold" size="sm">
            {isArabic ? 'قواعد شفافة' : 'Rule-Based Signals'}
          </Badge>
        </div>

        <button
          onClick={fetchDealIntelligence}
          className="text-slate-400 hover:text-slate-600 p-1 rounded"
          title="Refresh Analysis"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-700 leading-relaxed shadow-2xs">
        <p>{intel.dealSummary}</p>
      </div>

      {/* Risk Signals */}
      {intel.riskSignals.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>{isArabic ? 'إشارات المخاطر المرصودة:' : 'Identified Risk Signals:'}</span>
          </div>
          <div className="space-y-1">
            {intel.riskSignals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-start gap-2 shadow-2xs"
              >
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    sig.level === 'high'
                      ? 'bg-rose-100 text-rose-800'
                      : sig.level === 'medium'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {sig.level}
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">{sig.signal}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sig.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Next Action */}
      <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/70 text-xs text-emerald-950">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-800 mb-1">
          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isArabic ? 'الإجراء التالي المقترح لزيادة فرص الإغلاق:' : 'Recommended Next Action:'}</span>
        </div>
        <p className="text-[11px] text-emerald-900">{intel.recommendedNextAction}</p>
      </div>

      {/* Coaching Questions */}
      <div>
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-brand-gold" />
          <span>{isArabic ? 'أسئلة تدريبية لممثل المبيعات:' : 'Sales Rep Coaching Questions:'}</span>
        </h5>
        <div className="space-y-1">
          {intel.coachingQuestions.map((q, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-white border border-slate-200/70 text-xs text-slate-700 flex items-start gap-2 shadow-2xs"
            >
              <span className="text-brand-gold font-bold">›</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action: Open Sales Writer */}
      {onOpenSalesWriter && (
        <div className="pt-2 border-t border-slate-200/60 flex justify-end">
          <Button
            variant="gold"
            size="sm"
            onClick={() => onOpenSalesWriter(deal)}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            {isArabic ? 'صياغة متابعة للصفقة' : 'Draft Deal Follow-up'}
          </Button>
        </div>
      )}
    </div>
  );
};
