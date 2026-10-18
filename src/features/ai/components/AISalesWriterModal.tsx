import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Contact, Deal } from '../../../types/crm.types';
import { useCRM } from '../../../context/CRMContext';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import {
  WriterChannel,
  WriterTone,
  WriterLength,
  WriterLanguage,
  SalesWriterResponse,
} from '../types/ai.types';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  AlertCircle,
  Mail,
  MessageCircle,
  FileText,
  Clock,
  SendHorizontal,
} from 'lucide-react';

export interface AISalesWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContact?: Contact | null;
  initialDeal?: Deal | null;
}

export const AISalesWriterModal: React.FC<AISalesWriterModalProps> = ({
  isOpen,
  onClose,
  initialContact,
  initialDeal,
}) => {
  const { contacts, deals, createActivity } = useCRM();
  const { locale } = useI18n();
  const isArabic = locale === 'ar';

  const [channel, setChannel] = useState<WriterChannel>('email');
  const [tone, setTone] = useState<WriterTone>('professional');
  const [length, setLength] = useState<WriterLength>('balanced');
  const [language, setLanguage] = useState<WriterLanguage>(locale === 'ar' ? 'ar' : 'en');
  const [goal, setGoal] = useState('Follow up after initial proposal');
  const [userContext, setUserContext] = useState('');

  const [selectedContactId, setSelectedContactId] = useState<string>(initialContact?.id || '');
  const [selectedDealId, setSelectedDealId] = useState<string>(initialDeal?.id || '');

  const [loading, setLoading] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<SalesWriterResponse | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedToCRM, setSavedToCRM] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props
  React.useEffect(() => {
    if (initialContact?.id) setSelectedContactId(initialContact.id);
    if (initialDeal?.id) setSelectedDealId(initialDeal.id);
  }, [initialContact, initialDeal]);

  const activeContact = contacts.find(c => c.id === selectedContactId) || null;
  const activeDeal = deals.find(d => d.id === selectedDealId) || null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    setSavedToCRM(false);

    try {
      const response = await flowAIService.generateSalesDraft(
        {
          channel,
          goal,
          tone,
          length,
          language,
          contact: activeContact,
          deal: activeDeal,
          userContext: userContext.trim() || undefined,
        },
        activeContact?.workspace_id || 'demo-workspace-01'
      );

      setGeneratedDraft(response);
      setEditedSubject(response.subject || '');
      setEditedBody(response.body);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate sales draft');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const fullText = editedSubject ? `Subject: ${editedSubject}\n\n${editedBody}` : editedBody;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToActivity = async () => {
    if (!editedBody) return;
    try {
      await createActivity({
        type: channel === 'email' ? 'email' : 'note',
        description: `FlowAI Draft Saved: ${editedSubject ? `[${editedSubject}] ` : ''}${editedBody.slice(0, 180)}...`,
        contact_id: activeContact?.id || null,
        deal_id: activeDeal?.id || null,
        user_id: null,
        occurred_at: new Date().toISOString(),
      });
      setSavedToCRM(true);
    } catch (err: any) {
      console.error('Failed to log activity:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArabic ? 'كاتب المبيعات الذكي — FlowAI' : 'FlowAI Sales Writer'}
      description={
        isArabic
          ? 'صياغة رسائل ومتابعات مبيعات احترافية بناءً على بيانات CRM الحقيقية'
          : 'Draft high-converting client messages grounded in verified CRM context'
      }
      size="xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Entities Selector */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                {isArabic ? 'العميل المستهدف' : 'Target Contact'}
              </label>
              <select
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">{isArabic ? '— اختياري: اختر عميلاً —' : '— Optional: Select Contact —'}</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.company || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                {isArabic ? 'الصفقة المرتبطة' : 'Linked Deal'}
              </label>
              <select
                value={selectedDealId}
                onChange={e => setSelectedDealId(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">{isArabic ? '— اختياري: اختر صفقة —' : '— Optional: Select Deal —'}</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.currency} {d.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format & Goals */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                {isArabic ? 'قناة التواصل' : 'Channel'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'meeting_followup', label: 'Meeting', icon: Clock },
                  { id: 'intro', label: 'Intro', icon: SendHorizontal },
                  { id: 'proposal_cover', label: 'Proposal', icon: FileText },
                  { id: 'renewal', label: 'Renewal', icon: Sparkles },
                ].map(item => {
                  const Icon = item.icon;
                  const isSel = channel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setChannel(item.id as WriterChannel)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        isSel
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isArabic ? 'النبرة' : 'Tone'}
                </label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as WriterTone)}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="professional">Professional</option>
                  <option value="consultative">Consultative</option>
                  <option value="urgent">Urgent</option>
                  <option value="friendly">Friendly</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isArabic ? 'الطول' : 'Length'}
                </label>
                <select
                  value={length}
                  onChange={e => setLength(e.target.value as WriterLength)}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isArabic ? 'اللغة' : 'Language'}
                </label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as WriterLanguage)}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ar">العربية (Arabic)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                {isArabic ? 'الهدف الأساسي من الرسالة' : 'Primary Goal'}
              </label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Schedule a 15-minute demo, Follow up on proposal"
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                {isArabic ? 'سياق إضافي أو تعليمات خاصة' : 'Additional Rep Notes / Context'}
              </label>
              <textarea
                value={userContext}
                onChange={e => setUserContext(e.target.value)}
                rows={2}
                placeholder="e.g. Mention our recent discount discussion, emphasize next week's deadline"
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <Button
            variant="gold"
            className="w-full"
            onClick={handleGenerate}
            disabled={loading || !goal.trim()}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {loading
              ? isArabic
                ? 'جاري الصياغة...'
                : 'Generating Draft...'
              : isArabic
              ? 'إنشاء مسودة ذكية'
              : 'Generate Sales Draft'}
          </Button>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Output Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-gold" />
              <span>{isArabic ? 'المعاينة والتحرير' : 'Draft Preview & Editor'}</span>
            </span>

            {generatedDraft && (
              <Badge variant="gold" size="sm">
                {language === 'ar' ? 'العربية' : 'English'} | {channel.toUpperCase()}
              </Badge>
            )}
          </div>

          {!generatedDraft && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">
                {isArabic
                  ? 'حدد المعايير واضغط "إنشاء مسودة ذكية" لصياغة الرسالة'
                  : 'Select your parameters and click generate to craft your message.'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {isArabic
                  ? 'يستخدم كاتب المبيعات بيانات العميل والصفقات الموثقة دون اختلاق معلومات.'
                  : 'Grounded in authorized CRM customer data. No fabricated discounts or commitments.'}
              </p>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-brand-gold animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                {isArabic ? 'يقوم FlowAI بصياغة الرسالة...' : 'FlowAI is crafting your tailored draft...'}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-3">
              {/* Subject if applicable */}
              {(channel === 'email' || editedSubject) && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {isArabic ? 'موضوع الرسالة (Subject):' : 'Subject Line:'}
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={e => setEditedSubject(e.target.value)}
                    className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              {/* Message Body Editor */}
              <div className="flex-1 flex flex-col">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {isArabic ? 'نص الرسالة (قابل للتعديل):' : 'Message Body (Editable):'}
                </label>
                <textarea
                  value={editedBody}
                  onChange={e => setEditedBody(e.target.value)}
                  rows={9}
                  className="w-full flex-1 text-xs py-2.5 px-3 rounded-lg border border-slate-300 bg-white font-sans leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Missing Placeholders Warning */}
              {generatedDraft?.detectedMissingFields && generatedDraft.detectedMissingFields.length > 0 && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/70 text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3 h-3 text-amber-700" />
                    <span>{isArabic ? 'يرجى مراجعة العناصر الناقصة:' : 'Placeholders to fill before sending:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {generatedDraft.detectedMissingFields.map((f, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 italic">
                  {isArabic
                    ? 'FlowAI لا يرسل الرسائل آلياً؛ يتطلب إرسالها موافقتك الصريحة.'
                    : 'Human-in-the-loop: FlowAI drafts never send automatically.'}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? (isArabic ? 'تم النسخ!' : 'Copied!') : isArabic ? 'نسخ' : 'Copy'}
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleSaveToActivity}
                    disabled={savedToCRM}
                    icon={savedToCRM ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  >
                    {savedToCRM ? (isArabic ? 'تم الحفظ في السجل' : 'Saved to CRM') : isArabic ? 'حفظ في السجل' : 'Save to Record'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
