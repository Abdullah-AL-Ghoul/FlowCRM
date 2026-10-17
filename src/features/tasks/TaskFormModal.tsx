import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Task, TaskPriority, TaskStatus } from '../../types/crm.types';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  const { createTask, contacts, deals, members } = useCRM();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [assignedTo, setAssignedTo] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueDate(task.due_date ? task.due_date.slice(0, 16) : '');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'pending');
      setAssignedTo(task.assigned_to || '');
      setContactId(task.contact_id || '');
      setDealId(task.deal_id || '');
    } else {
      setTitle('');
      setDescription('');
      // Default to today + 6 hours
      const defDate = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16);
      setDueDate(defDate);
      setPriority('medium');
      setStatus('pending');
      setAssignedTo(members[0]?.user_id || '');
      setContactId('');
      setDealId('');
    }
    setError(null);
  }, [task, isOpen, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setError(t('common.requiredField'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        due_date: new Date(dueDate).toISOString(),
        priority,
        status,
        assigned_to: assignedTo || null,
        contact_id: contactId || null,
        deal_id: dealId || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'low', label: t('tasks.priorities.low') },
    { value: 'medium', label: t('tasks.priorities.medium') },
    { value: 'high', label: t('tasks.priorities.high') },
    { value: 'urgent', label: t('tasks.priorities.urgent') },
  ];

  const statusOptions = [
    { value: 'pending', label: t('tasks.statuses.pending') },
    { value: 'in_progress', label: t('tasks.statuses.in_progress') },
    { value: 'completed', label: t('tasks.statuses.completed') },
    { value: 'cancelled', label: t('tasks.statuses.cancelled') },
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
      title={task ? t('tasks.editTask') : t('tasks.newTask')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <Input
          label={t('tasks.taskTitle')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Schedule commercial terms presentation"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('tasks.dueDate')}
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            required
          />
          <Select
            label={t('tasks.priority')}
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            options={priorityOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('tasks.status')}
            value={status}
            onChange={e => setStatus(e.target.value as TaskStatus)}
            options={statusOptions}
          />
          <Select
            label={t('tasks.assignedTo')}
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            options={assigneeOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('tasks.relatedContact')}
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            options={contactOptions}
          />
          <Select
            label={t('tasks.relatedDeal')}
            value={dealId}
            onChange={e => setDealId(e.target.value)}
            options={dealOptions}
          />
        </div>

        <Textarea
          label={t('tasks.description')}
          value={description}
          onChange={e => setDescription(e.target.value)}
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
