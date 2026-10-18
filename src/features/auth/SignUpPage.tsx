import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Button } from '../../components/common/Button';
import {
  Layers,
  Globe,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Building,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Bot,
} from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const { signUp } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const isArabic = locale === 'ar';
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Dynamic Workspace Slug computation
  const workspaceSlug = useMemo(() => {
    return workspaceName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, [workspaceName]);

  // Password Strength Calculation (0 - 4 score)
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[a-zA-Z]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score += 1;
    return score;
  }, [password]);

  const strengthLabels = [
    '',
    t('auth.passwordStrength.weak'),
    t('auth.passwordStrength.fair'),
    t('auth.passwordStrength.good'),
    t('auth.passwordStrength.strong'),
  ];

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
    <div className="min-h-screen bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden selection:bg-brand-gold selection:text-slate-950">
      {/* ========================================================================= */}
      {/* SHOWCASE BRANDING PANEL (Desktop 5 cols) */}
      {/* ========================================================================= */}
      <div className="relative hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 flex-col justify-between border-e border-slate-800/80 overflow-hidden">
        {/* Ambient Decorative Lighting */}
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
                AI Evolution
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Intelligent Enterprise Sales Workspace</p>
          </div>
        </div>

        {/* Center Showcase */}
        <div className="relative z-10 my-auto py-8 space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight tracking-tight">
              {t('auth.signUpTitle')}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {t('auth.signUpSubtitle')}
            </p>
          </div>

          {/* Interactive Feature Pulse Cards */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Enterprise Workspace Ready</p>
                    <p className="text-[10px] text-slate-400">Multi-tenant RLS • Unlimited Contacts</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  <Sparkles className="w-3 h-3" />
                  <span>FlowAI Enabled</span>
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-amber-950/30 border border-amber-500/30 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-gold flex items-center gap-1.5">
                    <span>Intelligent Sales Copilot</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {isArabic
                      ? 'مساعد ذكي يراقب خط أنابيب المبيعات، يستخرج مهام الاجتماعات، ويصيغ رسائل المتابعة فوراً.'
                      : 'Assists your sales team with lead scoring, meeting action items, and automated bilingual outreach.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="grid grid-cols-1 gap-2 pt-2">
            {[
              t('auth.valueProp1'),
              t('auth.valueProp2'),
              t('auth.valueProp3'),
            ].map((prop, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                <span>{prop}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof / Security Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80">
          <blockquote className="text-xs italic text-slate-400 leading-relaxed">
            "{t('auth.quoteText')}"
          </blockquote>
          <p className="text-[11px] font-semibold text-brand-gold mt-1">
            {t('auth.quoteAuthor')}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REGISTRATION FORM PANEL (Desktop 7 cols / Full Mobile) */}
      {/* ========================================================================= */}
      <div className="col-span-12 lg:col-span-7 flex flex-col justify-center items-center py-10 px-4 sm:px-8 lg:px-14 bg-slate-900 relative">
        {/* Language Switcher Float */}
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
          {/* Mobile Logo & Header */}
          <div className="text-center lg:text-start space-y-2">
            <div className="flex justify-center lg:justify-start items-center gap-2 mb-2 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 font-bold shadow-md">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">FlowCRM</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('auth.signUpTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('auth.signUpSubtitle')}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-100 space-y-5">
            {needsConfirmation ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isArabic ? 'تم إنشاء مساحة عملك بنجاح!' : 'Workspace Created Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isArabic
                      ? 'تم إرسال رابط تأكيد وتفعيل الحساب إلى البريد الإلكتروني:'
                      : 'A verification link has been sent to your email address:'}
                  </p>
                  <p className="mt-1 font-mono font-semibold text-xs text-slate-800 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200 inline-block">
                    {email}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {isArabic
                    ? 'يرجى الضغط على الرابط في رسالتك لتفعيل الحساب ثم تسجيل الدخول مباشرة إلى مساحة عملك.'
                    : 'Please click the link in your email to activate your account, then sign in to your workspace.'}
                </p>
                <div className="pt-2">
                  <Link to="/signin">
                    <Button variant="primary" size="md" className="w-full text-xs font-bold py-2.5">
                      {t('auth.backToSignIn')}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      {t('auth.fullNameLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder={t('auth.fullNamePlaceholder')}
                        required
                        className="w-full text-xs py-2 ps-9 pe-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-all"
                      />
                    </div>
                  </div>

                  {/* Workspace / Company Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      {t('auth.workspaceNameLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={e => setWorkspaceName(e.target.value)}
                        placeholder={t('auth.workspaceNamePlaceholder')}
                        required
                        className="w-full text-xs py-2 ps-9 pe-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-all"
                      />
                    </div>
                    {workspaceSlug && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <span className="text-slate-500 font-medium">{t('auth.workspaceSlugPreview')}:</span>
                        <span className="text-brand-gold font-semibold">flowcrm.app/{workspaceSlug}</span>
                      </p>
                    )}
                  </div>

                  {/* Work Email */}
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
                        className="w-full text-xs py-2 ps-9 pe-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-all"
                      />
                    </div>
                  </div>

                  {/* Password with Strength Meter */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      {t('auth.passwordLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full text-xs py-2 ps-9 pe-10 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-700"
                        title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Interactive Password Strength Meter */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                          {[1, 2, 3, 4].map(level => (
                            <div
                              key={level}
                              className={`rounded-full transition-all duration-300 ${
                                passwordStrength >= level
                                  ? level <= 1
                                    ? 'bg-rose-500'
                                    : level <= 2
                                    ? 'bg-amber-500'
                                    : level <= 3
                                    ? 'bg-sky-500'
                                    : 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">{t('auth.passwordHint')}</span>
                          <span
                            className={`font-bold ${
                              passwordStrength <= 1
                                ? 'text-rose-600'
                                : passwordStrength <= 2
                                ? 'text-amber-600'
                                : passwordStrength <= 3
                                ? 'text-sky-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {strengthLabels[passwordStrength]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    className="w-full text-xs font-bold py-2.5 mt-2 shadow-sm"
                  >
                    <span>{t('auth.signUpButton')}</span>
                  </Button>
                </form>

                {/* Sign In Redirect */}
                <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
                  <span>{t('auth.haveAccount')}</span>{' '}
                  <Link
                    to="/signin"
                    className="font-bold text-slate-950 hover:text-brand-gold transition-colors underline"
                  >
                    {t('auth.signIn')}
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Privacy & Security Footnote */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
            <span>
              {isArabic
                ? 'بياناتك مشفرة ومحمية بالكامل على مستوى قواعد بيانات المؤسسة'
                : 'Enterprise-grade encryption and tenant data isolation'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
