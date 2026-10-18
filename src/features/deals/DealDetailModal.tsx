import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Deal, DealStage } from '../../types/crm.types';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Calendar,
  Building,
  User,
  Edit2,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { DealAIPanel } from '../ai/components/DealAIPanel';
import { AISalesWriterModal } from '../ai/components/AISalesWriterModal';

export interface DealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
  onEdit: (deal: Deal) => void;
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  isOpen,
  onClose,
  deal,
  onEdit,
}) => {
  const { tasks } = useCRM();
  const { t, locale } = useI18n();
  const isArabic = locale === 'ar';
  const [salesWriterOpen, setSalesWriterOpen] = useState(false);

  if (!deal) return null;

  const associatedTasks = tasks.filter(t => t.deal_id === deal.id);

  const getStageBadgeVariant = (stage: DealStage) => {
    switch (stage) {
      case 'won':
        return 'success';
      case 'lost':
        return 'danger';
      case 'negotiation':
      case 'proposal':
        return 'gold';
      default:
        return 'info';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={deal.title}
        description={deal.contact ? `Client: ${deal.contact.full_name} (${deal.contact.company || 'N/A'})` : undefined}
        size="lg"
      >
        <div className="space-y-6">
          {/* Top Bar with Stage & Value */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(deal.value, deal.currency, locale)}
              </span>
              <Badge variant={getStageBadgeVariant(deal.stage)}>
                {t(`deals.stages.${deal.stage}`)}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={() => setSalesWriterOpen(true)}
                icon={<MessageSquare className="w-3.5 h-3.5" />}
              >
                {isArabic ? 'صياغة متابعة' : 'Draft Outreach'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(deal);
                }}
                icon={<Edit2 className="w-3.5 h-3.5" />}
              >
                {t('common.edit')}
              </Button>
            </div>
          </div>

          {/* Deal Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>{isArabic ? 'العميل:' : 'Contact:'}</strong>{' '}
                {deal.contact ? deal.contact.full_name : 'No primary contact linked'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>{isArabic ? 'تاريخ الإغلاق المتوقع:' : 'Target Close:'}</strong>{' '}
                {formatDate(deal.expected_close_date, locale)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>{isArabic ? 'المسؤول:' : 'Assignee:'}</strong>{' '}
                {deal.assignee?.full_name || 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>{isArabic ? 'المهام المرتبطة:' : 'Pending Tasks:'}</strong>{' '}
                {associatedTasks.filter(t => t.status !== 'completed').length} open
              </span>
            </div>
          </div>

          {/* Deal Notes */}
          {deal.notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {isArabic ? 'ملاحظات الصفقة الداخلية' : 'Internal Deal Notes'}
              </h4>
              <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-200/50 text-xs text-slate-700 whitespace-pre-wrap">
                {deal.notes}
              </div>
            </div>
          )}

          {/* FlowAI Deal Intelligence Panel */}
          <DealAIPanel
            deal={deal}
            onOpenSalesWriter={() => setSalesWriterOpen(true)}
          />
        </div>
      </Modal>

      {/* Sales Writer */}
      {salesWriterOpen && (
        <AISalesWriterModal
          isOpen={salesWriterOpen}
          onClose={() => setSalesWriterOpen(false)}
          initialDeal={deal}
          initialContact={deal.contact || null}
        />
      )}
    </>
  );
};
