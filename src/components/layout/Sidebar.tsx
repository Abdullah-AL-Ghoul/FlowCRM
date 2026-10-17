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
  Layers,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { t } = useI18n();
  const { session } = useAuth();

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
    <aside className="hidden lg:flex flex-col w-64 bg-brand-bg text-slate-200 border-e border-brand-border shrink-0 select-none h-screen sticky top-0">
      {/* Brand & Workspace Header */}
      <div className="p-5 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">FlowCRM</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-brand-gold/15 text-brand-goldPale rounded border border-brand-gold/30 font-medium">
                SaaS
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[150px]">
              {session?.workspace?.name || 'Workspace'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-brand-surface text-brand-gold border border-brand-gold/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-brand-gold' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Demo Mode Badge / Plan Notice Footer */}
      {session?.isDemo && (
        <div className="p-4 m-3 rounded-xl bg-brand-surface border border-brand-gold/30">
          <div className="flex items-center gap-2 text-brand-gold text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>{t('common.demoModeActive')}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
            {t('common.demoModeNotice')}
          </p>
        </div>
      )}

      {/* User Mini Profile */}
      <div className="p-4 border-t border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-brand-gold shrink-0">
            {session?.profile?.full_name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="truncate">
            <p className="text-xs font-medium text-white truncate">{session?.profile?.full_name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{session?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
