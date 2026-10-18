import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { Deal, DealStage } from '../../types/crm.types';
import { KanbanColumn } from './KanbanColumn';
import { DealFormModal } from './DealFormModal';
import { DealDetailModal } from './DealDetailModal';
import { AISalesWriterModal } from '../ai/components/AISalesWriterModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { formatCurrency } from '../../lib/utils';
import { Plus, Search, Kanban as KanbanIcon, Sparkles } from 'lucide-react';

export const DealsKanbanPage: React.FC = () => {
  const { deals, updateDealStage, deleteDeal, metrics } = useCRM();
  const { t, locale } = useI18n();

  const [search, setSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dealToView, setDealToView] = useState<Deal | null>(null);
  const [salesWriterOpen, setSalesWriterOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<DealStage>('new');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        deal.title.toLowerCase().includes(term) ||
        (deal.contact?.full_name && deal.contact.full_name.toLowerCase().includes(term)) ||
        (deal.contact?.company && deal.contact.company.toLowerCase().includes(term))
      );
    });
  }, [deals, search]);

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setFormModalOpen(true);
  };

  const handleViewDeal = (deal: Deal) => {
    setDealToView(deal);
    setDetailModalOpen(true);
  };

  const handleCreateDeal = (stage: DealStage = 'new') => {
    setSelectedDeal(null);
    setDefaultStage(stage);
    setFormModalOpen(true);
  };

  const handleDeletePrompt = (deal: Deal) => {
    setDealToDelete(deal);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dealToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDeal(dealToDelete.id);
      setDeleteConfirmOpen(false);
      setDealToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    await updateDealStage(dealId, newStage);
  };

  const handleDropDeal = async (dealId: string, newStage: DealStage) => {
    await updateDealStage(dealId, newStage);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('deals.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('deals.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSalesWriterOpen(true)}
            icon={<Sparkles className="w-4 h-4 text-brand-gold" />}
          >
            {locale === 'ar' ? 'كاتب المبيعات' : 'Sales Writer'}
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => handleCreateDeal('new')}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('deals.newDeal')}
          </Button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Deals</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{metrics?.activeDealsCount || 0}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <KanbanIcon className="w-4 h-4" />
          </div>
        </Card>
        <Card className="p-4 bg-white flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Open Value</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(metrics?.openPipelineValue || 0, 'USD', locale)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-brand-gold border border-amber-200/60">
            <Sparkles className="w-4 h-4" />
          </div>
        </Card>
        <Card className="p-4 bg-white flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Closed Won</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(metrics?.wonDealsValue || 0, 'USD', locale)} ({metrics?.wonDealsCount || 0})
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/60">
            <Sparkles className="w-4 h-4" />
          </div>
        </Card>
      </div>

      {/* Search Toolbar */}
      <Card>
        <div className="p-3.5 max-w-md">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search deals by title, company, or contact..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Interactive Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none">
        {stages.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage);
          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              title={t(`deals.stages.${stage}`)}
              deals={stageDeals}
              onEditDeal={handleViewDeal}
              onDeleteDeal={handleDeletePrompt}
              onStageChange={handleStageChange}
              onDropDeal={handleDropDeal}
              onNewDealAtStage={handleCreateDeal}
            />
          );
        })}
      </div>

      {/* Form Modal */}
      <DealFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        deal={selectedDeal}
        defaultStage={defaultStage}
      />

      {/* Deal Detail & Intelligence Modal */}
      {detailModalOpen && (
        <DealDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          deal={dealToView}
          onEdit={deal => {
            setDetailModalOpen(false);
            handleEditDeal(deal);
          }}
        />
      )}

      {/* Sales Writer Modal */}
      {salesWriterOpen && (
        <AISalesWriterModal
          isOpen={salesWriterOpen}
          onClose={() => setSalesWriterOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};
