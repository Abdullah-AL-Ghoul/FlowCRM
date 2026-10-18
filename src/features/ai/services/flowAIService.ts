import { z } from 'zod';
import { IAIProviderAdapter } from './aiProviderAdapter';
import { GeminiAdapter } from './geminiAdapter';
import { OpenAIAdapter } from './openaiAdapter';
import { FallbackAdapter } from './fallbackAdapter';
import { CRMToolRegistry } from './toolRegistry';
import {
  AIProviderId,
  AIWorkspaceUsage,
  ChatMessage,
  GroundedEvidence,
  SalesWriterRequest,
  SalesWriterResponse,
  MeetingIntelligenceResult,
  DealIntelligenceResult,
  ContactIntelligenceResult,
  NLAnalyticsResult,
  ToolName,
} from '../types/ai.types';
import {
  FLOWAI_SYSTEM_DIRECTIVE,
  buildSalesWriterPrompt,
  buildMeetingIntelligencePrompt,
} from '../prompts/promptTemplates';
import { Contact, Deal } from '../../../types/crm.types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { crmService } from '../../../services/crmService';

const USAGE_STORAGE_KEY = 'flowcrm_ai_usage_v1';
const PROVIDER_CONFIG_KEY = 'flowcrm_ai_provider_config_v1';

export class FlowAIService {
  private adapters: Map<AIProviderId, IAIProviderAdapter> = new Map();
  private activeProviderId: AIProviderId = 'gemini';
  private hourlyRateLimit = 60;
  private monthlyTokenLimit = 200_000;

  constructor() {
    const gemini = new GeminiAdapter();
    const openai = new OpenAIAdapter();
    const fallback = new FallbackAdapter();

    this.adapters.set('gemini', gemini);
    this.adapters.set('openai', openai);
    this.adapters.set('offline_rule_based', fallback);

    this.loadSavedConfig();
  }

