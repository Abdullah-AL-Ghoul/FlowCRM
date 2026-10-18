import React, { useState, useEffect } from 'react';
import { Contact } from '../../../types/crm.types';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import { ContactIntelligenceResult } from '../types/ai.types';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import {
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export interface ContactAIPanelProps {
  contact: Contact;
  onOpenSalesWriter?: (contact: Contact) => void;
}

export const ContactAIPanel: React.FC<ContactAIPanelProps> = ({
  contact,
  onOpenSalesWriter,
}) => {
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<ContactIntelligenceResult | null>(null);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const res = await flowAIService.analyzeContact(contact, contact.workspace_id, locale);
      setIntel(res);
    } catch (err) {
      console.error('Failed to analyze contact:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [contact.id, locale]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-gold animate-spin" />
          <span className="text-xs font-semibold text-slate-600">
            {isArabic ? 'جاري تحليل سجلات العميل...' : 'Analyzing contact intelligence...'}
          </span>
        </div>
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
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
            {isArabic ? 'تحليلات FlowAI الذكية' : 'FlowAI Contact Intelligence'}
          </span>
          <Badge variant="gold" size="sm">
            {isArabic ? 'سياق موثق' : 'Verified Context'}
          </Badge>
        </div>

        <button
          onClick={fetchIntelligence}
          className="text-slate-400 hover:text-slate-600 p-1 rounded"
          title="Refresh Analysis"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-700 leading-relaxed shadow-2xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isArabic ? 'ملخص العميل الموثق' : 'Verified Contact Summary'}</span>
        </div>
        <p>{intel.summary}</p>
        <p className="mt-1.5 text-[11px] text-slate-500">{intel.communicationPattern}</p>
      </div>

      {/* Missing Information Alerts */}
      {intel.missingInformation.length > 0 && (
        <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200/70 text-xs text-rose-900">
          <div className="flex items-center gap-1.5 font-semibold text-rose-800 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{isArabic ? 'بيانات اتصال ناقصة:' : 'Missing Information:'}</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
            {intel.missingInformation.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Follow-up Questions */}
      <div>
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-brand-gold" />
          <span>{isArabic ? 'أسئلة مقترحة للاكتشاف:' : 'Suggested Discovery Questions:'}</span>
        </h5>
        <div className="space-y-1">
          {intel.suggestedQuestions.map((q, idx) => (
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

      {/* Recommended Next Steps */}
      <div>
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isArabic ? 'الخطوات القادمة الموصى بها:' : 'Recommended Next Steps:'}</span>
        </h5>
        <div className="space-y-1">
          {intel.recommendedNextSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-white border border-slate-200/70 text-xs text-slate-700 flex items-start gap-2 shadow-2xs"
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{step}</span>
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
            onClick={() => onOpenSalesWriter(contact)}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            {isArabic ? 'صياغة رسالة متابعة ذكية' : 'Draft Follow-up Message'}
          </Button>
        </div>
      )}
    </div>
  );
};
