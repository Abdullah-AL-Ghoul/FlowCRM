import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ActivityType } from '../../types/crm.types';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';

export interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createActivity, contacts, deals } = useCRM();
  const { session } = useAuth();
  const { t } = useI18n();

  const [type, setType] = useState<ActivityType>('call');
  const [description, setDescription] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('common.requiredField'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createActivity({
        type,
        description: description.trim(),
        contact_id: contactId || null,
        deal_id: dealId || null,
        user_id: session?.user?.id || null,
        occurred_at: new Date(occurredAt).toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'call', label: t('activities.types.call') },
    { value: 'email', label: t('activities.types.email') },
    { value: 'meeting', label: t('activities.types.meeting') },
    { value: 'note', label: t('activities.types.note') },
  ];

  const contactOptions = [
    { value: '', label: 'None' },
    ...contacts.map(c => ({
      value: c.id,
      label: `${c.full_name} (${c.company || 'Direct'})`,
    })),
  ];

  const dealOptions = [
    { value: '', label: 'None' },
    ...deals.map(d => ({
      value: d.id,
      label: d.title,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('activities.newActivity')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('activities.type')}
            value={type}
            onChange={e => setType(e.target.value as ActivityType)}
            options={typeOptions}
          />
          <Input
            label={t('activities.occurredAt')}
            type="datetime-local"
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('activities.relatedContact')}
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            options={contactOptions}
          />
          <Select
            label={t('activities.relatedDeal')}
            value={dealId}
            onChange={e => setDealId(e.target.value)}
            options={dealOptions}
          />
        </div>

        <Textarea
          label={t('activities.description')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Summarize key points, client sentiment, and agreed next steps..."
          rows={4}
          required
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
