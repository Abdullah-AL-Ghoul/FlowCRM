import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { Task, TaskPriority } from '../../types/crm.types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TaskFormModal } from './TaskFormModal';
import { formatDateTime, isTaskDueToday, isTaskOverdue, cn } from '../../lib/utils';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  Building,
  Briefcase,
  Trash2,
  CheckCircle2,
  Circle,
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { tasks, toggleTaskStatus, deleteTask } = useCRM();
  const { t, locale } = useI18n();

  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (activeTab === 'completed') return task.status === 'completed';
      if (activeTab === 'today') return isTaskDueToday(task.due_date, task.status);
      if (activeTab === 'overdue') return isTaskOverdue(task.due_date, task.status);
      if (activeTab === 'upcoming') {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        return task.status !== 'completed' && dueDate > now && !isTaskDueToday(task.due_date, task.status);
      }
      return true; // all
    });
  }, [tasks, activeTab]);

  const handleDeletePrompt = (task: Task) => {
    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTask(taskToDelete.id);
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (task: Task) => {
    await toggleTaskStatus(task.id, task.status);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const variants: Record<TaskPriority, 'danger' | 'warning' | 'info' | 'neutral'> = {
      urgent: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'neutral',
    };
    return (
      <Badge variant={variants[priority]}>
        {t(`tasks.priorities.${priority}`)}
      </Badge>
    );
  };

  const tabs = [
    { id: 'all', label: t('tasks.filters.all'), count: tasks.length },
    {
      id: 'today',
      label: t('tasks.filters.today'),
      count: tasks.filter(t => isTaskDueToday(t.due_date, t.status)).length,
    },
    {
      id: 'overdue',
      label: t('tasks.filters.overdue'),
      count: tasks.filter(t => isTaskOverdue(t.due_date, t.status)).length,
      alert: true,
    },
    {
      id: 'upcoming',
      label: t('tasks.filters.upcoming'),
      count: tasks.filter(
        t =>
          t.status !== 'completed' &&
          new Date(t.due_date) > new Date() &&
          !isTaskDueToday(t.due_date, t.status)
      ).length,
    },
    {
      id: 'completed',
      label: t('tasks.filters.completed'),
      count: tasks.filter(t => t.status === 'completed').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('tasks.title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('tasks.subtitle')}
          </p>
        </div>
        <Button
          variant="gold"
          size="sm"
          onClick={() => setFormModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          {t('tasks.newTask')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200/80">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap select-none cursor-pointer',
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.2 text-[10px] rounded-full font-bold',
                activeTab === tab.id
                  ? 'bg-slate-700 text-brand-goldPale'
                  : tab.alert && tab.count > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-200 text-slate-700'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <Card>
        {filteredTasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CheckSquare}
              title={t('tasks.emptyTasks')}
              description="Stay on top of client follow-ups by scheduling your next outreach task."
              actionLabel={t('tasks.newTask')}
              onAction={() => setFormModalOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map(task => {
              const overdue = isTaskOverdue(task.due_date, task.status);
              const dueToday = isTaskDueToday(task.due_date, task.status);
              const isDone = task.status === 'completed';

              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4 group',
                    isDone && 'opacity-60 bg-slate-50/40'
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggle(task)}
                      className="mt-0.5 text-slate-400 hover:text-slate-900 transition-colors shrink-0 focus:outline-none"
                      title={isDone ? t('tasks.markPending') : t('tasks.markCompleted')}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={cn(
                            'text-sm font-semibold text-slate-900 tracking-tight',
                            isDone && 'line-through text-slate-400'
                          )}
                        >
                          {task.title}
                        </h4>
                        {getPriorityBadge(task.priority)}
                        {overdue && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                        {dueToday && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Due Today
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Associated context tags */}
                      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(task.due_date, locale)}
                        </span>
                        {task.contact && (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Building className="w-3 h-3 text-slate-400" />
                            {task.contact.full_name}
                          </span>
                        )}
                        {task.deal && (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {task.deal.title}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-slate-500">
                            Assignee: {task.assignee.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeletePrompt(task)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Form Modal */}
      <TaskFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};
