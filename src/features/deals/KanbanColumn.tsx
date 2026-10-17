import React, { useState } from 'react';
import { Deal, DealStage } from '../../types/crm.types';
import { DealCard } from './DealCard';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency, cn } from '../../lib/utils';
import { Plus } from 'lucide-react';

export interface KanbanColumnProps {
  stage: DealStage;
  title: string;
  deals: Deal[];
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
  onStageChange: (dealId: string, stage: DealStage) => void;
  onDropDeal: (dealId: string, stage: DealStage) => void;
  onNewDealAtStage: (stage: DealStage) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  title,
  deals,
  onEditDeal,
  onDeleteDeal,
  onStageChange,
  onDropDeal,
  onNewDealAtStage,
}) => {
  const { t, locale } = useI18n();
  const [isDragOver, setIsDragOver] = useState(false);

  const totalValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  const stageBorderColors: Record<DealStage, string> = {
    new: 'border-t-slate-400',
    qualified: 'border-t-sky-400',
    proposal: 'border-t-indigo-500',
    negotiation: 'border-t-amber-500',
    won: 'border-t-emerald-500',
    lost: 'border-t-rose-500',
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId) {
      onDropDeal(dealId, stage);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col w-72 sm:w-80 shrink-0 bg-slate-100/70 rounded-xl border border-slate-200/90 border-t-4 transition-all duration-150',
        stageBorderColors[stage],
        isDragOver && 'bg-amber-50/50 border-brand-gold/60 ring-2 ring-brand-gold/30'
      )}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-200/70 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {title}
            </h3>
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {deals.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {formatCurrency(totalValue, 'USD', locale)}
          </p>
        </div>
        <button
          onClick={() => onNewDealAtStage(stage)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          title={t('deals.newDeal')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Deals Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[150px]">
        {deals.length === 0 ? (
          <div className="h-28 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-[11px] text-slate-400 italic text-center px-4">
            {t('deals.emptyColumn')}
          </div>
        ) : (
          deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
              onStageChange={onStageChange}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
};
