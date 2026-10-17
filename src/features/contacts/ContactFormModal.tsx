import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Contact, ContactStatus } from '../../types/crm.types';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';

export interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact | null;
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  contact,
}) => {
  const { createContact, updateContact, members } = useCRM();
  const { t } = useI18n();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [leadSource, setLeadSource] = useState('website');
  const [status, setStatus] = useState<ContactStatus>('lead');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setFullName(contact.full_name || '');
      setEmail(contact.email || '');
      setPhone(contact.phone || '');
      setCompany(contact.company || '');
      setJobTitle(contact.job_title || '');
      setLeadSource(contact.lead_source || 'website');
      setStatus(contact.status || 'lead');
      setAssignedTo(contact.assigned_to || '');
      setNotes(contact.notes || '');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setLeadSource('website');
      setStatus('lead');
      setAssignedTo(members[0]?.user_id || '');
      setNotes('');
    }
    setError(null);
  }, [contact, isOpen, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError(t('common.requiredField'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (contact) {
        await updateContact(contact.id, {
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          job_title: jobTitle.trim() || null,
          lead_source: leadSource,
          status,
          assigned_to: assignedTo || null,
          notes: notes.trim() || null,
        });
      } else {
        await createContact({
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          job_title: jobTitle.trim() || null,
          lead_source: leadSource,
          status,
          assigned_to: assignedTo || null,
          notes: notes.trim() || null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'lead', label: t('contacts.statuses.lead') },
    { value: 'prospect', label: t('contacts.statuses.prospect') },
    { value: 'customer', label: t('contacts.statuses.customer') },
    { value: 'churned', label: t('contacts.statuses.churned') },
    { value: 'inactive', label: t('contacts.statuses.inactive') },
  ];

  const sourceOptions = [
    { value: 'website', label: t('contacts.sources.website') },
    { value: 'referral', label: t('contacts.sources.referral') },
    { value: 'linkedin', label: t('contacts.sources.linkedin') },
    { value: 'outreach', label: t('contacts.sources.outreach') },
    { value: 'conference', label: t('contacts.sources.conference') },
    { value: 'partner', label: t('contacts.sources.partner') },
  ];

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map(m => ({
      value: m.user_id,
      label: `${m.profile?.full_name || 'Member'} (${m.role})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? t('contacts.editContact') : t('contacts.addContact')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('contacts.fullName')}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <Input
            label={t('contacts.company')}
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('contacts.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            label={t('contacts.phone')}
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('contacts.jobTitle')}
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
          />
          <Select
            label={t('contacts.assignedTo')}
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            options={assigneeOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('contacts.status')}
            value={status}
            onChange={e => setStatus(e.target.value as ContactStatus)}
            options={statusOptions}
          />
          <Select
            label={t('contacts.leadSource')}
            value={leadSource}
            onChange={e => setLeadSource(e.target.value)}
            options={sourceOptions}
          />
        </div>

        <Textarea
          label={t('contacts.notes')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant="gold" size="sm" type="submit" loading={loading}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
