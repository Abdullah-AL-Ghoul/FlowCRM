import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Button } from '../../components/common/Button';
import {
  Layers,
  Sparkles,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  Flame,
  CheckCircle2,
  Bot,
} from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { signIn, enterDemoMode, isSupabaseConfigured } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const isArabic = locale === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
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
    setDemoLoading(true);
    setError(null);
    try {
      await enterDemoMode();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize demo');
    } finally {
      setDemoLoading(false);
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

        {/* Center Showcase: Live CRM & FlowAI Visual Mockup */}
        <div className="relative z-10 my-auto py-8 space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight tracking-tight">
              {t('auth.tagline')}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {isArabic
                ? 'منصة سحابية متكاملة تجمع بين إدارة خطوط المبيعات ومساعد FlowAI الذكي المؤتمت بالكامل.'
                : 'A grounded sales intelligence workspace combining multi-tenant pipelines with contextual FlowAI assistants.'}
            </p>
          </div>

          {/* Interactive Feature Pulse Cards */}
          <div className="space-y-3 pt-2">
            {/* Card 1: Deal Intelligence Pulse */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md space-y-2 transform transition hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Acme Corp Expansion</p>
                    <p className="text-[10px] text-slate-400">$120,000 USD • Proposal Stage</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Flame className="w-3 h-3" />
                  <span>Hot Lead 96%</span>
                </span>
              </div>
            </div>

            {/* Card 2: FlowAI Copilot Assist */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-amber-950/30 border border-amber-500/30 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-gold flex items-center gap-1.5">
                    <span>FlowAI Copilot</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {isArabic
                      ? 'تم رصد قرار شراء وشيك: نوصي بإرسال مسودة العرض المالي المعدة مسبقاً اليوم.'
                      : 'High-intent buying signal detected. Follow-up proposal draft is prepared.'}
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
      {/* AUTHENTICATION FORM PANEL (Desktop 7 cols / Full Mobile) */}
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
              {t('auth.signInTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('auth.signInSubtitle')}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-100 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                  <span>{isArabic ? 'تنبيه: العمل في الوضع التجريبي' : 'Notice: Running in Demo Mode'}</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  {t('auth.supabaseUnconfiguredWarning')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    className="w-full text-xs py-2.5 ps-9 pe-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t('auth.passwordLabel')}
                  </label>
                  <Link
                    to="/reset-password"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required={isSupabaseConfigured}
                    className="w-full text-xs py-2.5 ps-9 pe-10 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-all"
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
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full text-xs font-bold py-2.5 shadow-sm"
              >
                <span>{t('auth.signInButton')}</span>
              </Button>
            </form>

            {/* Quick Demo Mode Launcher */}
            <div className="pt-3 border-t border-slate-100">
              <div className="relative flex justify-center text-xs uppercase mb-3">
                <span className="bg-white px-2 text-[10px] font-bold tracking-widest text-slate-400">
                  {isArabic ? 'أو الدخول المباشر' : 'OR INSTANT ACCESS'}
                </span>
              </div>

              <Button
                type="button"
                variant="gold"
                size="md"
                onClick={handleDemoMode}
                loading={demoLoading}
                icon={<Sparkles className="w-4 h-4 text-slate-950" />}
                className="w-full text-xs font-bold shadow-xs py-2.5"
              >
                <span>{t('auth.enterDemoMode')}</span>
              </Button>
              <p className="text-[11px] text-slate-500 text-center mt-1.5">
                {t('auth.demoExplainer')}
              </p>
            </div>

            {/* Sign Up Redirect */}
            <div className="pt-2 text-center text-xs text-slate-600">
              <span>{t('auth.noAccount')}</span>{' '}
              <Link
                to="/signup"
                className="font-bold text-slate-950 hover:text-brand-gold transition-colors underline"
              >
                {t('common.signUp')}
              </Link>
            </div>
          </div>

          {/* Privacy & Security Footnote */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
            <span>
              {isArabic
                ? 'مساحات عمل معزولة ومحمية بتشفير قواعد البيانات الكامل (RLS)'
                : 'Enterprise-grade isolation & Row-Level Security protected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
