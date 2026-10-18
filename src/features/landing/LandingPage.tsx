import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Layers,
  Sparkles,
  Globe,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Bot,
  Zap,
  Kanban,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  Play,
  Flame,
  Building,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { enterDemoMode, session } = useAuth();
  const { locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const isArabic = locale === 'ar';

  const [activeTab, setActiveTab] = useState<'copilot' | 'kanban' | 'writer' | 'quality'>('copilot');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    try {
      await enterDemoMode();
      navigate('/');
    } catch (err) {
      console.error('Failed to enter demo mode:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  // FAQ Items
  const faqs = isArabic
    ? [
        {
          q: 'ما الذي يميّز FlowAI عن روبوتات المحادثة التقليدية؟',
          a: 'FlowAI لا يخمن ولا يهلوس أبداً. هو محرك ذكاء مبيعات مؤرض (Grounded) يستدعي أدوات أعمال محددة ومحصورة للقراءة فقط من سجلات الـ CRM المعتمدة، ويعيد روابط استشهادية قابلة للنقر مع كل إجابة.',
        },
        {
          q: 'هل يمكن لكل مستخدم في فريقي إضافة مفتاح الـ API الخاص به بشكل مستقل؟',
          a: 'نعم تماماً! نوفر نظام حماية على مستوى الصفوف (RLS) في قاعدة البيانات يتيح لكل مستخدم إدخال مفتاح Gemini أو OpenAI الخاص به، وتخزينه مشفراً دون أن يتمكن أي عضو آخر في الفريق أو مساحة العمل من رؤيته.',
        },
        {
          q: 'هل يدعم النظام اللغة العربية بالكامل؟',
          a: 'نعم، المنصة صُممت من الصفر لتدعم اللغة العربية باتجاه اليمين إلى اليسار (RTL) الأصيل، مع صياغات بيعية احترافية لكتابة رسائل المتابعة والواتساب وتحليل محاضر الاجتماعات.',
        },
        {
          q: 'هل يمكنني تجربة المنصة دون إعداد خوادم أو بطاقة ائتمانية؟',
          a: 'بكل تأكيد! يمكنك الضغط على "تجربة العرض الحي المباشر" في أعلى الصفحة لبدء العمل في ثوانٍ مع مساحة عمل مجهزة ببيانات مبيعات تفاعلية حقيقية.',
        },
        {
          q: 'كيف يتم حماية بيانات العملاء من التسرب؟',
          a: 'تعتمد المنصة عزل تام لمساحات العمل عبر PostgreSQL RLS، مع حواجز أمان متقدمة تمنع هجمات حقن الأوامر (Prompt Injection) ولا تسمح إطلاقاً للنماذج بتنفيذ أوامر SQL عشوائية.',
        },
      ]
    : [
        {
          q: 'How is FlowAI different from generic chatbots?',
          a: 'FlowAI never hallucinates. It is a strictly grounded CRM intelligence engine that queries verified, read-only tools scoped to your active workspace, returning clickable citation links for every fact and metric.',
        },
        {
          q: 'Can each sales rep manage their own AI API keys independently?',
          a: 'Yes! We built a dedicated database table protected by Row-Level Security (RLS). Each user can store their own Google Gemini or OpenAI keys privately, isolated from other workspace members.',
        },
        {
          q: 'Is full Arabic RTL supported?',
          a: 'FlowCRM is built from the ground up with native bidirectional support. Switch instantly between English (LTR) and Arabic (RTL) with tailored sales vocabulary and culturally nuanced sales drafts.',
        },
        {
          q: 'Can I test drive FlowCRM without a credit card or database setup?',
          a: 'Absolutely! Click "Explore Live Demo" to instantly access an interactive sales workspace with preloaded deals, contacts, pipeline metrics, and FlowAI capabilities.',
        },
        {
          q: 'How does FlowCRM protect client data confidentiality?',
          a: 'Through PostgreSQL Row-Level Security (RLS), multi-tenant isolation, and defensive boundary tags that treat CRM notes as data rather than instructions, preventing prompt injection attacks.',
        },
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-gold selection:text-slate-950 font-sans relative overflow-x-hidden">
      {/* Background Decorative Mesh & Glows */}
      <div className="absolute top-0 start-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-brand-gold/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] -start-48 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1600px] -end-48 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#C9A961_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none -z-10" />

      {/* ========================================================================= */}
      {/* 1. STICKY NAVBAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-brand-gold/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">FlowCRM</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                <Sparkles className="w-2.5 h-2.5" />
                <span>FlowAI 2.0</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-brand-gold transition-colors">
              {isArabic ? 'المزايا الذكية' : 'Features'}
            </a>
            <a href="#interactive-preview" className="hover:text-brand-gold transition-colors">
              {isArabic ? 'المعاينة الحية' : 'Live Preview'}
            </a>
            <a href="#security" className="hover:text-brand-gold transition-colors">
              {isArabic ? 'الأمان وعزل البيانات' : 'Security & RLS'}
            </a>
            <a href="#pricing" className="hover:text-brand-gold transition-colors">
              {isArabic ? 'الباقات والأسعار' : 'Pricing'}
            </a>
            <a href="#faq" className="hover:text-brand-gold transition-colors">
              {isArabic ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              icon={<Globe className="w-3.5 h-3.5 text-brand-gold" />}
              className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs px-2.5"
            >
              <span>{locale === 'en' ? 'العربية' : 'English'}</span>
            </Button>

            {session ? (
              <Button
                variant="gold"
                size="sm"
                onClick={() => navigate('/')}
                className="text-xs font-bold shadow-md shadow-brand-gold/20"
              >
                <span>{isArabic ? 'الدخول لمساحة العمل' : 'Go to Workspace'}</span>
              </Button>
            ) : (
              <>
                <Link to="/signin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-300 hover:text-white hidden sm:inline-flex"
                  >
                    <span>{isArabic ? 'تسجيل الدخول' : 'Sign In'}</span>
                  </Button>
                </Link>

                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleLaunchDemo}
                  loading={demoLoading}
                  icon={<Sparkles className="w-3.5 h-3.5 text-slate-950" />}
                  className="text-xs font-bold shadow-md shadow-brand-gold/20"
                >
                  <span>{isArabic ? 'تجربة العرض المباشر' : 'Explore Demo'}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto space-y-6">
        {/* Top Floating Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-brand-gold/30 text-xs font-semibold text-brand-gold shadow-lg shadow-brand-gold/10 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-spin" />
          <span>{isArabic ? 'الجيل الجديد من منصات إدارة المبيعات الذكية' : 'Next-Generation Sales Intelligence Workspace'}</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
          {isArabic ? (
            <>
              ضاعف صفقاتك الرابحة بذكاء مبيعات <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-amber-300 to-brand-goldHover">موثّق لا يخمّن</span>
            </>
          ) : (
            <>
              Close More Deals with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-amber-300 to-brand-goldHover">Grounded Sales Intelligence</span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {isArabic
            ? 'منصة FlowCRM تجمع بين مسار الصفقات المرن ومساعد FlowAI الذكي: استخراج مهام الاجتماعات بضغطة زر، صياغة رسائل المتابعة، وكشف مخاطر الصفقات بدقة متناهية.'
            : 'FlowCRM unifies interactive pipeline tracking with FlowAI Copilot — automated bilingual outreach, meeting task extraction, and proactive deal risk alerts.'}
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-3">
          <Button
            variant="gold"
            size="lg"
            onClick={handleLaunchDemo}
            loading={demoLoading}
            icon={<Play className="w-4 h-4 fill-slate-950 text-slate-950" />}
            className="w-full sm:w-auto text-sm font-bold shadow-xl shadow-brand-gold/25 py-3 px-6"
          >
            <span>{isArabic ? 'بدء تجربة المنصة مجاناً (عرض حي)' : 'Launch Interactive Demo'}</span>
          </Button>

          <Link to="/signup" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              icon={<ArrowRight className="w-4 h-4 text-brand-gold" />}
              className="w-full sm:w-auto border-slate-700 bg-slate-900 text-white hover:bg-slate-800 text-sm py-3 px-6"
            >
              <span>{isArabic ? 'إنشاء مساحة عمل جديدة' : 'Create Free Workspace'}</span>
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-4 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
            <span>{isArabic ? 'بدون بطاقة ائتمانية' : 'No credit card required'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{isArabic ? 'عزل كامل بقاعدة بيانات PostgreSQL RLS' : 'Multi-tenant RLS Database'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{isArabic ? 'عربي وإنجليزي أصيل (RTL/LTR)' : 'Bilingual Native Support'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isArabic ? 'محرك قواعد أوفلاين دون إنترنت' : 'Offline Grounded Engine'}</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE PRODUCT SHOWCASE SIMULATOR */}
      {/* ========================================================================= */}
      <section id="interactive-preview" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Window Mockup Header */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ms-2 text-xs font-mono text-slate-500 hidden sm:inline">
                https://flowcrm.app/workspace/pipeline
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Workspace</span>
              </span>
            </div>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
            {[
              { id: 'copilot', label: isArabic ? 'مساعد FlowAI الذكي' : 'FlowAI Copilot', icon: Bot },
              { id: 'kanban', label: isArabic ? 'مسار الصفقات (كانبان)' : 'Kanban Pipeline', icon: Kanban },
              { id: 'writer', label: isArabic ? 'صانع رسائل المبيعات' : 'AI Sales Writer', icon: FileText },
              { id: 'quality', label: isArabic ? 'تدقيق جودة البيانات' : 'Data Quality Hub', icon: ShieldCheck },
            ].map(tab => {
              const Icon = tab.icon;
              const isSel = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 px-4 flex items-center justify-center gap-2 transition-all border-b-2 ${
                    isSel
                      ? 'border-brand-gold text-brand-gold bg-slate-900/80'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-900 to-slate-950">
            {activeTab === 'copilot' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-brand-gold text-xs font-bold border border-brand-gold/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إجابات موثقة بروابط السجلات' : 'Grounded Evidence Citations'}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                    {isArabic
                      ? 'اسأل عن خط الأنابيب، المهام المتأخرة، أو ملخص أي عميل'
                      : 'Ask anything about your pipeline, overdue tasks, or client velocity.'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isArabic
                      ? 'يحلل FlowAI استفساراتك بلغة طبيعية وينفذ أدوات CRM للقراءة فقط، ليعطيك إجابة دقيقة مع روابط للوصول السريع إلى تفاصيل الصفقات والجهات المعنية.'
                      : 'FlowAI understands natural-language requests and queries scoped CRM tools, returning exact answers with clickable navigation pills.'}
                  </p>
                  <div className="pt-2">
                    <Button variant="gold" size="sm" onClick={handleLaunchDemo} className="text-xs font-bold">
                      <span>{isArabic ? 'جرب المساعد الآن' : 'Test Copilot Live'}</span>
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5 shadow-xl">
                  {/* User query bubble */}
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="bg-slate-800 text-white rounded-2xl rounded-tr-xs py-2 px-3.5 text-xs max-w-sm">
                      {isArabic ? 'ما هي الصفقات المفتوحة التي تتطلب انتباهاً اليوم؟' : 'Which open deals need attention today?'}
                    </div>
                  </div>

                  {/* FlowAI response bubble */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-200 space-y-2.5 max-w-lg">
                      <p className="leading-relaxed">
                        {isArabic
                          ? 'تم العثور على صفقتين مفتوحتين في مرحلة التفاوض تجاوزتا تاريخ الإغلاق المتوقع وتتطلبان اتخاذ إجراء سريع:'
                          : 'Found 2 high-priority deals in Negotiation stage that have passed expected close dates:'}
                      </p>
                      {/* Evidence citation pill */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-brand-gold border border-brand-gold/30 font-semibold text-[11px]">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>Enterprise Software License — $75,000</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px]">
                          <Building className="w-3.5 h-3.5 text-sky-400" />
                          <span>Acme Cloud Migration — $45,000</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kanban' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {isArabic ? 'مسار الصفقات التفاعلي الفوري' : 'Visual Pipeline Kanban'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isArabic ? 'اسحب الصفقات بسلاسة مع تحديث فوري لإجمالي قيمة المراحل' : 'Drag & drop stages with instant live value aggregations.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gold" size="sm">$485,000 Open Value</Badge>
                    <Badge variant="success" size="sm">68% Win Rate</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                      <span>{isArabic ? 'مؤهلة (Qualified)' : 'Qualified'}</span>
                      <span className="text-[10px] text-brand-gold">$120,000</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <p className="font-bold text-white">Fintech Core Modernization</p>
                      <p className="text-[10px] text-slate-400">$60,000 • Expected Oct 28</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                      <span>{isArabic ? 'تقديم العرض (Proposal)' : 'Proposal'}</span>
                      <span className="text-[10px] text-brand-gold">$215,000</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <p className="font-bold text-white">Global Retail CRM Rollout</p>
                      <p className="text-[10px] text-slate-400">$130,000 • Hot Lead (95%)</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                      <span>{isArabic ? 'التفاوض (Negotiation)' : 'Negotiation'}</span>
                      <span className="text-[10px] text-emerald-400">$150,000</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1 border-s-2 border-s-brand-gold">
                      <p className="font-bold text-white">Healthcare Security Compliance</p>
                      <p className="text-[10px] text-slate-400">$150,000 • Closing this week</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'writer' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <h3 className="text-xl font-bold text-white">
                    {isArabic ? 'صانع رسائل المبيعات الذكي' : 'Bilingual AI Sales Writer'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isArabic
                      ? 'صياغة رسائل البريد الإلكتروني، رسائل الواتساب، ومتابعات العروض بلهجة احترافية دقيقة مع حفظ المسودة تلقائياً في سجل أنشطة العميل.'
                      : 'Generate highly personalized emails, WhatsApp follow-ups, and proposal letters with zero placeholders.'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Email</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">WhatsApp</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Meeting Recap</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Proposal Cover</span>
                  </div>
                </div>
                <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span>Subject: Follow-up on Enterprise Architecture Review</span>
                    <span className="text-brand-gold text-[10px]">Arabic & English Ready</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    "Dear Marcus, thank you for taking the time to discuss your enterprise requirements yesterday. Following our session, I have summarized our migration milestones and security SLAs for your review..."
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'quality' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Duplicate Scanner</span>
                  <h4 className="text-sm font-bold text-white">Zero Duplicate Contacts</h4>
                  <p className="text-xs text-slate-400">Levenshtein similarity checks prevent duplicate customer records.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Missing Field Audit</span>
                  <h4 className="text-sm font-bold text-white">Hygiene Health Monitor</h4>
                  <p className="text-xs text-slate-400">Identifies contacts without phones, job titles, or primary communication channels.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Pipeline Auditor</span>
                  <h4 className="text-sm font-bold text-white">Stagnant Deal Flags</h4>
                  <p className="text-xs text-slate-400">Flags deals with no activity in over 14 days or past close dates.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE 4 CORE VALUE PILLARS */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 bg-slate-900/40 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isArabic ? 'بنية مبيعات متكاملة ومصممة للتوسع' : 'Architected for High-Velocity Sales Teams'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isArabic
                ? 'كل ميزة في FlowCRM بنيت لتسريع دورة البيع، حفظ بياناتك بأمان، وإعطاء فريقك رؤية شاملة.'
                : 'Every feature is purpose-built to accelerate deal cycles, maintain data hygiene, and preserve workspace privacy.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-lg space-y-3 hover:border-brand-gold/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/15 text-brand-gold flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isArabic ? 'FlowAI كونسيرج ومساعد' : 'FlowAI Grounded Copilot'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isArabic
                  ? 'مساعد مبيعات ذكي يجيبك على استفسارات خط الأنابيب، مع روابط استشهاد موثقة تؤكد كل رقم وحقيقة.'
                  : 'Chat drawer for instant pipeline queries, overdue task alerts, and timeline summaries with clickable citations.'}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-lg space-y-3 hover:border-brand-gold/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isArabic ? 'تقييم العملاء الذكي (0-100)' : 'Explainable Lead Scoring'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isArabic
                  ? 'تقييم شفاف ومفصل لكل عميل يوضح الأسباب الدقيقة (اكتمال الملف، وتيرة التفاعل، وقيمة الصفقات).'
                  : 'Transparent 0-100 lead score with full breakdown of profile, interaction recency, and opportunity size.'}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-lg space-y-3 hover:border-brand-gold/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isArabic ? 'ذكاء الاجتماعات والمتابعة' : 'Meeting Intelligence'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isArabic
                  ? 'تحليل نصوص ومحاضر الاجتماعات واستخراج القرارات والمخاطر والمهام مع موافقة بشرية قبل الإضافة.'
                  : 'Extract summary, decisions, and action items from call notes with human-in-the-loop task creation.'}
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-lg space-y-3 hover:border-brand-gold/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-brand-gold flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isArabic ? 'عزل تام وسياسات RLS' : 'Private Key Vault & RLS'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isArabic
                  ? 'يمكن لكل مستخدم حفظ مفاتيح API الخاصة به بأمان في قاعدة البيانات مع حماية كاملة على مستوى الصفوف.'
                  : 'Per-user encrypted AI keys stored in Supabase with strict Row-Level Security isolation.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PRICING TIERS */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="gold" size="sm">{isArabic ? 'باقات واضحة وبسيطة' : 'Transparent Pricing'}</Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isArabic ? 'ابدأ مجاناً وتوسع بثقة' : 'Start Free, Scale as You Grow'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isArabic
              ? 'اختر الخطة المناسبة لاحتياجات فريقك، مع إمكانية استخدام الوضع التجريبي الفوري في أي وقت.'
              : 'Flexible plans built for solo founders, growing agencies, and high-performance revenue teams.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Plan 1: Free / Demo */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{isArabic ? 'الباقة التجريبية' : 'Starter'}</h3>
                <p className="text-xs text-slate-400 mt-1">{isArabic ? 'لتجربة كافة الوظائف فوراً' : 'Free forever for exploration'}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-white">$0</span>
                <span className="text-xs text-slate-400">/ {isArabic ? 'دائماً' : 'forever'}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Up to 500 Contacts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Kanban Deal Pipeline</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Offline Rule-Based AI Engine</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Full Bilingual RTL/LTR</li>
              </ul>
            </div>
            <Button variant="outline" size="md" onClick={handleLaunchDemo} className="w-full text-xs font-bold border-slate-700 text-white hover:bg-slate-800">
              {isArabic ? 'بدء التجربة الفورية' : 'Launch Free Demo'}
            </Button>
          </div>

          {/* Plan 2: Pro (Highlighted) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 border-2 border-brand-gold shadow-2xl space-y-6 flex flex-col justify-between relative transform lg:-translate-y-2">
            <div className="absolute -top-3.5 start-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-gold text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
              {isArabic ? 'الأكثر شعبية' : 'Most Popular'}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{isArabic ? 'باقة المحترفين' : 'Pro Sales'}</h3>
                <p className="text-xs text-slate-400 mt-1">{isArabic ? 'لفرق المبيعات والشركات الناشئة' : 'For growing sales teams'}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-brand-gold">$29</span>
                <span className="text-xs text-slate-400">/ {isArabic ? 'شهرياً' : 'month'}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Unlimited Contacts & Deals</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> FlowAI Copilot (Gemini & OpenAI)</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Multi-Channel AI Sales Writer</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Meeting Notes Intelligence & Tasks</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Private Database Key Storage with RLS</li>
              </ul>
            </div>
            <Link to="/signup">
              <Button variant="gold" size="md" className="w-full text-xs font-bold shadow-md shadow-brand-gold/20">
                {isArabic ? 'ابدأ الاشتراك الآن' : 'Get Started Now'}
              </Button>
            </Link>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{isArabic ? 'باقة المنشآت' : 'Enterprise'}</h3>
                <p className="text-xs text-slate-400 mt-1">{isArabic ? 'للشركات الكبرى وحلول الأمان المخصصة' : 'For organizations & custom SLAs'}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-white">$89</span>
                <span className="text-xs text-slate-400">/ {isArabic ? 'شهرياً' : 'month'}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Dedicated Supabase Database Option</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Custom Team Roles & Granular RLS</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Advanced Pipeline Analytics & CSV Audit</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-gold shrink-0" /> Priority 24/7 SLA Support</li>
              </ul>
            </div>
            <Link to="/signup">
              <Button variant="outline" size="md" className="w-full text-xs font-bold border-slate-700 text-white hover:bg-slate-800">
                {isArabic ? 'التواصل مع المبيعات' : 'Contact Enterprise'}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 bg-slate-900/30 border-t border-slate-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {isArabic ? 'الأسئلة الأكثر شيوعاً' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xs text-slate-400">
              {isArabic ? 'كل ما تحتاج لمعرفته حول FlowCRM وبنية الذكاء الاصطناعي FlowAI' : 'Everything you need to know about FlowCRM and FlowAI intelligence.'}
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-white hover:text-brand-gold"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-brand-gold shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FINAL HIGH-CONVERTING CTA BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-brand-gold/40 p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 end-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isArabic ? 'جاهز لتحويل مبيعاتك إلى منظومة نمو ذكية؟' : 'Ready to Transform Your Sales Velocity?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {isArabic
              ? 'انضم إلى مئات فرق المبيعات التي تعتمد على FlowCRM لمتابعة صفقاتها بدقة وذكاء موثق.'
              : 'Join forward-thinking sales teams closing deals faster with verified CRM intelligence.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="gold"
              size="lg"
              onClick={handleLaunchDemo}
              loading={demoLoading}
              icon={<Play className="w-4 h-4 fill-slate-950 text-slate-950" />}
              className="w-full sm:w-auto text-xs font-bold py-3 px-8 shadow-xl shadow-brand-gold/20"
            >
              <span>{isArabic ? 'جرب العرض التفاعلي مجاناً' : 'Test Drive Demo Now'}</span>
            </Button>
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-xs font-bold border-slate-700 bg-slate-900 text-white hover:bg-slate-800 py-3 px-8"
              >
                <span>{isArabic ? 'إنشاء حسابك مجاناً' : 'Create Free Account'}</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-gold flex items-center justify-center text-slate-950 font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-sm">FlowCRM</span>
            <span className="text-slate-600">|</span>
            <span>© {new Date().getFullYear()} FlowCRM Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-300 transition-colors">{isArabic ? 'المزايا' : 'Features'}</a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">{isArabic ? 'الأسعار' : 'Pricing'}</a>
            <Link to="/signin" className="hover:text-slate-300 transition-colors">{isArabic ? 'تسجيل الدخول' : 'Sign In'}</Link>
            <Link to="/signup" className="hover:text-slate-300 transition-colors">{isArabic ? 'حساب جديد' : 'Sign Up'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
