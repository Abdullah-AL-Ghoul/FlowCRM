import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useCRM } from '../../../context/CRMContext';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import { MeetingIntelligenceResult, ProposedTask } from '../types/ai.types';
import {
  Sparkles,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  FileText,
  Calendar,
  Check,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export interface MeetingIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeetingIntelligenceModal: React.FC<MeetingIntelligenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createTask, contacts, deals } = useCRM();
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const [rawNotes, setRawNotes] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeetingIntelligenceResult | null>(null);
  const [tasksToCreate, setTasksToCreate] = useState<ProposedTask[]>([]);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [tasksCreatedCount, setTasksCreatedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!rawNotes.trim()) return;
    setLoading(true);
    setError(null);
    setTasksCreatedCount(null);

    try {
      const analyzed = await flowAIService.analyzeMeetingNotes(
        rawNotes,
        'workspace-active',
        locale === 'ar' ? 'ar' : 'en'
      );
      setResult(analyzed);
      setTasksToCreate(analyzed.proposedTasks);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze meeting transcript');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskSelection = (id: string) => {
    setTasksToCreate(prev =>
      prev.map(t => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const updateTaskField = (id: string, field: keyof ProposedTask, value: any) => {
    setTasksToCreate(prev =>
      prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleCreateApprovedTasks = async () => {
    const selected = tasksToCreate.filter(t => t.selected);
    if (selected.length === 0) return;

    setCreatingTasks(true);
    let count = 0;

    try {
      for (const item of selected) {
        await createTask({
          title: item.title,
          description: item.description || 'Extracted via FlowAI Meeting Intelligence',
          due_date: item.suggestedDueDate
            ? new Date(item.suggestedDueDate).toISOString()
            : new Date(Date.now() + 86400000 * 2).toISOString(),
          priority: item.priority,
          status: 'pending',
          contact_id: selectedContactId || null,
          deal_id: selectedDealId || null,
          assigned_to: null,
        });
        count++;
      }
      setTasksCreatedCount(count);
    } catch (err: any) {
      console.error('Failed to create approved tasks:', err);
      setError(err?.message || 'Failed to persist created tasks');
    } finally {
      setCreatingTasks(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArabic ? 'ذكاء الاجتماعات — FlowAI' : 'FlowAI Meeting Intelligence'}
      description={
        isArabic
          ? 'استخلاص القرارات، المخاطر، والمهام التنفيذية من محاضر الاجتماعات ونصوص المحادثات'
          : 'Extract executive summaries, explicit decisions, risks, and actionable tasks from notes'
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* Input Transcript Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isArabic ? 'نص أو محضر الاجتماع (Untrusted Data):' : 'Meeting Notes or Transcript:'}
            </label>
            <span className="text-[11px] text-slate-400">
              {isArabic ? 'ملاحظات الاجتماع تعامل كبيانات آمنة معزولة' : 'Encapsulated in anti-injection boundaries'}
            </span>
          </div>

          <textarea
            value={rawNotes}
            onChange={e => setRawNotes(e.target.value)}
            rows={5}
            placeholder={
              isArabic
                ? 'الصق محضر الاجتماع أو الملاحظات هنا... (مثال: ناقشنا مع أحمد من شركة الأفق متطلبات العقد، وتم الاتفاق على إرسال العرض المحدث بحلول يوم الثلاثاء...)'
                : 'Paste meeting transcript or notes here... (e.g. Met with Sarah and Omar regarding enterprise onboarding. Agreed to deliver updated proposal by Thursday. Open question on SSO integration...)'
            }
            className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-900"
          />

          {/* Associate with Contact or Deal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isArabic ? 'ربط جهة اتصال بالمهام المستخلصة:' : 'Link Contact to extracted tasks:'}
              </label>
              <select
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">{isArabic ? '— اختياري: اختر عميلاً —' : '— Optional: Select Contact —'}</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.company || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isArabic ? 'ربط صفقة بالمهام المستخلصة:' : 'Link Deal to extracted tasks:'}
              </label>
              <select
                value={selectedDealId}
                onChange={e => setSelectedDealId(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">{isArabic ? '— اختياري: اختر صفقة —' : '— Optional: Select Deal —'}</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.currency} {d.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="gold"
              onClick={handleAnalyze}
              disabled={loading || !rawNotes.trim()}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {loading
                ? isArabic
                  ? 'جاري التحليل...'
                  : 'Analyzing Notes...'
                : isArabic
                ? 'تحليل الاجتماع واستخلاص المهام'
                : 'Analyze Meeting Intelligence'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Results Sections */}
        {result && (
          <div className="space-y-5 pt-4 border-t border-slate-200">
            {/* Executive Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-gold" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
                </h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {result.executiveSummary}
              </p>
            </div>

            {/* Key Points & Explicit Decisions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-2">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? 'القرارات المتفق عليها' : 'Explicit Decisions'}</span>
                </h5>
                <ul className="space-y-1">
                  {result.explicitDecisions.map((d, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{d}</span>
                    </li>
                  ))}
                  {result.explicitDecisions.length === 0 && (
                    <li className="text-xs text-slate-400 italic">No explicit decisions recorded.</li>
                  )}
                </ul>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-2">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isArabic ? 'أسئلة ومخاطر مفتوحة' : 'Open Questions & Risks'}</span>
                </h5>
                <ul className="space-y-1">
                  {result.openQuestions.map((q, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">?</span>
                      <span>{q}</span>
                    </li>
                  ))}
                  {result.potentialRisks.map((r, i) => (
                    <li key={i} className="text-xs text-rose-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Proposed Tasks & Review Checklist */}
            <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-brand-gold" />
                    <span>
                      {isArabic
                        ? `المهام المقترحة للمراجعة والإنشاء (${tasksToCreate.length})`
                        : `Proposed Tasks for Review (${tasksToCreate.length})`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isArabic
                      ? 'راجع المهام وعدّل المواعيد قبل إدراجها في نظام إدارة المهام'
                      : 'Review and confirm tasks before persisting them to CRM records'}
                  </p>
                </div>

                <Badge variant="gold" size="sm">
                  Human Approval Required
                </Badge>
              </div>

              <div className="space-y-2">
                {tasksToCreate.map(task => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      task.selected ? 'border-brand-gold/60 shadow-2xs' : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.selected}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="mt-1 rounded text-brand-gold focus:ring-brand-gold"
                      />
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={task.title}
                          onChange={e => updateTaskField(task.id, 'title', e.target.value)}
                          className="text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none w-full"
                        />
                        {task.description && (
                          <p className="text-[11px] text-slate-500">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <input
                          type="date"
                          value={task.suggestedDueDate || ''}
                          onChange={e => updateTaskField(task.id, 'suggestedDueDate', e.target.value)}
                          className="bg-transparent text-[11px] focus:outline-none"
                        />
                      </div>

                      <select
                        value={task.priority}
                        onChange={e => updateTaskField(task.id, 'priority', e.target.value)}
                        className="text-[11px] py-1 px-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Task Creation Trigger */}
              <div className="pt-2 flex items-center justify-between">
                {tasksCreatedCount !== null ? (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isArabic
                        ? `تم إنشاء ${tasksCreatedCount} مهام بنجاح في مساحة العمل!`
                        : `Successfully created ${tasksCreatedCount} tasks in CRM!`}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    {tasksToCreate.filter(t => t.selected).length} tasks selected for creation
                  </span>
                )}

                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleCreateApprovedTasks}
                  disabled={creatingTasks || tasksToCreate.filter(t => t.selected).length === 0}
                  icon={creatingTasks ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                >
                  {creatingTasks
                    ? isArabic
                      ? 'جاري الإنشاء...'
                      : 'Creating Tasks...'
                    : isArabic
                    ? 'إنشاء المهام المعتمدة في CRM'
                    : 'Create Approved Tasks in CRM'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
