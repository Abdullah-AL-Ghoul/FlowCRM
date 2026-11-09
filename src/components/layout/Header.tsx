import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Globe, LogOut, Menu, Sparkles, Database, FileText, Scale, Search } from 'lucide-react';

export interface HeaderProps {
  onToggleMobileNav: () => void;
  onToggleCopilot?: () => void;
  onOpenMeetingModal?: () => void;
  onOpenSalesWriter?: () => void;
  onOpenContractModal?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileNav,
  onToggleCopilot,
  onOpenMeetingModal,
  onOpenSalesWriter,
  onOpenContractModal,
  onOpenCommandPalette,
}) => {
  const { locale, setLocale, t } = useI18n();
  const { session, signOut } = useAuth();

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Mobile Toggle & Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {session?.isDemo ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('common.demoModeActive')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Supabase Connected</span>
            </span>
          )}
        </div>

        {/* Mobile Search Icon Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            aria-label={locale === 'ar' ? 'بحث' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Center: Desktop Omnisearch Trigger */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/90 rounded-xl transition-all cursor-pointer shadow-xs max-w-xs lg:max-w-sm w-full mx-4"
          aria-label={locale === 'ar' ? 'البحث الشامل (Ctrl+K)' : 'Omnisearch (Ctrl+K)'}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="flex-1 text-start truncate">
            {locale === 'ar' ? 'البحث في النظام أو الانتقال...' : 'Search CRM or navigate...'}
          </span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs font-mono shrink-0">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Right side: Actions & User Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Meeting Intelligence Action */}
        {onOpenMeetingModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMeetingModal}
            icon={<FileText className="w-3.5 h-3.5 text-amber-600" />}
            className="text-xs hidden sm:inline-flex"
            title={locale === 'ar' ? 'تحليل محضر اجتماع' : 'Analyze Meeting Notes'}
          >
            <span>{locale === 'ar' ? 'محاضر الاجتماعات' : 'Meeting Notes'}</span>
          </Button>
        )}

        {/* Contract Intelligence Action */}
        {onOpenContractModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenContractModal}
            icon={<Scale className="w-3.5 h-3.5 text-amber-600" />}
            className="text-xs hidden lg:inline-flex"
            title={locale === 'ar' ? 'تحليل وفحص العقود' : 'Contract Intelligence'}
          >
            <span>{locale === 'ar' ? 'تحليل العقود' : 'Contracts'}</span>
          </Button>
        )}

        {/* AI Sales Writer Launcher */}
        {onOpenSalesWriter && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSalesWriter}
            icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
            className="text-xs hidden md:inline-flex"
            title={locale === 'ar' ? 'مساعد الكتابة الذكي' : 'AI Sales Writer'}
          >
            <span>{locale === 'ar' ? 'كتابة رسالة' : 'AI Writer'}</span>
          </Button>
        )}

        {/* FlowAI Copilot Global Launcher */}
        {onToggleCopilot && (
          <Button
            variant="gold"
            size="sm"
            onClick={onToggleCopilot}
            icon={<Sparkles className="w-3.5 h-3.5 text-slate-950" />}
            className="text-xs font-bold shadow-xs"
          >
            <span>FlowAI</span>
          </Button>
        )}

        {/* Language Switcher */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          icon={<Globe className="w-4 h-4 text-slate-500" />}
          className="text-xs"
        >
          {locale === 'en' ? 'العربية' : 'English'}
        </Button>

        {/* Sign Out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void signOut();
          }}
          icon={<LogOut className="w-4 h-4 text-slate-500" />}
          className="text-xs text-slate-600"
        >
          <span className="hidden sm:inline">{t('common.signOut')}</span>
        </Button>
      </div>
    </header>
  );
};
