import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Search,
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Sparkles,
  FileText,
  Briefcase,
  X,
  CornerDownLeft,
} from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContactModal?: () => void;
  onOpenDealModal?: () => void;
  onOpenTaskModal?: () => void;
  onOpenCopilot?: () => void;
  onOpenSalesWriter?: () => void;
  onOpenMeetingModal?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'nav' | 'action' | 'contact' | 'deal' | 'task';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'gold' | 'info' | 'success' | 'warning' | 'neutral';
  perform: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenContactModal,
  onOpenDealModal,
  onOpenTaskModal,
  onOpenCopilot,
  onOpenSalesWriter,
  onOpenMeetingModal,
}) => {
  const navigate = useNavigate();
  const { contacts, deals, tasks } = useCRM();
  const { t, locale } = useI18n();
  const isArabic = locale === 'ar';

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items based on query
  const items = useMemo(() => {
    const q = query.toLowerCase().trim();
    const result: PaletteItem[] = [];

    // 1. Navigation items
    const navItems: PaletteItem[] = [
      {
        id: 'nav-dashboard',
        category: 'nav',
        title: t('nav.dashboard'),
        subtitle: isArabic ? 'نظرة عامة على مؤشرات الأداء' : 'Overview of pipeline metrics',
        icon: <LayoutDashboard className="w-4 h-4 text-brand-gold" />,
        perform: () => {
          navigate('/');
          onClose();
        },
      },
      {
        id: 'nav-contacts',
        category: 'nav',
        title: t('nav.contacts'),
        subtitle: isArabic ? 'دليل العملاء وجهات الاتصال' : 'Client accounts and phone/email directory',
        icon: <Users className="w-4 h-4 text-sky-500" />,
        perform: () => {
          navigate('/contacts');
          onClose();
        },
      },
      {
        id: 'nav-deals',
        category: 'nav',
        title: t('nav.pipeline'),
        subtitle: isArabic ? 'لوحة كانبان لصفقات المبيعات' : 'Kanban pipeline and opportunity stages',
        icon: <Kanban className="w-4 h-4 text-emerald-500" />,
        perform: () => {
          navigate('/deals');
          onClose();
        },
      },
      {
        id: 'nav-tasks',
        category: 'nav',
        title: t('nav.tasks'),
        subtitle: isArabic ? 'جدول المهام والمتابعات اليومية' : 'Due outreach items and follow-ups',
        icon: <CheckSquare className="w-4 h-4 text-amber-500" />,
        perform: () => {
          navigate('/tasks');
          onClose();
        },
      },
      {
        id: 'nav-activities',
        category: 'nav',
        title: t('nav.activities'),
        subtitle: isArabic ? 'سجل العمليات والتفاعلات' : 'Chronological audit trail',
        icon: <Clock className="w-4 h-4 text-indigo-500" />,
        perform: () => {
          navigate('/activities');
          onClose();
        },
      },
      {
        id: 'nav-reports',
        category: 'nav',
        title: t('nav.reports'),
        subtitle: isArabic ? 'التقارير وتحليلات المبيعات وتصدير CSV' : 'Analytics charts and sanitized CSV exports',
        icon: <BarChart3 className="w-4 h-4 text-purple-500" />,
        perform: () => {
          navigate('/reports');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        category: 'nav',
        title: t('nav.settings'),
        subtitle: isArabic ? 'إعدادات مساحة العمل واللغة والذكاء الاصطناعي' : 'Workspace, language, and AI quotas',
        icon: <Settings className="w-4 h-4 text-slate-400" />,
        perform: () => {
          navigate('/settings');
          onClose();
        },
      },
    ];

    // 2. Action items
    const actionItems: PaletteItem[] = [
      ...(onOpenContactModal
        ? [
            {
              id: 'action-new-contact',
              category: 'action' as const,
              title: isArabic ? 'إضافة عميل جديد' : 'Create New Contact',
              subtitle: isArabic ? 'إدخال جهة اتصال أو شركة جديدة' : 'Add client account with phone, email, and company',
              icon: <Plus className="w-4 h-4 text-sky-500" />,
              perform: () => {
                onClose();
                onOpenContactModal();
              },
            },
          ]
        : []),
      ...(onOpenDealModal
        ? [
            {
              id: 'action-new-deal',
              category: 'action' as const,
              title: isArabic ? 'إضافة صفقة جديدة' : 'Create New Deal',
              subtitle: isArabic ? 'تسجيل فرصة بيعية جديدة في خط الأنابيب' : 'Record pipeline opportunity with value and stage',
              icon: <Plus className="w-4 h-4 text-emerald-500" />,
              perform: () => {
                onClose();
                onOpenDealModal();
              },
            },
          ]
        : []),
      ...(onOpenTaskModal
        ? [
            {
              id: 'action-new-task',
              category: 'action' as const,
              title: isArabic ? 'إنشاء مهمة متابعة' : 'Create Follow-up Task',
              subtitle: isArabic ? 'تحديد موعد استحقاق وأولوية للمتابعة' : 'Schedule outreach with due date and priority',
              icon: <Plus className="w-4 h-4 text-amber-500" />,
              perform: () => {
                onClose();
                onOpenTaskModal();
              },
            },
          ]
        : []),
      ...(onOpenCopilot
        ? [
            {
              id: 'action-copilot',
              category: 'action' as const,
              title: isArabic ? 'فتح المساعد الذكي FlowAI' : 'Open FlowAI Copilot',
              subtitle: isArabic ? 'استفسر عن بيانات المبيعات بروابط موثقة' : 'Ask questions grounded in verified CRM tools',
              icon: <Sparkles className="w-4 h-4 text-brand-gold" />,
              badge: 'AI',
              badgeVariant: 'gold' as const,
              perform: () => {
                onClose();
                onOpenCopilot();
              },
            },
          ]
        : []),
      ...(onOpenSalesWriter
        ? [
            {
              id: 'action-sales-writer',
              category: 'action' as const,
              title: isArabic ? 'مساعد الكتابة الذكي' : 'Launch AI Sales Writer',
              subtitle: isArabic ? 'صياغة رسائل متابعة وعروض بيعية دقيقة' : 'Draft verified emails and proposals',
              icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
              badge: 'AI',
              badgeVariant: 'info' as const,
              perform: () => {
                onClose();
                onOpenSalesWriter();
              },
            },
          ]
        : []),
      ...(onOpenMeetingModal
        ? [
            {
              id: 'action-meeting-intel',
              category: 'action' as const,
              title: isArabic ? 'تحليل محضر اجتماع' : 'Analyze Meeting Notes',
              subtitle: isArabic ? 'استخراج القرارات والمخاطر ومقترحات المهام' : 'Extract decisions, risks, and proposed tasks',
              icon: <FileText className="w-4 h-4 text-amber-600" />,
              badge: 'AI',
              badgeVariant: 'warning' as const,
              perform: () => {
                onClose();
                onOpenMeetingModal();
              },
            },
          ]
        : []),
    ];

    // Filter Navigation & Actions
    navItems.forEach(item => {
      if (!q || item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q))) {
        result.push(item);
      }
    });

    actionItems.forEach(item => {
      if (!q || item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q))) {
        result.push(item);
      }
    });

    // 3. Search Contacts
    if (q) {
      contacts
        .filter(c =>
          c.full_name.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
        )
        .slice(0, 5)
        .forEach(c => {
          result.push({
            id: `contact-${c.id}`,
            category: 'contact',
            title: c.full_name,
            subtitle: [c.company, c.email, c.phone].filter(Boolean).join(' • '),
            icon: <Users className="w-4 h-4 text-sky-600" />,
            badge: t(`contacts.statuses.${c.status}`, c.status),
            badgeVariant: c.status === 'lead' ? 'gold' : c.status === 'customer' ? 'success' : 'neutral',
            perform: () => {
              navigate('/contacts');
              onClose();
            },
          });
        });

      // 4. Search Deals
      deals
        .filter(d =>
          d.title.toLowerCase().includes(q) ||
          (d.contact?.full_name && d.contact.full_name.toLowerCase().includes(q)) ||
          (d.contact?.company && d.contact.company.toLowerCase().includes(q))
        )
        .slice(0, 5)
        .forEach(d => {
          result.push({
            id: `deal-${d.id}`,
            category: 'deal',
            title: d.title,
            subtitle: `${formatCurrency(d.value, d.currency)} • ${d.contact?.full_name || 'No contact'}`,
            icon: <Briefcase className="w-4 h-4 text-emerald-600" />,
            badge: t(`deals.stages.${d.stage}`, d.stage),
            badgeVariant: d.stage === 'won' ? 'success' : d.stage === 'lost' ? 'neutral' : 'info',
            perform: () => {
              navigate('/deals');
              onClose();
            },
          });
        });

      // 5. Search Tasks
      tasks
        .filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)))
        .slice(0, 5)
        .forEach(tsk => {
          result.push({
            id: `task-${tsk.id}`,
            category: 'task',
            title: tsk.title,
            subtitle: `${isArabic ? 'الاستحقاق: ' : 'Due: '}${formatDate(tsk.due_date)}`,
            icon: <CheckSquare className="w-4 h-4 text-amber-600" />,
            badge: t(`tasks.priorities.${tsk.priority}`, tsk.priority),
            badgeVariant: tsk.priority === 'urgent' ? 'warning' : 'neutral',
            perform: () => {
              navigate('/tasks');
              onClose();
            },
          });
        });
    }

    return result;
  }, [
    query,
    contacts,
    deals,
    tasks,
    t,
    isArabic,
    navigate,
    onClose,
    onOpenContactModal,
    onOpenDealModal,
    onOpenTaskModal,
    onOpenCopilot,
    onOpenSalesWriter,
    onOpenMeetingModal,
  ]);

  // Adjust selection bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const categoryHeaders: Record<string, string> = {
    nav: isArabic ? 'الصفحات والأقسام' : 'Navigation',
    action: isArabic ? 'إجراءات سريعة' : 'Quick Actions',
    contact: isArabic ? 'جهات الاتصال' : 'Contacts',
    deal: isArabic ? 'الصفقات وفرص البيع' : 'Deals & Opportunities',
    task: isArabic ? 'المهام والمتابعات' : 'Tasks',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] transition-all duration-150 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? 'لوحة الأوامر والبحث الشامل' : 'Command Palette'}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200/90 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              isArabic
                ? 'ابحث في العملاء، الصفقات، المهام، أو انتقل بسرعة... (Ctrl+K)'
                : 'Search contacts, deals, tasks, or navigate... (Ctrl+K)'
            }
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-300 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium">
                {isArabic ? 'لم يتم العثور على نتائج تطابق بحثك' : 'No matching results found'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isArabic ? 'جرّب البحث باسم عميل أو صفقة أو كلمة مفتاحية' : 'Try searching by contact name, deal, or keyword'}
              </p>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const prevItem = items[idx - 1];
              const showCategoryHeader = !prevItem || prevItem.category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {showCategoryHeader && (
                    <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {categoryHeaders[item.category] || item.category}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={item.perform}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-start transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-surface text-white border border-brand-gold/30 shadow-xs'
                        : 'text-slate-800 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-slate-800/80 text-brand-gold' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className={`text-xs truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ms-2">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-brand-gold/20 text-brand-goldPale border-brand-gold/40'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-brand-gold hidden sm:inline" />
                      )}
                    </div>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-mono">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-mono">↓</kbd>{' '}
              {isArabic ? 'للتنقل' : 'to navigate'}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-mono">↵</kbd>{' '}
              {isArabic ? 'للاختيار' : 'to select'}
            </span>
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-mono">ESC</kbd>{' '}
            {isArabic ? 'للإغلاق' : 'to close'}
          </div>
        </div>
      </div>
    </div>
  );
};
