import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Button } from '../../components/common/Button';
import {
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Globe,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, updatePassword } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const isArabic = locale === 'ar';
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(isArabic ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
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
    <div className="min-h-screen bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden selection:bg-brand-gold selection:text-slate-950">
      {/* ========================================================================= */}
      {/* SHOWCASE BRANDING PANEL */}
      {/* ========================================================================= */}
      <div className="relative hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 flex-col justify-between border-e border-slate-800/80 overflow-hidden">
        <div className="absolute -top-32 -start-32 w-96 h-96 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -end-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#C9A961_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none" />

        {/* Brand Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-md shadow-brand-gold/20 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider text-white">FlowCRM</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                Security & Recovery
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Account Recovery & Access Control</p>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-auto py-8 space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight tracking-tight">
              {isRecoveryMode
                ? (isArabic ? 'استعادة وتعيين كلمة المرور' : 'Set New Access Password')
                : t('auth.resetTitle')}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {isRecoveryMode
                ? (isArabic ? 'أدخل كلمة المرور الجديدة الآمنة للدخول إلى مساحة عملك.' : 'Enter your new strong password to regain full access to your workspace.')
                : t('auth.resetSubtitle')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-gold/20 text-brand-gold flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {isArabic ? 'استرداد آمن للحساب' : 'Encrypted Token Recovery'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isArabic ? 'روابط استعادة مؤقتة مشفرة تنتهي صلاحيتها تلقائياً' : 'Expiring one-time cryptographic links'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
          <span>FlowCRM Security Layer • Enterprise-grade Authentication</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORM PANEL */}
      {/* ========================================================================= */}
      <div className="col-span-12 lg:col-span-7 flex flex-col justify-center items-center py-10 px-4 sm:px-8 lg:px-14 bg-slate-900 relative">
        <div className="absolute top-6 end-6 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            icon={<Globe className="w-4 h-4 text-brand-gold" />}
            className="border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 text-xs shadow-xs"
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </Button>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-start space-y-2">
            <div className="flex justify-center lg:justify-start items-center gap-2 mb-2 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 font-bold shadow-md">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">FlowCRM</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isRecoveryMode
                ? (isArabic ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')
                : t('auth.resetTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isRecoveryMode
                ? (isArabic ? 'أدخل كلمة المرور الجديدة للوصول إلى حسابك' : 'Enter your new password to regain access to your account')
                : t('auth.resetSubtitle')}
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-100 space-y-5">
            {passwordUpdated ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {isArabic ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated Successfully!'}
                </h3>
                <p className="text-xs text-slate-600">
                  {isArabic
                    ? 'يمكنك الآن تسجيل الدخول مباشرة باستخدام كلمة المرور الجديدة.'
                    : 'You can now sign in using your newly set password.'}
                </p>
                <div className="pt-2">
                  <Button variant="primary" size="md" className="w-full text-xs font-bold py-2.5" onClick={() => navigate('/signin')}>
                    {t('auth.signIn')}
                  </Button>
                </div>
              </div>
            ) : isRecoveryMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-xs py-2 ps-9 pe-10 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-xs py-2 ps-9 pe-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="md" loading={loading} className="w-full text-xs font-bold py-2.5 mt-2">
                  {isArabic ? 'حفظ كلمة المرور والدخول' : 'Save Password & Sign In'}
                </Button>
              </form>
            ) : submitted ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t('auth.resetSentSuccess')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isArabic
                    ? 'تم إرسال تعليمات إعادة التعيين ورابط الاستعادة إلى بريدك الإلكتروني: '
                    : 'A recovery link has been dispatched to: '}
                  <span className="font-semibold text-slate-900">{email}</span>
                </p>
                <div className="pt-2">
                  <Link to="/signin">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold py-2">
                      {t('auth.backToSignIn')}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {t('auth.emailLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      required
                      className="w-full text-xs py-2 ps-9 pe-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="md" loading={loading} className="w-full text-xs font-bold py-2.5 mt-2">
                  {t('auth.sendResetLink')}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/signin"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-950 font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('auth.backToSignIn')}</span>
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
            <span>
              {isArabic
                ? 'استرداد آمن ومحمي بأعلى معايير الأمان'
                : 'Secure token verification and encrypted session handshake'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
