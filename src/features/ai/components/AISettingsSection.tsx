import React, { useState } from 'react';
import { flowAIService } from '../services/flowAIService';
import { AIProviderId } from '../types/ai.types';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
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
} from 'lucide-react';

export const AISettingsSection: React.FC = () => {
  const { session } = useAuth();
  const { locale } = useI18n();
  const isArabic = locale === 'ar';
  const workspaceId = session?.workspace?.id || 'demo-workspace-01';

  const [providerId, setProviderId] = useState<AIProviderId>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const usage = flowAIService.getUsage(workspaceId);
  const activeAdapter = flowAIService.getActiveAdapter();

  const handleSave = () => {
    flowAIService.saveConfig({
      providerId,
      geminiKey: geminiKey.trim() || undefined,
      openaiKey: openaiKey.trim() || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <Card className="border-amber-200/80 shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{isArabic ? 'إعدادات FlowAI ونماذج الذكاء الاصطناعي' : 'FlowAI Model & Provider Configuration'}</span>
                <Badge variant={activeAdapter.id === 'offline_rule_based' ? 'gold' : 'success'} size="sm">
                  {activeAdapter.name}
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {isArabic
                  ? 'إدارة مزودي النماذج، مفاتيح API، وتتبع استهلاك الحصص المخصصة'
                  : 'Manage AI provider adapters, API keys, quotas, and cost controls'}
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
                  desc: 'High speed, bilingual reasoning & structured extraction',
                },
                {
                  id: 'openai',
                  title: 'OpenAI',
                  model: 'gpt-4o-mini',
                  desc: 'Consistent JSON mode and enterprise language drafting',
                },
                {
                  id: 'offline_rule_based',
                  title: 'Offline Rule Engine',
                  model: 'Grounded Mode',
                  desc: 'Zero external network calls, 100% CRM verifiable heuristics',
                },
              ].map(p => {
                const isSelected = providerId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setProviderId(p.id as AIProviderId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-gold bg-amber-50/30 shadow-xs ring-1 ring-brand-gold'
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
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Key className="w-4 h-4 text-brand-gold" />
                <span>
                  {providerId === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                </span>
              </div>

              {providerId === 'gemini' ? (
                <div>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Get your key from Google AI Studio. Stored securely in client storage.
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Get your key from OpenAI Platform dashboard.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Security & Key Safety Guarantee */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <span className="font-semibold text-slate-900">Security & Isolation Guarantee:</span>
              <p className="text-slate-600">
                FlowAI treats CRM records strictly as untrusted data with anti-injection boundaries. AI cannot execute arbitrary SQL, mutate records without confirmation, or bypass PostgreSQL workspace isolation.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{isArabic ? 'تم حفظ الإعدادات بنجاح!' : 'AI settings saved successfully!'}</span>
              </span>
            ) : <span />}

            <Button
              variant="gold"
              onClick={handleSave}
              icon={<Save className="w-4 h-4" />}
            >
              {isArabic ? 'حفظ إعدادات المزود' : 'Save AI Configuration'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
