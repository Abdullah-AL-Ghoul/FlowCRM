import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { useI18n } from '../../i18n/I18nContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import {
  User,
  Building,
  Users,
  Globe,
  RotateCcw,
  Shield,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { AISettingsSection } from '../ai/components/AISettingsSection';

export const SettingsPage: React.FC = () => {
  const { session, signOut } = useAuth();
  const { members, resetDemoData } = useCRM();
  const { t, locale, setLocale } = useI18n();

  const [fullName, setFullName] = useState(session?.profile?.full_name || '');
  const [workspaceName, setWorkspaceName] = useState(session?.workspace?.name || '');
  const [savedNotice, setSavedNotice] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await resetDemoData();
      alert('Demo data restored to initial baseline.');
    } finally {
      setResetting(false);
    }
  };

  const roleBadges: Record<string, 'gold' | 'info' | 'success' | 'neutral'> = {
    owner: 'gold',
    admin: 'info',
    manager: 'success',
    sales_rep: 'neutral',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          {t('settings.subtitle')}
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{t('common.saved')}</span>
        </div>
      )}

      {/* Language & Direction Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-gold" />
            <CardTitle>{t('settings.languageSection')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">{t('settings.languageDesc')}</p>
          <div className="flex gap-3">
            <Button
              variant={locale === 'en' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLocale('en')}
            >
              {t('common.english')} (LTR)
            </Button>
            <Button
              variant={locale === 'ar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLocale('ar')}
            >
              {t('common.arabic')} (RTL)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-gold" />
            <CardTitle>{t('settings.profileSection')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <Input
              label={t('settings.name')}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            <Input
              label={t('settings.email')}
              value={session?.profile?.email || session?.user?.email || ''}
              disabled
              helperText="Managed through Supabase Auth identity"
            />
            <Button variant="primary" size="sm" type="submit">
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Workspace Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-gold" />
            <CardTitle>{t('settings.workspaceSection')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <Input
            label={t('settings.workspaceName')}
            value={workspaceName}
            onChange={e => setWorkspaceName(e.target.value)}
          />
          <Input
            label={t('settings.workspaceSlug')}
            value={session?.workspace?.slug || 'apex-global'}
            disabled
          />
        </CardContent>
      </Card>

      {/* Team Members & Authorization Policy Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-gold" />
            <CardTitle>{t('settings.teamSection')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-slate-500">{t('settings.teamDesc')}</p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {members.map(member => (
              <div key={member.id} className="p-3.5 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold">
                    {member.profile?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{member.profile?.full_name}</p>
                    <p className="text-[11px] text-slate-400">{member.profile?.email}</p>
                  </div>
                </div>
                <Badge variant={roleBadges[member.role] || 'neutral'}>
                  {t(`settings.roles.${member.role}`, member.role)}
                </Badge>
              </div>
            ))}
          </div>

          {/* Explicit Role Permission Matrix */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand-gold" />
              <span>Database Level Access Control Matrix (RLS Enforced)</span>
            </h4>
            <div className="space-y-2 text-[11px] text-slate-600">
              <p>
                <strong className="text-slate-800">Owner:</strong> {t('settings.roleDescriptions.owner')}
              </p>
              <p>
                <strong className="text-slate-800">Admin:</strong> {t('settings.roleDescriptions.admin')}
              </p>
              <p>
                <strong className="text-slate-800">Manager:</strong> {t('settings.roleDescriptions.manager')}
              </p>
              <p>
                <strong className="text-slate-800">Sales Rep:</strong> {t('settings.roleDescriptions.sales_rep')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FlowAI Provider & Cost Control Settings */}
      <AISettingsSection />

      {/* Demo Operations & Session Actions */}
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900">Demo Environment Reset</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Restore the synthetic CRM data back to its default clean baseline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemo}
              loading={resetting}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Reset Demo Data
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={signOut}
              icon={<LogOut className="w-4 h-4" />}
            >
              {t('common.signOut')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
