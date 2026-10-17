import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { ActivityType } from '../../types/crm.types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { ActivityFormModal } from './ActivityFormModal';
import { formatDateTime, cn } from '../../lib/utils';
import {
  Clock,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  GitCommit,
  Building,
  Briefcase,
  User,
} from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const { activities } = useCRM();
  const { t, locale } = useI18n();

  const [filterType, setFilterType] = useState<string>('all');
  const [formModalOpen, setFormModalOpen] = useState(false);

  const filteredActivities = useMemo(() => {
    if (filterType === 'all') return activities;
    return activities.filter(a => a.type === filterType);
  }, [activities, filterType]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'call':
        return <Phone className="w-4 h-4 text-blue-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-amber-600" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'stage_change':
        return <GitCommit className="w-4 h-4 text-emerald-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const filterOptions = [
    { id: 'all', label: t('common.all') },
    { id: 'call', label: t('activities.types.call') },
    { id: 'email', label: t('activities.types.email') },
    { id: 'meeting', label: t('activities.types.meeting') },
    { id: 'note', label: t('activities.types.note') },
    { id: 'stage_change', label: t('activities.types.stage_change') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('activities.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('activities.subtitle')}
          </p>
        </div>
        <Button
          variant="gold"
          size="sm"
          onClick={() => setFormModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          {t('activities.newActivity')}
        </Button>
      </div>

      {/* Filter Badges */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setFilterType(opt.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer select-none',
              filterType === opt.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <Card>
        {filteredActivities.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Clock}
              title={t('activities.emptyActivities')}
              description="Keep your team in sync by recording customer calls, emails, and meetings."
              actionLabel={t('activities.newActivity')}
              onAction={() => setFormModalOpen(true)}
            />
          </div>
        ) : (
          <div className="p-6 relative">
            {/* Timeline Vertical Line */}
            <div className="absolute start-10 top-8 bottom-8 w-0.5 bg-slate-200 pointer-events-none" />

            <div className="space-y-6">
              {filteredActivities.map(act => (
                <div key={act.id} className="relative flex items-start gap-4 ps-2 group">
                  {/* Timeline Node Icon */}
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-xs group-hover:border-slate-400 transition-colors">
                    {getActivityIcon(act.type)}
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 hover:bg-white hover:border-slate-300 transition-all shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 capitalize">
                          {t(`activities.types.${act.type}`, act.type)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-medium">
                          {formatDateTime(act.occurred_at, locale)}
                        </span>
                      </div>
                      {act.user && (
                        <div className="flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Logged by {act.user.full_name}</span>
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                      {act.description}
                    </p>

                    {/* Linked Context Tags */}
                    {(act.contact || act.deal) && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        {act.contact && (
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{act.contact.full_name} ({act.contact.company || 'Direct'})</span>
                          </div>
                        )}
                        {act.deal && (
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>Deal: {act.deal.title}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      <ActivityFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
      />
    </div>
  );
};
