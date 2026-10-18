import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Contact } from '../../types/crm.types';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Mail, Phone, Building, Briefcase, CheckSquare, Edit, MessageSquare } from 'lucide-react';
import { ContactAIPanel } from '../ai/components/ContactAIPanel';
import { LeadScoreBadge } from '../ai/components/LeadScoreBadge';
import { LeadScoringService } from '../ai/services/leadScoringService';
import { AISalesWriterModal } from '../ai/components/AISalesWriterModal';

export interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onEdit: (contact: Contact) => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  isOpen,
  onClose,
  contact,
  onEdit,
}) => {
  const { deals, tasks, activities } = useCRM();
  const { t, locale } = useI18n();
  const [salesWriterOpen, setSalesWriterOpen] = useState(false);

  if (!contact) return null;

  const associatedDeals = deals.filter(d => d.contact_id === contact.id);
  const associatedTasks = tasks.filter(t => t.contact_id === contact.id);
  const associatedActivities = activities.filter(a => a.contact_id === contact.id);

  const leadScore = LeadScoringService.calculateLeadScore(
    contact,
    associatedDeals,
    associatedTasks,
    associatedActivities,
    locale === 'ar' ? 'ar' : 'en'
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'customer':
        return 'success';
      case 'prospect':
        return 'gold';
      case 'lead':
        return 'info';
      case 'churned':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={contact.full_name}
        description={contact.job_title ? `${contact.job_title} at ${contact.company || 'N/A'}` : contact.company || undefined}
        size="lg"
      >
        <div className="space-y-6">
          {/* Header Badges & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusBadgeVariant(contact.status)}>
                {t(`contacts.statuses.${contact.status}`)}
              </Badge>
              <LeadScoreBadge score={leadScore} />
              {contact.lead_source && (
                <Badge variant="neutral">
                  Source: {t(`contacts.sources.${contact.lead_source}`, contact.lead_source)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={() => setSalesWriterOpen(true)}
                icon={<MessageSquare className="w-3.5 h-3.5" />}
              >
                {locale === 'ar' ? 'صياغة رسالة' : 'Draft Message'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(contact);
                }}
                icon={<Edit className="w-3.5 h-3.5" />}
              >
                {t('common.edit')}
              </Button>
            </div>
          </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{contact.email || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{contact.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{contact.company || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Rep: {contact.assignee?.full_name || 'Unassigned'}</span>
          </div>
        </div>

        {/* Internal Notes */}
        {contact.notes && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {t('contacts.notes')}
            </h4>
            <div className="p-3.5 rounded-lg bg-amber-50/40 border border-amber-200/50 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {contact.notes}
            </div>
          </div>
        )}

        {/* Associated Deals */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span>{t('contacts.associatedDeals')} ({associatedDeals.length})</span>
          </h4>
          {associatedDeals.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No deals linked to this client yet.</p>
          ) : (
            <div className="space-y-2">
              {associatedDeals.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-xs hover:border-slate-300"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{d.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Close: {formatDate(d.expected_close_date, locale)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(d.value, d.currency, locale)}
                    </p>
                    <Badge variant="gold" size="sm" className="mt-0.5">
                      {t(`deals.stages.${d.stage}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Associated Tasks */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            <span>{t('contacts.associatedTasks')} ({associatedTasks.length})</span>
          </h4>
          {associatedTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No tasks pending for this contact.</p>
          ) : (
            <div className="space-y-2">
              {associatedTasks.map(tsk => (
                <div
                  key={tsk.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-xs"
                >
                  <p className="font-medium text-slate-900">{tsk.title}</p>
                  <span className="text-[11px] text-slate-500">
                    Due: {formatDate(tsk.due_date, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contextual FlowAI Intelligence Panel */}
        <ContactAIPanel
          contact={contact}
          onOpenSalesWriter={() => setSalesWriterOpen(true)}
        />
      </div>
    </Modal>

    {salesWriterOpen && (
      <AISalesWriterModal
        isOpen={salesWriterOpen}
        onClose={() => setSalesWriterOpen(false)}
        initialContact={contact}
      />
    )}
  </>
  );
};

