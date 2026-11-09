import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DataQualityModal } from '../ai/components/DataQualityModal';
import { AISalesWriterModal } from '../ai/components/AISalesWriterModal';
import { LeadScoreBadge } from '../ai/components/LeadScoreBadge';
import { LeadScoringService } from '../ai/services/leadScoringService';

export const ContactsPage: React.FC = () => {
  const { contacts, deals, tasks, activities, deleteContact, loading } = useCRM();
  const { t, locale } = useI18n();
  const isArabic = locale === 'ar';

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

  // Pagination & Multi-Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Status Counts for Pill Filters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length, lead: 0, prospect: 0, customer: 0, churned: 0, inactive: 0 };
    contacts.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [contacts]);

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

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, statusFilter]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Selection handlers
  const allOnPageSelected =
    paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedContacts.some(c => c.id === id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedContacts.map(c => c.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectOne = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

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
      setSelectedIds(prev => prev.filter(id => id !== contactToDelete.id));
      setDeleteConfirmOpen(false);
      setContactToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => deleteContact(id)));
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Failed bulk deletion:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = () => {
    const targetContacts = contacts.filter(c => selectedIds.includes(c.id));
    exportContactsToCSV(targetContacts, `flowcrm_selected_contacts_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportContactsToCSV = (contactList: Contact[], filename: string) => {
    const csvData = contactList.map(c => ({
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

    downloadCSV(csv, filename);
  };

  const handleExportCSV = () => {
    exportContactsToCSV(filteredContacts, `flowcrm_contacts_${new Date().toISOString().split('T')[0]}.csv`);
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

      {/* Quick Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'lead', 'prospect', 'customer', 'churned', 'inactive'] as const).map(st => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{st === 'all' ? (isArabic ? 'الكل' : 'All') : t(`contacts.statuses.${st}`)}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === st
                  ? 'bg-brand-gold text-slate-950'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {statusCounts[st] || 0}
            </span>
          </button>
        ))}
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

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 sm:px-4 sm:py-2.5 rounded-xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-brand-gold text-slate-950 flex items-center justify-center font-bold text-[11px]">
              {selectedIds.length}
            </span>
            <span>{isArabic ? `تم تحديد ${selectedIds.length} جهة اتصال` : `${selectedIds.length} contacts selected`}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              icon={<Download className="w-3.5 h-3.5" />}
              className="text-xs text-white border-slate-700 hover:bg-slate-800"
            >
              {isArabic ? 'تصدير المحدد' : 'Export Selected'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {isArabic ? 'حذف المحدد' : 'Delete Selected'}
            </Button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              {isArabic ? 'إلغاء التحديد' : 'Clear'}
            </button>
          </div>
        </div>
      )}

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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-start w-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-brand-gold focus:ring-brand-gold cursor-pointer"
                        aria-label={isArabic ? 'تحديد كل الصفحة' : 'Select all on page'}
                      />
                    </th>
                    <th className="py-3 px-4 text-start">{t('contacts.fullName')}</th>
                    <th className="py-3 px-4 text-start">{t('contacts.company')}</th>
                    <th className="py-3 px-4 text-start">{t('contacts.status')}</th>
                    <th className="py-3 px-4 text-start">{t('contacts.assignedTo')}</th>
                    <th className="py-3 px-4 text-start">{t('common.date')}</th>
                    <th className="py-3 px-4 text-end">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedContacts.map(contact => {
                    const isSelected = selectedIds.includes(contact.id);
                    return (
                      <tr
                        key={contact.id}
                        className={`transition-colors group cursor-pointer ${
                          isSelected ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => handleView(contact)}
                      >
                        <td className="py-3.5 px-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => toggleSelectOne(contact.id, e)}
                            className="rounded border-slate-300 text-brand-gold focus:ring-brand-gold cursor-pointer"
                            aria-label={`Select ${contact.full_name}`}
                          />
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  {isArabic
                    ? `عرض ${filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى ${Math.min(currentPage * pageSize, filteredContacts.length)} من أصل ${filteredContacts.length}`
                    : `Showing ${filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredContacts.length)} of ${filteredContacts.length}`}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span>{isArabic ? 'لكل صفحة:' : 'Per page:'}</span>
                  <select
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-300 rounded-md px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="text-xs px-2.5 py-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? 'السابق' : 'Previous'}</span>
                </Button>
                <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="text-xs px-2.5 py-1"
                >
                  <span className="hidden sm:inline">{isArabic ? 'التالي' : 'Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
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

      {/* Confirm Single Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />

      {/* Confirm Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        loading={isBulkDeleting}
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
