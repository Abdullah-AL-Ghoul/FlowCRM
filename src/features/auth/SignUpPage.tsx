import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Layers, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const { signUp } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !workspaceName || !email || !password) {
      setError(t('common.requiredField'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signUp(email, password, fullName, workspaceName);
      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t('auth.authError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#C9A961_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

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
          {t('auth.signUpTitle')}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {t('auth.signUpSubtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {needsConfirmation ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'تم إنشاء حسابك بنجاح!' : 'Account Created Successfully!'}
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {locale === 'ar'
                  ? `تم إرسال رابط تأكيد وتفعيل الحساب إلى البريد الإلكتروني:`
                  : `A verification link has been sent to your email address:`}
              </p>
              <p className="mt-1 font-semibold text-xs text-slate-800 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200 inline-block">
                {email}
              </p>
              <p className="mt-3 text-[11px] text-slate-500">
                {locale === 'ar'
                  ? 'يرجى الضغط على الرابط في رسالتك لتفعيل الحساب ثم تسجيل الدخول مباشرة إلى مساحة عملك.'
                  : 'Please click the link in your email to activate your account, then sign in to your workspace.'}
              </p>
              <div className="mt-6">
                <Link to="/signin">
                  <Button variant="primary" size="md" className="w-full">
                    {t('auth.backToSignIn')}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label={t('auth.fullNameLabel')}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                />

                <Input
                  label={t('auth.workspaceNameLabel')}
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  placeholder={t('auth.workspaceNamePlaceholder')}
                  required
                />

                <Input
                  label={t('auth.emailLabel')}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />

                <Input
                  label={t('auth.passwordLabel')}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  className="w-full mt-2"
                >
                  {t('auth.signUpButton')}
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                <span>{t('auth.haveAccount')}</span>{' '}
                <Link to="/signin" className="font-semibold text-slate-900 hover:underline">
                  {t('auth.signIn')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
