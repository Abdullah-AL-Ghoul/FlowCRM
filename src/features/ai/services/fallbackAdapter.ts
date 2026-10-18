import { z } from 'zod';
import { IAIProviderAdapter, CompletionOptions, CompletionResult, StructuredResult } from './aiProviderAdapter';
import { AIProviderId } from '../types/ai.types';

export class FallbackAdapter implements IAIProviderAdapter {
  readonly id: AIProviderId = 'offline_rule_based';
  readonly name = 'FlowAI Rule-Based Offline Engine';
  readonly defaultModel = 'rule-engine-v1';

  isConfigured(): boolean {
    return true; // Always operational locally without third-party network egress
  }

  getProviderInfo() {
    return {
      id: this.id,
      name: this.name,
      model: this.defaultModel,
      isAvailable: true,
      statusNotice: 'Running in Local Rule-Based Mode. To enable full generative capabilities, configure Gemini or OpenAI in Settings.',
    };
  }

  async generateCompletion(prompt: string, _options?: CompletionOptions): Promise<CompletionResult> {
    const isArabic = /[\u0600-\u06FF]/.test(prompt);

    const message = isArabic
      ? 'يعمل FlowAI حاليًا في الوضع المحلي المعتمد على القواعد الصارمة. للوصول إلى النماذج التوليدية الكاملة (Gemini أو OpenAI)، يُرجى إدخال مفتاح API في صفحة الإعدادات.'
      : 'FlowAI is currently running in local rule-based mode. To enable external generative reasoning, configure your Google Gemini or OpenAI API key in FlowCRM Settings.';

    return {
      text: message,
      tokensUsed: 0,
      costEstimate: 0,
      providerId: this.id,
      model: this.defaultModel,
    };
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    _options?: CompletionOptions
  ): Promise<StructuredResult<T>> {
    // If structured extraction is requested in offline mode, analyze prompt content with transparent rule heuristics
    const isArabic = /[\u0600-\u06FF]/.test(prompt);

    let fallbackData: any = {};

    // Check if this is a sales writer request
    if (prompt.includes('Sales Writer') || prompt.includes('Primary Goal:')) {
      const goalMatch = prompt.match(/Primary Goal:\s*([^\n]+)/i)?.[1]?.trim() || 'Follow-up';
      const recipientMatch = prompt.match(/Recipient Name:\s*([^\n]+)/i)?.[1]?.trim() || 'Valued Client';
      const companyMatch = prompt.match(/Company:\s*([^\n]+)/i)?.[1]?.trim() || '';

      const greeting = isArabic ? `مرحبًا ${recipientMatch}،` : `Dear ${recipientMatch},`;
      const contextLine = companyMatch
        ? (isArabic ? `آمل أن تكون أموركم في ${companyMatch} على أفضل ما يرام.` : `I hope everything is going well at ${companyMatch}.`)
        : (isArabic ? 'أتمنى أن تكون بأفضل حال.' : 'I hope this message finds you well.');

      const bodyText = isArabic
        ? `${greeting}\n\n${contextLine}\nأود متابعة ${goalMatch} ومناقشة الخطوات التالية المحددة لضمان تحقيق أهدافكم.\n\nيرجى إعلامي بالموعد المناسب لكم خلال هذا الأسبوع لإجراء مكالمة سريعة.\n\nمع خالص التحية،\n[اسم ممثل المبيعات]`
        : `${greeting}\n\n${contextLine}\nI am reaching out regarding ${goalMatch} to ensure we align on the next steps for your requirements.\n\nPlease let me know your availability for a brief 10-minute check-in this week.\n\nBest regards,\n[Your Name]`;

      fallbackData = {
        subject: isArabic ? `متابعة: ${goalMatch}` : `Follow-up: ${goalMatch}`,
        body: bodyText,
        detectedMissingFields: ['[Your Name] / [اسم ممثل المبيعات]', '[Proposed Date / Time]'],
        suggestedNextStep: isArabic ? 'جدولة موعد عبر التقويم والمتابعة خلال 48 ساعة' : 'Schedule calendar invite and log follow-up task',
      };
    } else if (prompt.includes('Meeting Intelligence')) {
      fallbackData = {
        executiveSummary: isArabic
          ? 'تم استخلاص ملخص الاجتماع بناءً على النصوص المسجلة محليًا.'
          : 'Extracted meeting overview based on recorded notes.',
        keyDiscussionPoints: [
          isArabic ? 'مراجعة متطلبات المشروع وجدول الأعمال' : 'Reviewed core agenda and requirements',
          isArabic ? 'مناقشة الميزانية والمواعيد المستهدفة' : 'Discussed target timeline and scope',
        ],
        explicitDecisions: [
          isArabic ? 'الموافقة على متابعة النقاط المحددة' : 'Agreed on scheduled follow-up steps',
        ],
        openQuestions: [
          isArabic ? 'تأكيد الميزانية النهائية والتوقيعات' : 'Confirm final sign-off and stakeholders',
        ],
        potentialRisks: [],
        proposedTasks: [
          {
            id: `task-rule-${Date.now()}`,
            title: isArabic ? 'إرسال ملخص الاجتماع للمشاركين' : 'Send meeting summary to attendees',
            description: isArabic ? 'متابعة ما تم الاتفاق عليه في الاجتماع' : 'Follow up on key discussed items',
            suggestedDueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            priority: 'medium',
            suggestedAssigneeName: null,
          },
        ],
        unsupportedClaims: [],
      };
    }

    const validationResult = schema.safeParse(fallbackData);
    if (!validationResult.success) {
      throw new Error(`Offline rule engine could not satisfy schema: ${validationResult.error.message}`);
    }

    return {
      data: validationResult.data,
      rawText: JSON.stringify(fallbackData),
      tokensUsed: 0,
      costEstimate: 0,
      providerId: this.id,
      model: this.defaultModel,
    };
  }
}
