import React, { useState, useEffect } from 'react';
import { flowAIService } from '../services/flowAIService';
import { AIProviderId } from '../types/ai.types';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { crmService } from '../../../services/crmService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import {
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle,
  Save,
  Gauge,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  Database,
  RefreshCw,
} from 'lucide-react';

export const AISettingsSection: React.FC = () => {
  const { session } = useAuth();
  const { t, locale } = useI18n();
  const isArabic = locale === 'ar';
  const workspaceId = session?.workspace?.id || 'demo-workspace-01';
  const userId = session?.user?.id || session?.profile?.id || 'demo-user-id';

  const [providerId, setProviderId] = useState<AIProviderId>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbSource, setDbSource] = useState<'database' | 'local' | null>(null);

  const usage = flowAIService.getUsage(workspaceId);
  const activeAdapter = flowAIService.getActiveAdapter();

  // Load user's private AI keys securely from the database on mount
  useEffect(() => {
    let isMounted = true;
    const loadUserSettings = async () => {
      try {
        const settings = await crmService.getUserAISettings(userId, workspaceId);
        if (isMounted && settings) {
          if (settings.provider_id) setProviderId(settings.provider_id);
          if (settings.gemini_key) setGeminiKey(settings.gemini_key);
          if (settings.openai_key) setOpenaiKey(settings.openai_key);
          setDbSource('database');

          // Sync into active runtime adapter
          flowAIService.saveConfig({
            providerId: settings.provider_id,
            geminiKey: settings.gemini_key || undefined,
            openaiKey: settings.openai_key || undefined,
          });
        }
      } catch (err) {
        console.error('Failed to load user AI settings from DB:', err);
      }
    };

    loadUserSettings();
    return () => {
      isMounted = false;
    };
  }, [userId, workspaceId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Save directly to database table public.user_ai_settings protected by RLS
      await crmService.saveUserAISettings(userId, workspaceId, {
        provider_id: providerId,
        gemini_key: geminiKey.trim() || null,
        openai_key: openaiKey.trim() || null,
      });

      // 2. Update active memory/runtime service adapter
      flowAIService.saveConfig({
        providerId,
        geminiKey: geminiKey.trim() || undefined,
        openaiKey: openaiKey.trim() || undefined,
      });

      setDbSource('database');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-200/80 shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{t('flowai.aiSettingsTitle')}</span>
                <Badge variant={activeAdapter.id === 'offline_rule_based' ? 'gold' : 'success'} size="sm">
                  {activeAdapter.name}
                </Badge>
                {dbSource === 'database' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                    <Database className="w-3 h-3 text-emerald-600" />
                    <span>{t('flowai.databaseSecurityBadge')}</span>
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('flowai.aiSettingsSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Usage Telemetry Bar */}
        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-gold">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {isArabic ? 'طلبات الساعة الحالية' : 'Hourly Quota'}
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                {usage.requestsThisHour} / {usage.maxHourlyRequests} {isArabic ? 'طلب' : 'reqs'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {isArabic ? 'استهلاك الرموز الشهري' : 'Monthly Tokens'}
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                {usage.tokensUsedThisMonth.toLocaleString()} / {usage.maxMonthlyTokens.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {isArabic ? 'التكلفة المقدرة' : 'Estimated Cost'}
              </p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                ${usage.estimatedCostUsd.toFixed(4)} USD
              </p>
            </div>
          </div>
        </div>

        {/* User Isolation & Security Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/70 to-indigo-50/50 border border-amber-200/80 text-xs text-slate-800 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">
                {isArabic ? 'حماية مشفرة ومستقلة لكل مستخدم (Per-User RLS)' : 'Private Per-User Storage & RLS Isolation'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-200">
                {isArabic ? 'سري وخاص' : 'Confidential'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {t('flowai.userKeyNotice')}
            </p>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              {isArabic ? 'المزود الافتراضي (Active Provider)' : 'Select Default AI Provider'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'gemini',
                  title: 'Google Gemini',
                  model: 'gemini-1.5-flash',
                  desc: isArabic ? 'استدلال ثنائي اللغة فائق السرعة واستخراج منظم' : 'High speed, bilingual reasoning & structured extraction',
                },
                {
                  id: 'openai',
                  title: 'OpenAI',
                  model: 'gpt-4o-mini',
                  desc: isArabic ? 'نمط JSON متطابق وصياغات بيعية احترافية' : 'Consistent JSON mode and enterprise language drafting',
                },
                {
                  id: 'offline_rule_based',
                  title: t('flowai.offlineMode'),
                  model: 'Grounded Mode',
                  desc: t('flowai.offlineDesc'),
                },
              ].map(p => {
                const isSelected = providerId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setProviderId(p.id as AIProviderId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-gold bg-amber-50/40 shadow-xs ring-1 ring-brand-gold'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{p.title}</span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-brand-gold" />}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                      {p.model}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* API Keys Configuration */}
          {providerId !== 'offline_rule_based' && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Key className="w-4 h-4 text-brand-gold" />
                  <span>
                    {providerId === 'gemini' ? t('flowai.geminiKeyLabel') : t('flowai.openaiKeyLabel')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isArabic ? 'يتم التخزين في قاعدة بيانات Supabase بحسابك' : 'Stored in Supabase user_ai_settings'}
                </span>
              </div>

              {providerId === 'gemini' ? (
                <div>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full text-xs py-2 px-3 pe-10 rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      title={showGeminiKey ? t('flowai.hideKey') : t('flowai.showKey')}
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <span>{t('flowai.geminiKeyHint')}</span>
                  </p>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type={showOpenaiKey ? 'text' : 'password'}
                      value={openaiKey}
                      onChange={e => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full text-xs py-2 px-3 pe-10 rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      title={showOpenaiKey ? t('flowai.hideKey') : t('flowai.showKey')}
                    >
                      {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <span>{t('flowai.openaiKeyHint')}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Security & Key Safety Guarantee */}
          <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <span className="font-semibold text-slate-900">
                {isArabic ? 'ضمان الأمان وعزل البيانات الصارم:' : 'Security & Isolation Guarantee:'}
              </span>
              <p className="text-slate-600 leading-relaxed">
                {isArabic
                  ? 'يعامل FlowAI سجلات الـ CRM كبيانات غير موثوقة محاطة بحدود صارمة تمنع حقن التعليمات البرمجية. لا يستطيع الذكاء الاصطناعي تنفيذ أي أوامر SQL عشوائية أو تعديل السجلات دون موافقتك الصريحة أو تجاوز عزل مساحات العمل.'
                  : 'FlowAI treats CRM records strictly as untrusted data with anti-injection boundaries. AI cannot execute arbitrary SQL, mutate records without confirmation, or bypass PostgreSQL workspace isolation.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200/80">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('flowai.savedToDbSuccess')}</span>
              </span>
            ) : <span />}

            <Button
              variant="gold"
              onClick={handleSave}
              loading={loading}
              icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              className="font-bold shadow-xs"
            >
              {t('flowai.saveConfiguration')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
