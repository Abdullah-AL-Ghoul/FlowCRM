import React from 'react';
import { Deal, DealStage } from '../../types/crm.types';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Building, Calendar, Edit2, Trash2, ArrowRightLeft, GripVertical } from 'lucide-react';

export interface DealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onStageChange: (dealId: string, stage: DealStage) => void;
  onDragStart?: (e: React.DragEvent, dealId: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({
  deal,
  onEdit,
  onDelete,
  onStageChange,
  onDragStart,
}) => {
  const { t, locale } = useI18n();

  const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

  return (
    <div
      draggable
      onDragStart={e => onDragStart && onDragStart(e, deal.id)}
      className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-150 group cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 shrink-0" />
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-goldHover transition-colors truncate">
            {deal.title}
          </h4>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(deal)}
            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            title={t('common.edit')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(deal)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title={t('common.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Deal Value */}
      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="text-base font-extrabold text-slate-900 tracking-tight">
          {formatCurrency(deal.value, deal.currency, locale)}
        </span>
        {deal.stage === 'won' ? (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            {t('deals.stages.won')}
          </span>
        ) : deal.stage === 'lost' ? (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            {t('deals.stages.lost')}
          </span>
        ) : null}
      </div>

      {/* Associated Contact & Due Date */}
      <div className="mt-3 space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
        {deal.contact && (
          <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
            <Building className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{deal.contact.company || deal.contact.full_name}</span>
          </div>
        )}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Close: {formatDate(deal.expected_close_date, locale)}</span>
          </div>
        )}
      </div>

      {/* Footer: Assignee & Accessible Stage Select */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-800 text-brand-gold flex items-center justify-center text-[10px] font-bold">
            {deal.assignee?.full_name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <span className="text-[10px] text-slate-600 truncate max-w-[80px]">
            {deal.assignee?.full_name?.split(' ')[0] || 'Unassigned'}
          </span>
        </div>

        {/* Accessible Stage Selector fallback for drag & drop */}
        <div className="flex items-center gap-1">
          <ArrowRightLeft className="w-3 h-3 text-slate-400" />
          <select
            value={deal.stage}
            onChange={e => onStageChange(deal.id, e.target.value as DealStage)}
            className="text-[10px] py-0.5 ps-1 pe-4 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            aria-label={t('deals.changeStage')}
          >
            {stages.map(stg => (
              <option key={stg} value={stg}>
                {t(`deals.stages.${stg}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
