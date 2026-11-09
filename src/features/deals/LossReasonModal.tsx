import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useI18n } from '../../i18n/I18nContext';
import { AlertCircle } from 'lucide-react';

export interface LossReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => Promise<void>;
  dealTitle: string;
}

export const LossReasonModal: React.FC<LossReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dealTitle,
}) => {
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const reasons = isArabic
    ? [
        { id: 'pricing', label: 'السعر أو قيود الميزانية' },
        { id: 'competitor', label: 'تم التعاقد مع منافس آخر' },
        { id: 'timing', label: 'التوقيت غير مناسب / تأجيل المشروع' },
        { id: 'product_gap', label: 'نقص في الميزات والحلول التقنية المطلوبة' },
        { id: 'no_decision', label: 'عدم اتخاذ قرار من قبل العميل / فقدان التواصل' },
        { id: 'other', label: 'سبب آخر' },
      ]
    : [
        { id: 'pricing', label: 'Price or budget constraints' },
        { id: 'competitor', label: 'Chose a competitor' },
        { id: 'timing', label: 'Timing / Project postponed' },
        { id: 'product_gap', label: 'Product feature or requirement gap' },
        { id: 'no_decision', label: 'No decision made / Lost contact' },
        { id: 'other', label: 'Other reason' },
      ];

  const [selectedReason, setSelectedReason] = useState(reasons[0].label);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(selectedReason, notes.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArabic ? 'تسجيل سبب خسارة الصفقة' : 'Record Deal Loss Reason'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{dealTitle}</span>
            <p className="mt-0.5 text-rose-700">
              {isArabic
                ? 'يساعد تحديد سبب الخسارة في تحسين دقة التحليلات واستراتيجيات المبيعات القادمة.'
                : 'Capturing loss reasons provides data for pipeline intelligence and win/loss analytics.'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            {isArabic ? 'السبب الرئيسي لعدم إتمام الصفقة *' : 'Primary Loss Reason *'}
          </label>
          <div className="space-y-2">
            {reasons.map(r => (
              <label
                key={r.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  selectedReason === r.label
                    ? 'border-rose-300 bg-rose-50/50 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="loss_reason"
                  checked={selectedReason === r.label}
                  onChange={() => setSelectedReason(r.label)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {isArabic ? 'ملاحظات إضافية أو تفاصيل المنافس' : 'Additional Context or Feedback'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={
              isArabic
                ? 'مثال: اختار العميل الحل البديل بسبب توفر ميزة خاصة بالتقارير...'
                : 'e.g., Prospect chose competitor due to specialized reporting feature...'
            }
            className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" variant="danger" size="sm" loading={loading}>
            {isArabic ? 'تأكيد وحفظ الخسارة' : 'Confirm Loss'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
