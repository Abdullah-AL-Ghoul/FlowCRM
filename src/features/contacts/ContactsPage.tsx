import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { Contact, ContactStatus } from '../../types/crm.types';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ContactFormModal } from './ContactFormModal';
import { ContactDetailModal } from './ContactDetailModal';
import { formatDate } from '../../lib/utils';
import { generateCSV, downloadCSV } from '../../lib/csv';
import {
  Users,
  Plus,
  Search,
  Download,
  Eye,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { DataQualityModal } from '../ai/components/DataQualityModal';
import { AISalesWriterModal } from '../ai/components/AISalesWriterModal';
import { LeadScoreBadge } from '../ai/components/LeadScoreBadge';
import { LeadScoringService } from '../ai/services/leadScoringService';

export const ContactsPage: React.FC = () => {
  const { contacts, deals, tasks, activities, deleteContact, loading } = useCRM();
  const { t, locale } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [contactToView, setContactToView] = useState<Contact | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataQualityOpen, setDataQualityOpen] = useState(false);
  const [salesWriterOpen, setSalesWriterOpen] = useState(false);


  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        contact.full_name.toLowerCase().includes(term) ||
        (contact.email && contact.email.toLowerCase().includes(term)) ||
        (contact.company && contact.company.toLowerCase().includes(term)) ||
        (contact.phone && contact.phone.includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [contacts, search, statusFilter]);

  const handleEdit = (c: Contact) => {
    setSelectedContact(c);
    setFormModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedContact(null);
    setFormModalOpen(true);
  };

  const handleView = (c: Contact) => {
    setContactToView(c);
    setDetailModalOpen(true);
  };

  const handleDeletePrompt = (c: Contact) => {
    setContactToDelete(c);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await deleteContact(contactToDelete.id);
      setDeleteConfirmOpen(false);
      setContactToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredContacts.map(c => ({
      name: c.full_name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      job_title: c.job_title || '',
      status: c.status,
      lead_source: c.lead_source || '',
      created_at: c.created_at,
    }));

    const csv = generateCSV(csvData, [
      { key: 'name', header: 'Full Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'company', header: 'Company' },
      { key: 'job_title', header: 'Job Title' },
      { key: 'status', header: 'Status' },
      { key: 'lead_source', header: 'Lead Source' },
      { key: 'created_at', header: 'Created Date' },
    ]);

    downloadCSV(csv, `flowcrm_contacts_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getStatusBadge = (status: ContactStatus) => {
    const variants: Record<ContactStatus, 'success' | 'gold' | 'info' | 'danger' | 'neutral'> = {
      customer: 'success',
      prospect: 'gold',
      lead: 'info',
      churned: 'danger',
      inactive: 'neutral',
    };
    return (
      <Badge variant={variants[status] || 'neutral'}>
        {t(`contacts.statuses.${status}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('contacts.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('contacts.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDataQualityOpen(true)}
            icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
          >
            {locale === 'ar' ? 'جودة البيانات' : 'Data Quality Hub'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSalesWriterOpen(true)}
            icon={<Sparkles className="w-4 h-4 text-brand-gold" />}
          >
            {locale === 'ar' ? 'كاتب المبيعات' : 'Sales Writer'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4 text-slate-600" />}
          >
            {t('common.exportCSV')}
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={handleCreate}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('contacts.addContact')}
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('contacts.searchPlaceholder')}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: t('contacts.filterByStatus') },
                { value: 'lead', label: t('contacts.statuses.lead') },
                { value: 'prospect', label: t('contacts.statuses.prospect') },
                { value: 'customer', label: t('contacts.statuses.customer') },
                { value: 'churned', label: t('contacts.statuses.churned') },
                { value: 'inactive', label: t('contacts.statuses.inactive') },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Contacts Table View */}
      <Card>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredContacts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title={t('contacts.emptyTitle')}
              description={t('contacts.emptySubtitle')}
              actionLabel={t('contacts.addContact')}
              onAction={handleCreate}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t('contacts.fullName')}</th>
                  <th className="py-3 px-4 text-start">{t('contacts.company')}</th>
                  <th className="py-3 px-4 text-start">{t('contacts.status')}</th>
                  <th className="py-3 px-4 text-start">{t('contacts.assignedTo')}</th>
                  <th className="py-3 px-4 text-start">{t('common.date')}</th>
                  <th className="py-3 px-4 text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredContacts.map(contact => (
                  <tr
                    key={contact.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => handleView(contact)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-goldHover transition-colors">
                          {contact.full_name}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-normal">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{contact.company || '—'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{contact.job_title}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getStatusBadge(contact.status)}
                        <LeadScoreBadge
                          score={LeadScoringService.calculateLeadScore(
                            contact,
                            deals.filter(d => d.contact_id === contact.id),
                            tasks.filter(t => t.contact_id === contact.id),
                            activities.filter(a => a.contact_id === contact.id),
                            locale === 'ar' ? 'ar' : 'en'
                          )}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-700 font-medium">
                        {contact.assignee?.full_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(contact.created_at, locale)}
                    </td>
                    <td
                      className="py-3.5 px-4 text-end whitespace-nowrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleView(contact)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          title={t('common.details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(contact)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          title={t('common.edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(contact)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Modal (Create / Edit) */}
      <ContactFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        contact={selectedContact}
      />

      {/* Detail Modal */}
      <ContactDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        contact={contactToView}
        onEdit={handleEdit}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />

      {/* Data Quality & Hygiene Modal */}
      {dataQualityOpen && (
        <DataQualityModal
          isOpen={dataQualityOpen}
          onClose={() => setDataQualityOpen(false)}
        />
      )}

      {/* Sales Writer Modal */}
      {salesWriterOpen && (
        <AISalesWriterModal
          isOpen={salesWriterOpen}
          onClose={() => setSalesWriterOpen(false)}
        />
      )}
    </div>
  );
};
