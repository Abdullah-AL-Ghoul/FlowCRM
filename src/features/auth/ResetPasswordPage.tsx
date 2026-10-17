import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Layers, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Globe } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, updatePassword } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if arriving with recovery access token in hash or search params
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('common.requiredField'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send recovery email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError(t('common.requiredField'));
      return;
    }
    if (newPassword.length < 6) {
      setError(locale === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updatePassword(newPassword);
      setPasswordUpdated(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#C9A961_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Language Switcher */}
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
            {isRecoveryMode ? <KeyRound className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          {isRecoveryMode
            ? (locale === 'ar' ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')
            : t('auth.resetTitle')}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {isRecoveryMode
            ? (locale === 'ar' ? 'أدخل كلمة المرور الجديدة للوصول إلى حسابك' : 'Enter your new password to regain access to your account')
            : t('auth.resetSubtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Recovery Success State */}
          {passwordUpdated ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated Successfully!'}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {locale === 'ar'
                  ? 'يمكنك الآن تسجيل الدخول مباشرة باستخدام كلمة المرور الجديدة.'
                  : 'You can now sign in using your newly set password.'}
              </p>
              <div className="mt-6">
                <Button variant="primary" size="md" className="w-full" onClick={() => navigate('/signin')}>
                  {t('auth.signIn')}
                </Button>
              </div>
            </div>
          ) : isRecoveryMode ? (
            /* Set New Password Form */
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label={locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Input
                label={locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
                {locale === 'ar' ? 'حفظ كلمة المرور والدخول' : 'Save Password & Sign In'}
              </Button>
            </form>
          ) : submitted ? (
            /* Request Sent Confirmation */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {t('auth.resetSentSuccess')}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {locale === 'ar'
                  ? `تم إرسال تعليمات إعادة التعيين إلى `
                  : `An email has been dispatched to `}
                <span className="font-semibold text-slate-700">{email}</span>.
              </p>
              <div className="mt-6">
                <Link to="/signin">
                  <Button variant="outline" size="sm" className="w-full">
                    {t('auth.backToSignIn')}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Request Reset Form */
            <form className="space-y-4" onSubmit={handleRequestReset}>
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label={t('auth.emailLabel')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full mt-2"
              >
                {t('auth.sendResetLink')}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/signin"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('auth.backToSignIn')}</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
