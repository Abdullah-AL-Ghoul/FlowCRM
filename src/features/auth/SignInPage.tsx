import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Layers, Sparkles, Globe, AlertCircle } from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { signIn, enterDemoMode, isSupabaseConfigured } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('common.requiredField'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t('auth.authError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setLoading(true);
    try {
      await enterDemoMode();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#C9A961_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Top Bar Language Switcher */}
      <div className="absolute top-6 end-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          icon={<Globe className="w-4 h-4 text-slate-300" />}
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {locale === 'en' ? 'العربية' : 'English'}
        </Button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-lg">
            <Layers className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          {t('auth.signInTitle')}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {t('auth.signInSubtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Notice: No Supabase Credentials</span>
              </p>
              <p className="mt-1 text-[11px] text-amber-800">
                {t('auth.supabaseUnconfiguredWarning')}
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t('auth.emailLabel')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {t('auth.passwordLabel')}
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required={isSupabaseConfigured}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2"
            >
              {t('auth.signInButton')}
            </Button>
          </form>

          {/* Interactive Demo Mode Bypass Button */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="gold"
              size="md"
              onClick={handleDemoMode}
              loading={loading}
              icon={<Sparkles className="w-4 h-4" />}
              className="w-full"
            >
              {t('auth.enterDemoMode')}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="font-semibold text-slate-900 hover:underline">
                {t('common.signUp')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
