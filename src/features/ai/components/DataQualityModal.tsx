import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useCRM } from '../../../context/CRMContext';
import { useI18n } from '../../../i18n/I18nContext';
import { DataQualityService } from '../services/dataQualityService';
import { DataQualityIssue } from '../types/ai.types';
import { EvidenceCitation } from './EvidenceCitation';
import {
  ShieldAlert,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { contacts, deals } = useCRM();
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const runAudit = () => {
    setLoading(true);
    try {
      const detected = DataQualityService.auditWorkspace(contacts, deals, locale);
      setIssues(detected);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen, contacts.length, deals.length, locale]);

  const duplicates = issues.filter(i => i.type === 'duplicate_contact');
  const missingData = issues.filter(i => i.type === 'missing_email_phone');
  const stagnant = issues.filter(i => i.type === 'stagnant_deal');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArabic ? 'مركز جودة البيانات — FlowAI' : 'FlowAI Data Quality & Hygiene Hub'}
      description={
        isArabic
          ? 'رصد التكرارات المحتملة، البيانات الناقصة، والصفقات الراكدة بمراجعة المستخدم'
          : 'Detect potential duplicate contacts, missing outreach fields, and stagnant deals'
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* Quality Score Header */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center border border-brand-gold/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">
                  {isArabic ? 'تقرير صحة بيانات مساحة العمل' : 'Workspace Data Health Report'}
                </h4>
                <Badge variant={issues.length === 0 ? 'success' : 'gold'} size="sm">
                  {issues.length === 0
                    ? isArabic ? 'بيانات ممتازة' : 'Clean & Verified'
                    : isArabic ? `${issues.length} تنبيهات` : `${issues.length} Findings`}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic
                  ? 'يتم تقديم التوصيات للمراجعة البشرية دون إجراء أي دمج أو حذف تلقائي'
                  : 'Suggestions only: FlowAI never automatically merges or deletes records'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={runAudit}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-white border-slate-700 hover:bg-slate-800"
          >
            {isArabic ? 'إعادة الفحص' : 'Re-scan'}
          </Button>
        </div>

        {/* Breakdown Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isArabic ? 'تكرارات محتملة' : 'Potential Duplicates'}
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">{duplicates.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isArabic ? 'بيانات اتصال ناقصة' : 'Missing Contact Fields'}
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">{missingData.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isArabic ? 'صفقات تتطلب تحديثاً' : 'Stagnant Pipeline Deals'}
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">{stagnant.length}</p>
          </div>
        </div>

        {/* Detailed Issues List */}
        <div className="space-y-4">
          {issues.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-950">
                {isArabic ? 'سجلات مساحة العمل مكتملة وخالية من التكرارات!' : 'All workspace records pass quality checks!'}
              </p>
              <p className="text-[11px] text-emerald-700">
                {isArabic ? 'لا توجد تكرارات واضحة أو صفقات بدون جهة اتصال.' : 'No obvious duplicate contacts or orphan deals detected.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map(iss => (
                <div
                  key={iss.id}
                  className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 mt-0.5 ${
                          iss.severity === 'high'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : iss.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {iss.severity}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{iss.description}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{iss.suggestedAction}</p>
                      </div>
                    </div>
                  </div>

                  {/* Affected Records */}
                  {iss.affectedRecords.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        {isArabic ? 'السجلات المتأثرة للمراجعة:' : 'Affected Records to Review:'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {iss.affectedRecords.map(rec => (
                          <EvidenceCitation key={rec.id} evidence={rec} onNavigate={onClose} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
