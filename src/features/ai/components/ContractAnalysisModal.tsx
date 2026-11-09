import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useCRM } from '../../../context/CRMContext';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import { ContractAnalysisResult } from '../types/ai.types';
import { formatCurrency } from '../../../lib/utils';
import {
  Sparkles,
  FileText,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  CheckSquare,
  Lock,
  Scale,
  RefreshCw,
  Plus,
} from 'lucide-react';

export interface ContractAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDealId?: string;
  initialContactId?: string;
  initialText?: string;
}

const SAMPLE_DOCS = {
  saas: {
    labelEn: 'Enterprise SaaS Agreement ($85,000)',
    labelAr: 'اتفاقية ترخيص برمجيات المؤسسات (85,000$)',
    text: `MASTER SOFTWARE AS A SERVICE AGREEMENT
Effective Date: 2026-06-01
Expiration Date: 2027-05-31
Parties: FlowCRM Inc. ("Provider") and Apex Global Logistics Ltd. ("Client").

1. SUBSCRIPTION FEES & PAYMENT:
Client shall pay an annual recurring subscription fee of $85,000 USD due under Net 30 terms upon execution.

2. TERM AND AUTOMATIC RENEWAL:
This Agreement shall commence on the Effective Date and automatically renew for successive one-year periods unless either party provides written notice of non-renewal at least 60 days prior to the expiration date.

3. INDEMNIFICATION:
Client agrees to defend, indemnify, and hold harmless Provider from and against any third-party claims, damages, liabilities, and legal costs arising from Client data or breach of applicable regulations.

4. LIMITATION OF LIABILITY:
Neither party's aggregate liability arising under this Agreement shall exceed the total amounts paid by Client during the twelve (12) month period immediately preceding the incident.

5. TERMINATION FOR CONVENIENCE:
Either party may terminate this Agreement without cause upon ninety (90) days prior written notice.`,
  },
  sow: {
    labelEn: 'Consulting SOW ($35,000)',
    labelAr: 'بيان عمل استشاري (35,000$)',
    text: `STATEMENT OF WORK — CRM INTEGRATION & DATA MIGRATION
Effective Date: 2026-07-01
Completion Date: 2026-11-30
Client: Horizon Media Group | Contractor: FlowCRM Professional Services.

FEES AND MILESTONES:
Total fixed price: $35,000 USD payable across three delivery milestones:
- Milestone 1 (Discovery & Architecture): $10,000 USD
- Milestone 2 (Data Migration & API Bridge): $15,000 USD
- Milestone 3 (User Acceptance Testing & Go-Live): $10,000 USD

TERMINATION:
Client may terminate for convenience upon fourteen (14) days notice, subject to compensating Contractor for all hours completed up to the date of notice.

CONFIDENTIALITY & IP:
All work products delivered shall become Client property upon full payment. Both parties maintain strict confidentiality for three (3) years following project closure.`,
  },
  nda: {
    labelEn: 'Mutual NDA (Bilateral)',
    labelAr: 'اتفاقية عدم إفصاح متبادلة (سرية)',
    text: `MUTUAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT
Effective Date: 2026-05-15
Expiration Date: 2028-05-14
Parties: FlowCRM Technology Corp. and Quantum Ventures FZCO.

1. PURPOSE:
The parties wish to explore a potential strategic sales and distribution partnership.

2. OBLIGATIONS:
Each party agrees to maintain in strict confidence all proprietary technical, financial, and customer data disclosed by the other party. Neither party shall reverse engineer, copy, or distribute confidential materials.

3. REMEDIES:
The parties acknowledge that unauthorized disclosure causes irreparable harm warranting immediate injunctive relief in addition to damages. Total consideration under this exploratory NDA is $0 USD.`,
  },
};

