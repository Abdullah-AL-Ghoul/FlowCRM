import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Clock,
  BarChart3,
  Settings,
  X,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { session } = useAuth();

  if (!isOpen) return null;

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/contacts', label: t('nav.contacts'), icon: Users },
    { to: '/deals', label: t('nav.pipeline'), icon: Kanban },
    { to: '/tasks', label: t('nav.tasks'), icon: CheckSquare },
    { to: '/activities', label: t('nav.activities'), icon: Clock },
    { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 start-0 max-w-xs w-full bg-brand-bg text-slate-200 z-50 flex flex-col shadow-2xl">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-gold flex items-center justify-center text-slate-950 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-white">FlowCRM</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-surface text-brand-gold border border-brand-gold/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-border">
          <p className="text-xs text-slate-400 truncate">{session?.workspace?.name}</p>
          <p className="text-xs font-semibold text-white truncate mt-0.5">{session?.profile?.full_name}</p>
        </div>
      </div>
    </div>
  );
};
