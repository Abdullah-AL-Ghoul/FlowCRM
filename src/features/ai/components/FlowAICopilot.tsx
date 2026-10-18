import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { flowAIService } from '../services/flowAIService';
import { ChatMessage } from '../types/ai.types';
import { EvidenceCitation } from './EvidenceCitation';
import { Button } from '../../../components/common/Button';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface FlowAICopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlowAICopilot: React.FC<FlowAICopilotProps> = ({ isOpen, onClose }) => {
  const { session } = useAuth();
  const { locale } = useI18n();
  const isArabic = locale === 'ar';
  const workspaceId = session?.workspace?.id || 'demo-workspace-01';

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: isArabic
        ? 'مرحبًا بك! أنا FlowAI، مساعدك الذكي في المبيعات وإدارة علاقات العملاء. كيف يمكنني مساعدتك في مساحة عملك اليوم؟'
        : 'Welcome! I am FlowAI, your sales and CRM copilot. How can I assist you with your pipeline or customer follow-ups today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiGenerated: true,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickPrompts = isArabic
    ? [
        { label: 'ما هي المتابعات المتأخرة؟', query: 'Which follow-ups are overdue?' },
        { label: 'شرح خط أنابيب المبيعات', query: 'Explain the current sales pipeline' },
        { label: 'ما هي أولويات مهام اليوم؟', query: 'Which tasks should I prioritize today?' },
        { label: 'ملخص أداء المبيعات', query: 'Summarize sales performance' },
      ]
    : [
        { label: 'Overdue follow-ups', query: 'Which follow-ups are overdue?' },
        { label: 'Explain sales pipeline', query: 'Explain the current sales pipeline' },
        { label: 'Prioritize today’s tasks', query: 'Which tasks should I prioritize today?' },
        { label: 'Sales performance summary', query: 'Summarize sales performance' },
      ];

  const handleSendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await flowAIService.askCopilot({
        message: trimmed,
        workspaceId,
        locale,
        chatHistory: messages,
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidence: response.evidence,
        isAiGenerated: true,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isArabic
          ? `عذرًا، حدث خطأ أثناء معالجة الطلب: ${err.message}`
          : `Unable to complete request: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: false,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: isArabic
          ? 'تم تفريغ المحادثة. أنا جاهز للإجابة على استفساراتك حول العملاء والصفقات.'
          : 'Conversation cleared. Ready for your next CRM question.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: true,
      },
    ]);
  };

  const activeAdapter = flowAIService.getActiveAdapter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          'relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10',
          'border-s border-slate-200/90 transition-transform duration-300 ease-out'
        )}
        role="dialog"
        aria-label="FlowAI Copilot"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-goldHover flex items-center justify-center text-slate-950 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight">FlowAI Copilot</h3>
                <span className="text-[10px] px-1.5 py-0.2 bg-brand-gold/20 text-brand-goldPale rounded border border-brand-gold/40 font-medium">
                  {activeAdapter.id === 'offline_rule_based' ? 'Grounded Mode' : activeAdapter.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isArabic ? 'مساعد المبيعات الذكي المرخص' : 'Authorized Sales & CRM Intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isArabic ? 'مسح المحادثة' : 'Clear Chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isArabic ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Grounding Notice Banner */}
        <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-200/50 flex items-center justify-between text-[11px] text-amber-900 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">
              {isArabic
                ? 'إجابات مدعومة بأدلة CRM موثوقة حصراً'
                : 'Read-only verified CRM tool grounding'}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
            Least Privilege
          </span>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2.5 max-w-[90%]',
                msg.role === 'user' ? 'ms-auto flex-row-reverse' : 'me-auto'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs',
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-amber-500/10 text-brand-gold border border-brand-gold/30'
                )}
              >
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-2">
                <div
                  className={cn(
                    'p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs relative group',
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-te-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-ts-xs'
                  )}
                >
                  {/* AI Generated tag */}
                  {msg.isAiGenerated && (
                    <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-200/50 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1 text-brand-gold font-medium">
                        <Sparkles className="w-2.5 h-2.5" />
                        FlowAI
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.role === 'assistant' && (
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Evidence Links */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="ps-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {isArabic ? 'سجلات CRM المرتبطة:' : 'Supporting CRM Records:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.evidence.map(ev => (
                        <EvidenceCitation key={ev.id} evidence={ev} onNavigate={onClose} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 max-w-[85%] me-auto">
              <div className="w-7 h-7 rounded-full bg-amber-500/10 text-brand-gold border border-brand-gold/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-gold animate-bounce" />
                <span className="inline-block w-2 h-2 rounded-full bg-brand-gold animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block w-2 h-2 rounded-full bg-brand-gold animate-bounce [animation-delay:0.4s]" />
                <span className="ms-1 font-medium text-[11px]">
                  {isArabic ? 'جاري التحقق من سجلات CRM...' : 'Grounding against CRM context...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {isArabic ? 'اقتراحات سريعة:' : 'Quick Prompts:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.query)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-brand-gold/60 hover:bg-amber-50/30 transition-all shadow-2xs font-medium cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              isArabic
                ? 'اسأل FlowAI عن الصفقات، المتابعات، أو الأداء...'
                : 'Ask FlowAI about contacts, deals, or follow-ups...'
            }
            disabled={loading}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
          <Button
            type="submit"
            variant="gold"
            size="sm"
            disabled={!input.trim() || loading}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </aside>
    </div>
  );
};