  private loadSavedConfig() {
    try {
      const saved = localStorage.getItem(PROVIDER_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.providerId && this.adapters.has(parsed.providerId)) {
          this.activeProviderId = parsed.providerId;
        }
        if (parsed.geminiKey) {
          (this.adapters.get('gemini') as GeminiAdapter).setApiKey(parsed.geminiKey);
        }
        if (parsed.openaiKey) {
          (this.adapters.get('openai') as OpenAIAdapter).setApiKey(parsed.openaiKey);
        }
      }
    } catch (err) {
      console.warn('Failed to load AI provider config from storage:', err);
    }
  }

  saveConfig(params: { providerId: AIProviderId; geminiKey?: string; openaiKey?: string }) {
    this.activeProviderId = params.providerId;
    if (params.geminiKey !== undefined) {
      (this.adapters.get('gemini') as GeminiAdapter).setApiKey(params.geminiKey);
    }
    if (params.openaiKey !== undefined) {
      (this.adapters.get('openai') as OpenAIAdapter).setApiKey(params.openaiKey);
    }

    try {
      localStorage.setItem(PROVIDER_CONFIG_KEY, JSON.stringify(params));
    } catch (err) {
      console.error('Failed to persist AI provider config:', err);
    }
  }

  getActiveAdapter(): IAIProviderAdapter {
    const adapter = this.adapters.get(this.activeProviderId);
    if (!adapter || !adapter.isConfigured()) {
      // Graceful fallback to offline rule-based adapter if the active provider has no API key
      return this.adapters.get('offline_rule_based')!;
    }
    return adapter;
  }

  getAvailableProviders() {
    return Array.from(this.adapters.values()).map(a => a.getProviderInfo());
  }

  // --------------------------------------------------------------------------
  // RATE LIMITING & USAGE TELEMETRY
  // --------------------------------------------------------------------------
  getUsage(workspaceId: string): AIWorkspaceUsage {
    try {
      const raw = localStorage.getItem(`${USAGE_STORAGE_KEY}_${workspaceId}`);
      if (raw) {
        const parsed: AIWorkspaceUsage = JSON.parse(raw);
        // Reset hourly requests if more than 1 hour elapsed
        if (Date.now() - parsed.lastRequestTimestamp > 3600 * 1000) {
          parsed.requestsThisHour = 0;
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading AI usage:', err);
    }

    return {
      workspaceId,
      tokensUsedThisMonth: 0,
      maxMonthlyTokens: this.monthlyTokenLimit,
      requestsThisHour: 0,
      maxHourlyRequests: this.hourlyRateLimit,
      lastRequestTimestamp: Date.now(),
      estimatedCostUsd: 0,
    };
  }

  private checkAndRecordUsage(workspaceId: string, tokens: number = 0, cost: number = 0) {
    const usage = this.getUsage(workspaceId);

    if (usage.requestsThisHour >= usage.maxHourlyRequests) {
      throw new Error(
        `Rate limit reached: Maximum ${usage.maxHourlyRequests} AI requests per hour allowed for this workspace. Please try again shortly.`
      );
    }

    usage.requestsThisHour += 1;
    usage.tokensUsedThisMonth += tokens;
    usage.estimatedCostUsd += cost;
    usage.lastRequestTimestamp = Date.now();

    try {
      localStorage.setItem(`${USAGE_STORAGE_KEY}_${workspaceId}`, JSON.stringify(usage));
    } catch (err) {
      console.error('Error saving AI usage:', err);
    }
  }

  // --------------------------------------------------------------------------
  // FLOWAI COPILOT: CHAT & QUERY EXECUTION
  // --------------------------------------------------------------------------
  async askCopilot(params: {
    message: string;
    workspaceId: string;
    locale: 'en' | 'ar';
    chatHistory?: ChatMessage[];
    signal?: AbortSignal;
  }): Promise<{ reply: string; evidence: GroundedEvidence[]; toolUsed?: ToolName }> {
    this.checkAndRecordUsage(params.workspaceId);

    const query = params.message.toLowerCase().trim();
    const isArabic = params.locale === 'ar' || /[\u0600-\u06FF]/.test(query);

    // 1. Determine tool to invoke based on intent matching
    let toolToRun: ToolName | null = null;
    let toolArgs: Record<string, any> = {};

    if (query.includes('overdue') || query.includes('متأخر')) {
      toolToRun = 'get_overdue_tasks';
    } else if (
      query.includes('task') ||
      query.includes('مهام') ||
      query.includes('prioritize') ||
      query.includes('أولويات')
    ) {
      toolToRun = 'get_open_tasks';
    } else if (
      query.includes('pipeline') ||
      query.includes('funnel') ||
      query.includes('مراحل') ||
      query.includes('صفقات')
    ) {
      toolToRun = 'get_pipeline_breakdown';
    } else if (
      query.includes('metric') ||
      query.includes('performance') ||
      query.includes('win rate') ||
      query.includes('أداء') ||
      query.includes('مبيعات')
    ) {
      toolToRun = 'get_sales_metrics';
    } else if (
      query.includes('activity') ||
      query.includes('timeline') ||
      query.includes('نشاط') ||
      query.includes('سجل')
    ) {
      toolToRun = 'get_activity_timeline';
    } else if (
      query.includes('contact') ||
      query.includes('client') ||
      query.includes('عميل') ||
      query.includes('جهات الاتصال')
    ) {
      toolToRun = 'search_contacts';
      // Extract search term if present
      const cleanTerm = query.replace(/(search|find|show|contacts|client|ابحث|عن|عميل)/gi, '').trim();
      toolArgs = { query: cleanTerm || 'a', limit: 5 };
    }

    // Default to metrics if no specific entity mentioned
    if (!toolToRun) {
      toolToRun = 'get_sales_metrics';
    }

    // 2. Execute authorized tool through CRMToolRegistry
    const toolResult = await CRMToolRegistry.executeTool(
      toolToRun,
      toolArgs,
      params.workspaceId,
      params.locale
    );

    // 3. Synthesize response using active adapter or offline grounded reasoning
    const adapter = this.getActiveAdapter();

    if (adapter.id === 'offline_rule_based') {
      // Local Grounded Synthesizer
      let responseText = '';
      if (toolToRun === 'get_overdue_tasks') {
        const count = toolResult.data.length;
        if (count === 0) {
          responseText = isArabic
            ? 'ممتاز! لا توجد مهام متأخرة حالياً في مساحة العمل الخاصة بك.'
            : 'Great news! There are currently no overdue tasks in your workspace.';
        } else {
          const titles = toolResult.data.map((t: any) => `• "${t.title}" (${t.formattedDueDate})`).join('\n');
          responseText = isArabic
            ? `لديك ${count} مهمة متأخرة تتطلب المتابعة الفورية:\n${titles}\n\nيُوصى بالتواصل مع العملاء المرتبطين بهذه المهام لتحديث الجدول الزمني.`
            : `You have ${count} overdue task(s) requiring immediate attention:\n${titles}\n\nRecommended action: reach out to the assigned contacts to reschedule or close.`;
        }
      } else if (toolToRun === 'get_open_tasks') {
        const count = toolResult.data.length;
        const titles = toolResult.data.map((t: any) => `• [${t.priority.toUpperCase()}] ${t.title} (${t.formattedDueDate})`).join('\n');
        responseText = isArabic
          ? `المهام المفتوحة ذات الأولوية اليوم (${count} مهام):\n${titles}`
          : `Active prioritized tasks (${count} items):\n${titles}`;
      } else if (toolToRun === 'get_sales_metrics') {
        const m = toolResult.data;
        responseText = isArabic
          ? `ملخص أداء المبيعات الحالي:\n• إجمالي العملاء: ${m.totalContacts}\n• الصفقات النشطة: ${m.activeDealsCount} بقيمة إجمالية ${m.formattedOpenPipelineValue}\n• الصفقات الرابحة: ${m.wonDealsCount} (${m.formattedWonDealsValue})\n• نسبة إغلاق الصفقات (Win Rate): ${m.winRate}%\n• المهام المتأخرة: ${m.tasksOverdue}`
          : `Current Sales Performance Overview:\n• Total Contacts: ${m.totalContacts}\n• Active Pipeline: ${m.activeDealsCount} deals worth ${m.formattedOpenPipelineValue}\n• Closed Won: ${m.wonDealsCount} deals worth ${m.formattedWonDealsValue}\n• Win Rate: ${m.winRate}%\n• Overdue Tasks: ${m.tasksOverdue}`;
      } else if (toolToRun === 'get_pipeline_breakdown') {
        const breakdownLines = toolResult.data.map((b: any) => `• ${b.stage.toUpperCase()}: ${b.count} صفقات (${b.formattedValue})`).join('\n');
        responseText = isArabic
          ? `توزيع مراحل خط أنابيب المبيعات (Pipeline):\n${breakdownLines}`
          : `Sales Pipeline Distribution by Stage:\n${toolResult.data.map((b: any) => `• ${b.stage.toUpperCase()}: ${b.count} deals (${b.formattedValue})`).join('\n')}`;
      } else if (toolToRun === 'search_contacts') {
        const count = toolResult.data.length;
        if (count === 0) {
          responseText = isArabic ? 'لم يتم العثور على أي جهات اتصال تطابق بحثك.' : 'No contacts found matching your query.';
        } else {
          const list = toolResult.data.map((c: any) => `• ${c.full_name} (${c.company || 'N/A'}) - الحالة: ${c.status}`).join('\n');
          responseText = isArabic
            ? `تم العثور على ${count} من جهات الاتصال:\n${list}`
            : `Found ${count} matching contact(s):\n${list}`;
        }
      } else {
        responseText = toolResult.explanation;
      }

      return {
        reply: responseText,
        evidence: toolResult.evidence,
        toolUsed: toolToRun,
      };
    }

    // When Gemini or OpenAI is configured, pass the grounded tool output to LLM
    const prompt = `
User Question: "${params.message}"
Language: ${isArabic ? 'Arabic' : 'English'}

Verified Tool Result (${toolToRun}):
${JSON.stringify(toolResult.data, null, 2)}

Provide a concise, professional answer grounded exclusively in this data. Mention evidence and highlight next steps.
`.trim();

    try {
      const completion = await adapter.generateCompletion(prompt, {
        systemPrompt: FLOWAI_SYSTEM_DIRECTIVE,
        signal: params.signal,
      });

      this.checkAndRecordUsage(params.workspaceId, completion.tokensUsed, completion.costEstimate);

      return {
        reply: completion.text,
        evidence: toolResult.evidence,
        toolUsed: toolToRun,
      };
    } catch (err: any) {
      console.warn('LLM call failed, falling back to grounded rule synthesizer:', err);
      return {
        reply: `${toolResult.explanation}\n\n(Note: Generated via FlowAI grounded data)`,
        evidence: toolResult.evidence,
        toolUsed: toolToRun,
      };
    }
  }

  // --------------------------------------------------------------------------
  // AI SALES WRITER
  // --------------------------------------------------------------------------
  async generateSalesDraft(
    request: SalesWriterRequest,
    workspaceId: string
  ): Promise<SalesWriterResponse> {
    this.checkAndRecordUsage(workspaceId);

    const adapter = this.getActiveAdapter();

    const prompt = buildSalesWriterPrompt({
      channel: request.channel,
      goal: request.goal,
      tone: request.tone,
      length: request.length,
      language: request.language,
      contactName: request.contact?.full_name,
      company: request.contact?.company || undefined,
      jobTitle: request.contact?.job_title || undefined,
      dealTitle: request.deal?.title || undefined,
      dealValue: request.deal ? formatCurrency(request.deal.value, request.deal.currency, request.language) : undefined,
      notes: request.contact?.notes || undefined,
      userContext: request.userContext,
    });

    const schema = z.object({
      subject: z.string().optional(),
      body: z.string(),
      detectedMissingFields: z.array(z.string()).default([]),
      suggestedNextStep: z.string().optional(),
    });

    const evidence: GroundedEvidence[] = [];
    if (request.contact) {
      evidence.push({
        id: request.contact.id,
        type: 'contact',
        title: request.contact.full_name,
        subtitle: request.contact.company || undefined,
        route: `/contacts?id=${request.contact.id}`,
      });
    }
    if (request.deal) {
      evidence.push({
        id: request.deal.id,
        type: 'deal',
        title: request.deal.title,
        subtitle: formatCurrency(request.deal.value, request.deal.currency, request.language),
        route: `/deals?id=${request.deal.id}`,
      });
    }

    const result = await adapter.generateStructured(prompt, schema);
    this.checkAndRecordUsage(workspaceId, result.tokensUsed, result.costEstimate);

    return {
      subject: result.data.subject,
      body: result.data.body,
      detectedMissingFields: result.data.detectedMissingFields || [],
      suggestedNextStep: result.data.suggestedNextStep,
      evidence,
    };
  }

  // --------------------------------------------------------------------------
  // CONTACT INTELLIGENCE
  // --------------------------------------------------------------------------
  async analyzeContact(
    contact: Contact,
    _workspaceId: string,
    locale: 'en' | 'ar' = 'en'
  ): Promise<ContactIntelligenceResult> {
    const isArabic = locale === 'ar';
    const missing: string[] = [];
    if (!contact.email) missing.push(isArabic ? 'البريد الإلكتروني' : 'Email Address');
    if (!contact.phone) missing.push(isArabic ? 'رقم الهاتف' : 'Phone Number');
    if (!contact.company) missing.push(isArabic ? 'اسم الشركة' : 'Company Name');
    if (!contact.job_title) missing.push(isArabic ? 'المسمى الوظيفي' : 'Job Title');

    const evidence: GroundedEvidence[] = [
      {
        id: contact.id,
        type: 'contact',
        title: contact.full_name,
        subtitle: contact.company || undefined,
        route: `/contacts?id=${contact.id}`,
      },
    ];

    const summary = isArabic
      ? `${contact.full_name} (${contact.job_title || 'بدون مسمى'} في ${contact.company || 'غير محدد'}). حالة العميل: ${contact.status.toUpperCase()}، ومصدر الاكتساب: ${contact.lead_source || 'موقع الويب'}.`
      : `${contact.full_name} (${contact.job_title || 'N/A'} at ${contact.company || 'Unspecified'}). Currently in ${contact.status.toUpperCase()} status via ${contact.lead_source || 'website'}.`;

    const communicationPattern = contact.notes
      ? (isArabic ? 'توجد ملاحظات سابقة مسجلة تشير إلى اهتمام نشط.' : 'Historical notes recorded indicating active interest.')
      : (isArabic ? 'لا توجد سجلات تواصل سابقة كافية.' : 'No recent communication cadence recorded in notes.');

    const suggestedQuestions = isArabic
      ? [
          'ما هي الأولويات والميزانية المحددة للربع الحالي؟',
          'من هم أصحاب القرار الإضافيون المشاركون في التقييم؟',
          'ما هو الإطار الزمني المستهدف لتطبيق الخدمة أو الحل؟',
        ]
      : [
          'What is your target timeline for evaluating this solution?',
          'Who are the key decision makers involved in this sign-off?',
          'What budget has been allocated for this initiative?',
        ];

    const recommendedNextSteps = isArabic
      ? [
          missing.length > 0 ? `استكمال البيانات الناقصة: (${missing.join(', ')})` : 'البيانات الأساسية مكتملة',
          'إرسال بريد إلكتروني ترحيبي وجدولة جلسة اكتشاف متطلبات',
          'ربط جهة الاتصال بفرصة بيع جديدة إذا كان هناك اهتمام صريح',
        ]
      : [
          missing.length > 0 ? `Enrich missing contact fields: (${missing.join(', ')})` : 'Contact details are complete',
          'Schedule an exploratory discovery call',
          'Link to an active deal opportunity if qualified',
        ];

    return {
      summary,
      communicationPattern,
      missingInformation: missing,
      suggestedQuestions,
      recommendedNextSteps,
      evidence,
    };
  }

  // --------------------------------------------------------------------------
  // DEAL INTELLIGENCE
  // --------------------------------------------------------------------------
  async analyzeDeal(
    deal: Deal,
    _workspaceId: string,
    locale: 'en' | 'ar' = 'en'
  ): Promise<DealIntelligenceResult> {
    const isArabic = locale === 'ar';
    const evidence: GroundedEvidence[] = [
      {
        id: deal.id,
        type: 'deal',
        title: deal.title,
        subtitle: formatCurrency(deal.value, deal.currency, locale),
        route: `/deals?id=${deal.id}`,
      },
    ];

    const riskSignals = [];
    const missing: string[] = [];

    if (!deal.contact_id) {
      missing.push(isArabic ? 'جهة اتصال رئيسية مرتبطة بالصفقة' : 'Associated Primary Contact');
      riskSignals.push({
        level: 'high' as const,
        signal: isArabic ? 'لا توجد جهة اتصال مرتبطة' : 'No Associated Contact',
        explanation: isArabic
          ? 'الصفقة غير مقترنة بشخص مسؤول للتواصل والمتابعة.'
          : 'Opportunity has no linked contact stakeholder for follow-ups.',
        isRuleBased: true as const,
      });
    }

    if (!deal.expected_close_date) {
      missing.push(isArabic ? 'تاريخ الإغلاق المتوقع' : 'Expected Close Date');
      riskSignals.push({
        level: 'medium' as const,
        signal: isArabic ? 'تاريخ إغلاق غير محدد' : 'Missing Close Date',
        explanation: isArabic
          ? 'تحديد تاريخ إغلاق مستهدف يرفع من دقة توقعات خط الأنابيب.'
          : 'Setting a clear target close date improves pipeline forecasting.',
        isRuleBased: true as const,
      });
    } else {
      const closeDate = new Date(deal.expected_close_date);
      if (closeDate < new Date() && deal.stage !== 'won' && deal.stage !== 'lost') {
        riskSignals.push({
          level: 'high' as const,
          signal: isArabic ? 'تاريخ الإغلاق المتوقع قد انقضى' : 'Past Target Close Date',
          explanation: isArabic
            ? `انقضى تاريخ الإغلاق المتوقع (${formatDate(deal.expected_close_date, locale)}) وما زالت الصفقة مفتوحة.`
            : `The expected close date (${formatDate(deal.expected_close_date, locale)}) has passed without a stage decision.`,
          isRuleBased: true as const,
        });
      }
    }

    if (deal.stage === 'new') {
      riskSignals.push({
        level: 'low' as const,
        signal: isArabic ? 'مرحلة أولية (New)' : 'Early Pipeline Stage',
        explanation: isArabic ? 'الصفقة ما زالت في مرحلة التأهيل الأولي.' : 'Deal requires initial qualification.',
        isRuleBased: true as const,
      });
    }

    const dealSummary = isArabic
      ? `صفقة "${deal.title}" بقيمة ${formatCurrency(deal.value, deal.currency, locale)} في مرحلة (${deal.stage.toUpperCase()}). المسند إليه: ${deal.assignee?.full_name || 'غير مسند'}.`
      : `Opportunity "${deal.title}" valued at ${formatCurrency(deal.value, deal.currency, locale)} in stage ${deal.stage.toUpperCase()}. Assigned to: ${deal.assignee?.full_name || 'Unassigned'}.`;

    const recommendedNextAction = isArabic
      ? (deal.stage === 'proposal' ? 'متابعة العرض المقدم وتحديد موعد لمناقشة الملاحظات الفنية والميزانية.' : 'جدولة مكالمة لتحديد المتطلبات وتأكيد الميزانية والخطوة التالية.')
      : (deal.stage === 'proposal' ? 'Follow up on the sent proposal to address technical or commercial feedback.' : 'Schedule discovery call to qualify budget, timeline, and decision criteria.');

    const coachingQuestions = isArabic
      ? [
          'هل تم الاتفاق على معايير نجاح واضحة مع العميل؟',
          'هل هناك منافسون آخرون يجرون محادثات في نفس التوقيت؟',
          'ما هي الخطوة التي تحول هذه الصفقة إلى مرحلة الفوز (Won)؟',
        ]
      : [
          'Have measurable success metrics been agreed upon with the sponsor?',
          'Are there competing alternatives currently under consideration?',
          'What specific trigger is needed to secure signature and close won?',
        ];

    return {
      dealSummary,
      riskSignals,
      missingInformation: missing,
      recommendedNextAction,
      coachingQuestions,
      suggestedDraftPrompt: `Follow-up regarding proposal for ${deal.title}`,
      evidence,
    };
  }

  // --------------------------------------------------------------------------
  // MEETING INTELLIGENCE
  // --------------------------------------------------------------------------
  async analyzeMeetingNotes(
    notes: string,
    workspaceId: string,
    locale: 'en' | 'ar' = 'en'
  ): Promise<MeetingIntelligenceResult> {
    this.checkAndRecordUsage(workspaceId);
    const adapter = this.getActiveAdapter();

    const prompt = buildMeetingIntelligencePrompt(notes, locale);

    const schema = z.object({
      executiveSummary: z.string(),
      keyDiscussionPoints: z.array(z.string()),
      explicitDecisions: z.array(z.string()),
      openQuestions: z.array(z.string()),
      potentialRisks: z.array(z.string()),
      proposedTasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          suggestedDueDate: z.string().nullable().optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
          suggestedAssigneeName: z.string().nullable().optional(),
        })
      ),
      unsupportedClaims: z.array(z.string()).default([]),
    });

    const result = await adapter.generateStructured(prompt, schema);
    this.checkAndRecordUsage(workspaceId, result.tokensUsed, result.costEstimate);

    return {
      executiveSummary: result.data.executiveSummary,
      keyDiscussionPoints: result.data.keyDiscussionPoints,
      explicitDecisions: result.data.explicitDecisions,
      openQuestions: result.data.openQuestions,
      potentialRisks: result.data.potentialRisks,
      proposedTasks: result.data.proposedTasks.map(t => ({
        ...t,
        priority: (t.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        suggestedDueDate: t.suggestedDueDate || undefined,
        suggestedAssigneeName: t.suggestedAssigneeName || undefined,
        selected: true,
      })),
      unsupportedClaims: result.data.unsupportedClaims || [],
    };
  }

  // --------------------------------------------------------------------------
  // NATURAL-LANGUAGE ANALYTICS
  // --------------------------------------------------------------------------
  async queryAnalytics(
    queryText: string,
    workspaceId: string,
    locale: 'en' | 'ar' = 'en'
  ): Promise<NLAnalyticsResult> {
    const q = queryText.toLowerCase().trim();
    const isArabic = locale === 'ar' || /[\u0600-\u06FF]/.test(q);

    const [metrics, deals, contacts, breakdown] = await Promise.all([
      crmService.getDashboardMetrics(workspaceId),
      crmService.getDeals(workspaceId),
      crmService.getContacts(workspaceId),
      crmService.getPipelineStageBreakdown(workspaceId),
    ]);

    if (q.includes('won') || q.includes('ربح') || q.includes('فوز')) {
      const wonDeals = deals.filter(d => d.stage === 'won');
      return {
        query: queryText,
        matchedType: 'won_deals_period',
        answerExplanation: isArabic
          ? `تم تحقيق ${wonDeals.length} صفقة رابحة بقيمة إجمالية ${formatCurrency(metrics.wonDealsValue, 'USD', locale)}.`
          : `Achieved ${wonDeals.length} closed won deals totaling ${formatCurrency(metrics.wonDealsValue, 'USD', locale)}.`,
        kpiHighlight: {
          label: isArabic ? 'إجمالي الصفقات الرابحة' : 'Total Closed Won',
          value: formatCurrency(metrics.wonDealsValue, 'USD', locale),
          subtext: isArabic ? `${wonDeals.length} صفقات مغلقة بنجاح` : `${wonDeals.length} closed deals`,
        },
        periodDescription: isArabic ? 'جميع الفترات المسجلة' : 'All recorded periods',
        appliedFilters: ['stage = won'],
        recordLinks: wonDeals.slice(0, 5).map(d => ({
          id: d.id,
          type: 'deal',
          title: d.title,
          subtitle: formatCurrency(d.value, d.currency, locale),
          route: `/deals?id=${d.id}`,
        })),
      };
    }

    if (q.includes('source') || q.includes('مصدر') || q.includes('اكتساب')) {
      const counts: Record<string, number> = {};
      contacts.forEach(c => {
        const src = c.lead_source || 'website';
        counts[src] = (counts[src] || 0) + 1;
      });

      const chartData = Object.entries(counts).map(([name, value]) => ({
        name,
        value,
      }));

      return {
        query: queryText,
        matchedType: 'contact_sources',
        answerExplanation: isArabic
          ? `توزيع مصادر اكتساب العملاء (${contacts.length} جهة اتصال مسجلة عبر ${chartData.length} قنوات).`
          : `Distribution of customer acquisition channels across ${contacts.length} total contacts.`,
        chartData,
        chartType: 'pie',
        periodDescription: isArabic ? 'تراكمي' : 'Cumulative',
        appliedFilters: ['group_by = lead_source'],
        recordLinks: [],
      };
    }

    // Default to pipeline breakdown
    const chartData = breakdown.map(b => ({
      name: b.stage.toUpperCase(),
      value: b.count,
      amount: b.totalValue,
    }));

    return {
      query: queryText,
      matchedType: 'pipeline_stage_counts',
      answerExplanation: isArabic
        ? `حالة خط أنابيب المبيعات: ${metrics.activeDealsCount} صفقة نشطة بقيمة ${formatCurrency(metrics.openPipelineValue, 'USD', locale)}، ونسبة الفوز ${metrics.winRate}%.`
        : `Pipeline distribution: ${metrics.activeDealsCount} open deals worth ${formatCurrency(metrics.openPipelineValue, 'USD', locale)} with a ${metrics.winRate}% historical win rate.`,
      kpiHighlight: {
        label: isArabic ? 'قيمة خط الأنابيب المفتوح' : 'Open Pipeline Value',
        value: formatCurrency(metrics.openPipelineValue, 'USD', locale),
        subtext: isArabic ? `${metrics.activeDealsCount} صفقة نشطة` : `${metrics.activeDealsCount} active deals`,
      },
      chartData,
      chartType: 'bar',
      periodDescription: isArabic ? 'الوقت الفعلي' : 'Real-time',
      appliedFilters: ['group_by = stage'],
      recordLinks: deals.slice(0, 5).map(d => ({
        id: d.id,
        type: 'deal',
        title: d.title,
        subtitle: formatCurrency(d.value, d.currency, locale),
        route: `/deals?id=${d.id}`,
      })),
    };
  }
}

export const flowAIService = new FlowAIService();
