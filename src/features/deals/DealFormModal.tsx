import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Deal, DealStage } from '../../types/crm.types';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';

export interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: Deal | null;
  defaultStage?: DealStage;
}

export const DealFormModal: React.FC<DealFormModalProps> = ({
  isOpen,
  onClose,
  deal,
  defaultStage = 'new',
}) => {
  const { createDeal, updateDeal, contacts, members } = useCRM();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [stage, setStage] = useState<DealStage>(defaultStage);
  const [contactId, setContactId] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deal) {
      setTitle(deal.title || '');
      setValue(deal.value?.toString() || '0');
      setCurrency(deal.currency || 'USD');
      setStage(deal.stage || 'new');
      setContactId(deal.contact_id || '');
      setExpectedCloseDate(deal.expected_close_date || '');
      setAssignedTo(deal.assigned_to || '');
      setNotes(deal.notes || '');
    } else {
      setTitle('');
      setValue('10000');
      setCurrency('USD');
      setStage(defaultStage);
      setContactId(contacts[0]?.id || '');
      setExpectedCloseDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
      setAssignedTo(members[0]?.user_id || '');
      setNotes('');
    }
    setError(null);
  }, [deal, defaultStage, isOpen, contacts, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('common.requiredField'));
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setError('Value must be a valid positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (deal) {
        await updateDeal(deal.id, {
          title: title.trim(),
          value: numValue,
          currency,
          stage,
          contact_id: contactId || null,
          expected_close_date: expectedCloseDate || null,
          assigned_to: assignedTo || null,
          notes: notes.trim() || null,
        });
      } else {
        await createDeal({
          title: title.trim(),
          value: numValue,
          currency,
          stage,
          contact_id: contactId || null,
          expected_close_date: expectedCloseDate || null,
          assigned_to: assignedTo || null,
          notes: notes.trim() || null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save deal');
    } finally {
      setLoading(false);
    }
  };

  const stageOptions: { value: DealStage; label: string }[] = [
    { value: 'new', label: t('deals.stages.new') },
    { value: 'qualified', label: t('deals.stages.qualified') },
    { value: 'proposal', label: t('deals.stages.proposal') },
    { value: 'negotiation', label: t('deals.stages.negotiation') },
    { value: 'won', label: t('deals.stages.won') },
    { value: 'lost', label: t('deals.stages.lost') },
  ];

  const contactOptions = [
    { value: '', label: 'No Contact Linked' },
    ...contacts.map(c => ({
      value: c.id,
      label: `${c.full_name} (${c.company || 'Direct'})`,
    })),
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
      title={deal ? t('deals.editDeal') : t('deals.newDeal')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <Input
          label={t('deals.dealTitle')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Enterprise Cloud Migration SLA"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('deals.dealValue')}
            type="number"
            min="0"
            step="100"
            value={value}
            onChange={e => setValue(e.target.value)}
            required
          />
          <Select
            label={t('deals.currency')}
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'SAR', label: 'SAR (﷼)' },
              { value: 'AED', label: 'AED (د.إ)' },
              { value: 'GBP', label: 'GBP (£)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('deals.stage')}
            value={stage}
            onChange={e => setStage(e.target.value as DealStage)}
            options={stageOptions}
          />
          <Select
            label={t('deals.associatedContact')}
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            options={contactOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('deals.expectedCloseDate')}
            type="date"
            value={expectedCloseDate}
            onChange={e => setExpectedCloseDate(e.target.value)}
          />
          <Select
            label={t('deals.assignedTo')}
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            options={assigneeOptions}
          />
        </div>

        <Textarea
          label={t('deals.notes')}
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
