import React, { useState, useEffect } from 'react';
import { flowAIService } from '../services/flowAIService';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { crmService } from '../../../services/crmService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { AIWorkspaceUsage } from '../types/ai.types';
import {
  Sparkles,
  Server,
  Gauge,
  Cpu,
  Lock,
  ShieldCheck,
  RefreshCw,
  CloudOff,
  KeyRound,
  CircleCheck,
  CircleAlert,
} from 'lucide-react';

interface GatewayStatus {
  provider?: string;
  model?: string;
  configured: boolean;
  engine: 'gemini' | 'openai' | 'anthropic' | 'rules';
}

export const AISettingsSection: React.FC = () => {
  const { session } = useAuth();
  const { t, locale } = useI18n();
  const isArabic = locale === 'ar';
  const workspaceId = session?.workspace?.id || 'demo-workspace-01';

  const [usage, setUsage] = useState<AIWorkspaceUsage | null>(null);
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [statusState, setStatusState] = useState<'loading' | 'ready' | 'unreachable' | 'demo'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async () => {
    setRefreshing(true);
    try {
      const [u, s] = await Promise.all([
        flowAIService.getUsage(workspaceId),
        flowAIService.getGatewayStatus(workspaceId),
      ]);
      setUsage(u);
      setStatus(s);
      const demoMode = !isSupabaseConfigured || crmService.getIsDemoMode();
      setStatusState(s === null ? (demoMode ? 'demo' : 'unreachable') : 'ready');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session === undefined) return;
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, workspaceId]);

  const engineBadge =
    statusState === 'demo'
      ? isArabic ? 'الوضع التجريبي' : 'Demo Mode'
      : statusState === 'unreachable'
      ? isArabic ? 'البوابة غير منشورة' : 'Gateway Undeployed'
      : status?.configured
      ? status.engine === 'gemini'
        ? 'Gemini Engine'
        : status.engine === 'anthropic'
        ? 'Claude 3.5 Sonnet'
        : 'OpenAI Engine'
      : isArabic
      ? 'وضع الاستنتاج الموثق'
      : 'Grounded Mode';

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
                <Badge variant={statusState === 'ready' && status?.configured ? 'success' : 'gold'} size="sm">
                  {engineBadge}
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">{t('flowai.aiSettingsSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadStatus}
            aria-label={isArabic ? 'تحديث' : 'Refresh'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Usage Telemetry Bar (server-authoritative in connected mode) */}
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
                {usage ? `${usage.requestsThisHour} / ${usage.maxHourlyRequests}` : '—'} {isArabic ? 'طلب' : 'reqs'}
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
                {usage
                  ? `${usage.tokensUsedThisMonth.toLocaleString()} / ${usage.maxMonthlyTokens.toLocaleString()}`
                  : '—'}
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
                {usage ? `$${usage.estimatedCostUsd.toFixed(4)} USD` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Gateway Provider Status */}
        <div
          className={`p-4 rounded-xl border space-y-2 ${
            statusState === 'unreachable'
              ? 'bg-rose-50/60 border-rose-200'
              : statusState === 'demo'
              ? 'bg-amber-50/60 border-amber-200'
              : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            {statusState === 'unreachable' ? (
              <CloudOff className="w-4 h-4 text-rose-600" />
            ) : statusState === 'demo' ? (
              <Server className="w-4 h-4 text-amber-700" />
            ) : (
              <CircleCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>
              {statusState === 'unreachable'
                ? isArabic
                  ? 'بوابة الذكاء غير قابلة للوصول — يجب نشر الدالة الطرفية'
                  : 'AI Gateway unreachable — deploy the edge function first'
                : statusState === 'demo'
                ? isArabic
                  ? 'وضع تجريبي محلي (بدون خادم)'
                  : 'Local demo mode (no server)'
                : isArabic
                ? 'البوابة تعمل بنجاح'
                : 'Gateway operational'}
            </span>
          </div>

          {statusState === 'ready' && status && (
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isArabic ? 'المزود:' : 'Provider:'}{' '}
              <span className="font-mono font-semibold text-slate-800">
                {status.provider ?? '—'} {status.model ? `· ${status.model}` : ''}
              </span>
              {!status.configured && (
                <span className="ms-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-semibold">
                  {isArabic ? 'بدون مفتاح — وضع القواعد' : 'No key set — rules engine'}
                </span>
              )}
            </p>
          )}

          {statusState === 'unreachable' && (
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isArabic
                ? 'شغّل الأمر: supabase functions deploy flowai-assistant — ثم أضف مفاتيح المزود عبر supabase secrets set GEMINI_API_KEY=...'
                : 'Run: supabase functions deploy flowai-assistant — then set provider keys via supabase secrets set GEMINI_API_KEY=...'}
            </p>
          )}

          {statusState === 'demo' && (
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isArabic
                ? 'جميع ميزات الذكاء تعمل بوضع الاستنتاج الموثق على بيانات تجريبية؛ لا تُستهلك حصص.'
                : 'All AI features run the grounded rules engine on demo data; no quotas are consumed.'}
            </p>
          )}
        </div>

        {/* Security Model Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/70 to-indigo-50/50 border border-amber-200/80 text-xs text-slate-800 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">
                {isArabic ? 'المفاتيح تعيش على الخادم فقط' : 'Keys live server-side only'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                {isArabic ? 'أعلى أمان' : 'Most Secure'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isArabic
                ? 'مفاتيح المزود تُخزَّن كأسرار في بيئة التشغيل الطرفية ولا تصل إلى المتصفح إطلاقاً. يجري التحقق من الهوية، حد الاستخدام، وعزل مساحات العمل على الخادم قبل أي استدعاء للنموذج.'
                : 'Provider keys are stored as platform secrets in the edge environment and never reach the browser. Authentication, quota enforcement, and workspace isolation run on the server before any model call.'}
            </p>
          </div>
        </div>

        {/* Admin Deployment Guide */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <KeyRound className="w-4 h-4 text-brand-gold" />
            <span>{isArabic ? 'دليل تكوين المدراء (خادم)' : 'Admin Configuration Guide (Server)'}</span>
          </div>
          <ol className="space-y-2 text-[11px] text-slate-600 leading-relaxed list-decimal ps-4">
            <li>
              {isArabic ? 'انشر البوابة:' : 'Deploy the gateway:'}{' '}
              <code className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded">supabase functions deploy flowai-assistant</code>
            </li>
            <li>
              {isArabic ? 'اضبط سر المزود (واحد على الأقل):' : 'Set the provider secret (at least one):'}{' '}
              <code className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded">
                supabase secrets set GEMINI_API_KEY=... # أو OPENAI_API_KEY=... أو ANTHROPIC_API_KEY=...
              </code>
            </li>
            <li>
              {isArabic ? 'اختياري — تحديد المزود والنموذج:' : 'Optional — pin provider/model:'}{' '}
              <code className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded">
                supabase secrets set FLOWAI_PROVIDER=anthropic FLOWAI_MODEL=claude-3-5-sonnet-20241022
              </code>
            </li>
            <li>
              {isArabic
                ? 'طبّق ملف الهجرة الأمني (انخفاض حصص الاستخدام، حقن الحصص على الخادم).'
                : 'Apply the security migration (usage counters + server-side quotas).'}
            </li>
          </ol>
          <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white rounded-lg border border-slate-200 p-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isArabic
                ? 'يعامل FlowAI سجلات الـ CRM كبيانات غير موثوقة محاطة بحدود صارمة تمنع حقن التعليمات. لا يستطيع الذكاء الاصطناعي تنفيذ أي أوامر عشوائية أو تعديل السجلات دون موافقتك الصريحة.'
                : 'FlowAI treats CRM records strictly as untrusted data with anti-injection boundaries. AI cannot execute arbitrary SQL, mutate records without confirmation, or bypass PostgreSQL workspace isolation.'}
            </p>
          </div>
          {statusState === 'ready' && status && !status.configured && (
            <div className="flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50 rounded-lg border border-amber-200 p-2.5">
              <CircleAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {isArabic
                  ? 'لم يضبط المدراء مفاتيح المزود بعد: تعمل كل ميزات الذكاء في وضع الاستنتاج الموثق (قوالب حتمية، دون خلاصة لغوية) وبدون استهلاك حصص.'
                  : 'No provider key is configured yet: every AI feature runs in the grounded rules mode (deterministic templates, no LLM output) with zero quota consumption.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