export const ContractAnalysisModal: React.FC<ContractAnalysisModalProps> = ({
  isOpen,
  onClose,
  initialDealId,
  initialContactId,
  initialText = '',
}) => {
  const { deals, contacts, createTask, updateDeal } = useCRM();
  const { session } = useAuth();
  const { locale } = useI18n();
  const isArabic = locale === 'ar';
  const workspaceId = session?.workspace?.id || 'demo-workspace-01';

  const [documentText, setDocumentText] = useState(initialText);
  const [selectedDealId, setSelectedDealId] = useState(initialDealId || '');
  const [selectedContactId, setSelectedContactId] = useState(initialContactId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContractAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedDealValue, setAppliedDealValue] = useState(false);
  const [createdTaskTitle, setCreatedTaskTitle] = useState<string | null>(null);

  // Sync state if initial props change
  useEffect(() => {
    if (initialDealId) setSelectedDealId(initialDealId);
    if (initialContactId) setSelectedContactId(initialContactId);
    if (initialText) setDocumentText(initialText);
  }, [initialDealId, initialContactId, initialText]);

  const handleAnalyze = async () => {
    if (!documentText.trim()) return;
    setLoading(true);
    setError(null);
    setAppliedDealValue(false);
    setCreatedTaskTitle(null);

    try {
      const data = await flowAIService.analyzeContract(
        documentText,
        workspaceId,
        isArabic ? 'ar' : 'en',
        {
          dealId: selectedDealId || null,
          contactId: selectedContactId || null,
        }
      );
      setResult(data);
    } catch (err: any) {
      setError(err?.message || (isArabic ? 'فشل تحليل المستند' : 'Failed to analyze contract document'));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyValueToDeal = async () => {
    if (!selectedDealId || !result?.financialTerms?.totalValue) return;
    const targetDeal = deals.find(d => d.id === selectedDealId);
    if (!targetDeal) return;

    try {
      await updateDeal(selectedDealId, {
        value: result.financialTerms.totalValue,
      });
      setAppliedDealValue(true);
    } catch (err: any) {
      setError(err?.message || (isArabic ? 'تعذر تحديث قيمة الصفقة' : 'Could not update deal value'));
    }
  };

  const handleCreateReviewTask = async (actionText: string) => {
    try {
      const title = `${isArabic ? 'مراجعة عقد' : 'Legal/Contract Review'}: ${actionText.slice(0, 50)}`;
      await createTask({
        title,
        description: `${actionText}\n\nDocument: ${result?.title || 'Contract'}\nParties: ${result?.parties?.partyA || ''} / ${result?.parties?.partyB || ''}`,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        status: 'pending',
        assigned_to: null,
        deal_id: selectedDealId || null,
        contact_id: selectedContactId || null,
      });
      setCreatedTaskTitle(title);
    } catch (err: any) {
      setError(err?.message || (isArabic ? 'تعذر إنشاء المهمة' : 'Could not create task'));
    }
  };

  const getRiskBadge = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            {isArabic ? 'مخاطرة مرتفعة' : 'High Risk'}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            {isArabic ? 'مخاطرة متوسطة' : 'Medium Risk'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {isArabic ? 'مخاطرة منخفضة / قياسي' : 'Standard / Low Risk'}
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArabic ? 'تحليل العقود والمستندات — FlowAI' : 'Contract & Document Intelligence — FlowAI'}
      description={
        isArabic
          ? 'استخراج الشروط التجارية، كشف بنود المخاطر، والتحقق الآمن داخل حدود عزل البيانات غير الموثوقة'
          : 'Extract commercial terms, flag risk clauses, and verify data inside strict anti-injection boundaries'
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* Anti-Injection Security Callout */}
        <div className="p-3 bg-gradient-to-r from-amber-50 to-slate-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-700 shadow-2xs">
          <Lock className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {isArabic ? 'عزل أمني للبيانات غير الموثوقة' : 'Anti-Injection Boundary Active'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white rounded border border-slate-200 text-slate-600">
                &lt;UNTRUSTED_DOCUMENT_DATA&gt;
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isArabic
                ? 'يعامل FlowAI نصوص العقود كبيانات سلبية مقروءة فقط، ولا يمكن لأي أوامر مدمجة داخل المستند اختراق قواعد العمل أو تنفيذ عمليات في مساحة العمل.'
                : 'FlowAI treats uploaded contract text strictly as passive data. Embedded prompts or instructions inside the document cannot override system guardrails or mutate CRM state.'}
            </p>
          </div>
        </div>

        {/* Association Selectors & Sample Contracts */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isArabic ? 'ربط بصفقة في الـ CRM (اختياري)' : 'Associate with Deal (Optional)'}
              </label>
              <select
                value={selectedDealId}
                onChange={e => setSelectedDealId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold"
              >
                <option value="">{isArabic ? '— بدون ربط بصفقة —' : '— No deal linked —'}</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({formatCurrency(d.value, d.currency, locale)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isArabic ? 'ربط بجهة اتصال (اختياري)' : 'Associate with Contact (Optional)'}
              </label>
              <select
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold"
              >
                <option value="">{isArabic ? '— بدون ربط بجهة اتصال —' : '— No contact linked —'}</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick-load sample document buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              {isArabic ? 'نماذج عقود تجريبية جاهزة للتحليل الفوري:' : 'Quick-load sample contracts for immediate analysis:'}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDocumentText(SAMPLE_DOCS.saas.text)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                {isArabic ? SAMPLE_DOCS.saas.labelAr : SAMPLE_DOCS.saas.labelEn}
              </button>
              <button
                type="button"
                onClick={() => setDocumentText(SAMPLE_DOCS.sow.text)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                {isArabic ? SAMPLE_DOCS.sow.labelAr : SAMPLE_DOCS.sow.labelEn}
              </button>
              <button
                type="button"
                onClick={() => setDocumentText(SAMPLE_DOCS.nda.text)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                {isArabic ? SAMPLE_DOCS.nda.labelAr : SAMPLE_DOCS.nda.labelEn}
              </button>
            </div>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">{isArabic ? 'نص العقد أو المستند' : 'Contract or Agreement Text'}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {documentText.length} {isArabic ? 'حرف' : 'characters'}
            </span>
          </div>
          <textarea
            value={documentText}
            onChange={e => setDocumentText(e.target.value)}
            rows={7}
            placeholder={
              isArabic
                ? 'الصق نص الاتفاقية، الشروط والأحكام، أو اختر أحد النماذج الجاهزة أعلاه للتحليل الفوري...'
                : 'Paste contract agreement, terms of service, or load a sample document above...'
            }
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold leading-relaxed resize-y"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            variant="gold"
            onClick={handleAnalyze}
            disabled={loading || !documentText.trim()}
            icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          >
            {loading
              ? isArabic
                ? 'جارٍ استخراج الشروط وتحليل المخاطر...'
                : 'Analyzing Clauses & Risks...'
              : isArabic
              ? 'تحليل العقد والمخاطر'
              : 'Analyze Contract'}
          </Button>

          {documentText && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDocumentText('');
                setResult(null);
                setError(null);
              }}
            >
              {isArabic ? 'مسح النص' : 'Clear Text'}
            </Button>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Analysis Results Display */}
        {result && (
          <div className="space-y-5 pt-4 border-t border-slate-200 animate-fadeIn">
            {/* Header Result Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-brand-gold">{result.title}</h4>
                  <Badge variant="gold" size="sm">
                    {result.contractType}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  {result.parties.partyA} ⇄ {result.parties.partyB}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isArabic ? 'حدود البيانات محصنة' : 'Boundary Enforced'}
                </span>
                {result.isAiGenerated && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                    <Sparkles className="w-3 h-3" />
                    FlowAI
                  </span>
                )}
              </div>
            </div>

            {/* Executive Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <FileText className="w-3.5 h-3.5 text-brand-gold" />
                <span>{isArabic ? 'الملخص التنفيذي للمستند' : 'Executive Summary'}</span>
              </div>
              <p className="leading-relaxed text-slate-700">{result.executiveSummary}</p>
            </div>

            {/* Commercial Terms & Dates Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Financial Terms Card */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>{isArabic ? 'القيمة والشروط المالية' : 'Financial Terms'}</span>
                  </div>
                  {result.financialTerms.totalValue !== null && (
                    <span className="text-sm font-extrabold text-slate-900">
                      {result.financialTerms.formattedValue ||
                        formatCurrency(result.financialTerms.totalValue, result.financialTerms.currency, locale)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>{isArabic ? 'جدول الدفع:' : 'Schedule:'}</strong> {result.financialTerms.paymentSchedule}
                </p>

                {/* 1-Click Update Deal Value */}
                {selectedDealId && result.financialTerms.totalValue !== null && (
                  <div className="pt-2">
                    {appliedDealValue ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isArabic ? 'تم تحديث قيمة الصفقة بنجاح!' : 'Deal value successfully updated!'}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyValueToDeal}
                        className="text-xs w-full justify-center"
                      >
                        {isArabic
                          ? `تحديث قيمة الصفقة في الـ CRM (${result.financialTerms.formattedValue || result.financialTerms.totalValue})`
                          : `Apply Value to CRM Deal (${result.financialTerms.formattedValue || result.financialTerms.totalValue})`}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Dates & Timeline Card */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>{isArabic ? 'المدد والتواريخ الزمنية' : 'Effective & Expiration Dates'}</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isArabic ? 'تاريخ السريان:' : 'Effective Date:'}</span>
                    <span className="font-semibold text-slate-800">
                      {result.effectiveDate || (isArabic ? 'غير محدد' : 'Unspecified')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isArabic ? 'تاريخ الانتهاء:' : 'Expiration Date:'}</span>
                    <span className="font-semibold text-slate-800">
                      {result.expirationDate || (isArabic ? 'غير محدد' : 'Unspecified')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Clauses Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>{isArabic ? 'تحليل بنود المخاطر والالتزامات' : 'Risk Clauses & Legal Observations'}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {result.riskClauses.length} {isArabic ? 'بنود محددة' : 'clauses identified'}
                </span>
              </div>

              {result.riskClauses.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                  {isArabic ? 'لم يتم رصد بنود مخاطر غير اعتيادية في هذا النص.' : 'No high-risk clauses detected in this excerpt.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {result.riskClauses.map((clause, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 capitalize">
                          {clause.category.replace('_', ' ')}
                        </span>
                        {getRiskBadge(clause.riskLevel)}
                      </div>
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                        "{clause.clauseSnippet}"
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">{clause.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Key Obligations */}
            {result.keyObligations?.length > 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckSquare className="w-3.5 h-3.5 text-brand-gold" />
                  <span>{isArabic ? 'الالتزامات الرئيسية والمخرجات' : 'Key Obligations & Deliverables'}</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 list-disc ps-4 leading-relaxed">
                  {result.keyObligations.map((ob, idx) => (
                    <li key={idx}>{ob}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Next Actions */}
            {result.recommendedActions?.length > 0 && (
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                    <span>{isArabic ? 'إجراءات المتابعة الموصى بها' : 'Recommended Next Actions'}</span>
                  </div>
                  {createdTaskTitle && (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isArabic ? 'تمت إضافة المهمة للـ CRM' : 'Task added to CRM'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {result.recommendedActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-amber-100 text-xs text-slate-800"
                    >
                      <span className="leading-relaxed">{action}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateReviewTask(action)}
                        icon={<Plus className="w-3 h-3" />}
                        className="text-[11px] shrink-0"
                      >
                        {isArabic ? 'إنشاء مهمة' : 'Create Task'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
