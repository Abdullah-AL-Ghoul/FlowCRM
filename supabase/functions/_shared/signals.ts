// ==============================================================================
// FlowAI Deal & Contact Intelligence (hybrid: transparent rule signals +
// provider-grounded narrative when a server provider is configured).
// Rule signals are honest heuristic evaluations — always labeled isRuleBased.
// Used by BOTH the edge function and the client demo engine.
// ==============================================================================

import {
  ContactIntelligenceResultCore,
  DealIntelligenceResultCore,
  DealRiskSignal,
  GroundedEvidence,
  SharedActivityRow,
  SharedContactRow,
  SharedDealRow,
  SharedTaskRow,
} from './types.ts';
import { formatDateShared, formatMoneyShared, isTaskOverdueShared, toNumber } from './metrics.ts';

export interface IntelContext {
  locale: 'en' | 'ar';
  now: Date;
  tzOffsetMinutes: number;
}

function isArabic(locale: 'en' | 'ar'): boolean {
  return locale === 'ar';
}

// ------------------------------------------------------------------------------
// DEAL INTELLIGENCE
// ------------------------------------------------------------------------------
interface DealRuleEvalInput {
  deal: SharedDealRow;
  relatedTasks: SharedTaskRow[];
  relatedActivities: SharedActivityRow[];
  ctx: IntelContext;
}

export function evaluateDealRuleSignals(input: DealRuleEvalInput): {
  riskSignals: DealRiskSignal[];
  missingInformation: string[];
} {
  const { deal, relatedTasks, relatedActivities, ctx } = input;
  const ar = isArabic(ctx.locale);
  const riskSignals: DealRiskSignal[] = [];
  const missing: string[] = [];

  if (!deal.contact_id) {
    missing.push(ar ? 'جهة اتصال رئيسية مرتبطة بالصفقة' : 'Associated primary contact');
    riskSignals.push({
      level: 'high',
      signal: ar ? 'لا توجد جهة اتصال مرتبطة' : 'No associated contact',
      explanation: ar ? 'الصفقة غير مقترنة بشخص مسؤول للتواصل والمتابعة.' : 'The opportunity has no linked contact stakeholder for follow-ups.',
      isRuleBased: true,
    });
  }

  if (!deal.expected_close_date) {
    missing.push(ar ? 'تاريخ الإغلاق المتوقع' : 'Expected close date');
    riskSignals.push({
      level: 'medium',
      signal: ar ? 'تاريخ إغلاق غير محدد' : 'Missing close date',
      explanation: ar ? 'تحديد تاريخ إغلاق مستهدف يرفع من دقة توقعات خط الأنابيب.' : 'Setting a clear target close date improves pipeline forecasting.',
      isRuleBased: true,
    });
  } else {
    const closeDate = new Date(deal.expected_close_date);
    if (!Number.isNaN(closeDate.getTime()) && closeDate.getTime() < ctx.now.getTime() && deal.stage !== 'won' && deal.stage !== 'lost') {
      riskSignals.push({
        level: 'high',
        signal: ar ? 'تاريخ الإغلاق المتوقع قد انقضى' : 'Past target close date',
        explanation: ar
          ? `انقضى تاريخ الإغلاق المتوقع (${formatDateShared(deal.expected_close_date, ctx.locale)}) وما زالت الصفقة مفتوحة.`
          : `The expected close date (${formatDateShared(deal.expected_close_date, ctx.locale)}) has passed without a stage decision.`,
        isRuleBased: true,
      });
    }
  }

  // Staleness: no recorded activity touching this deal in the last 14 days.
  const lastActivityAt = relatedActivities
    .map(a => (a.occurred_at ? new Date(a.occurred_at).getTime() : NaN))
    .filter(t => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];

  if (Number.isNaN(lastActivityAt as number) || (typeof lastActivityAt === 'number' && ctx.now.getTime() - lastActivityAt > 14 * 86_400_000)) {
    riskSignals.push({
      level: 'medium',
      signal: ar ? 'انقطاع التواصل (أكثر من 14 يومًا)' : 'Communication gap (14+ days)',
      explanation: ar
        ? 'لم تُسجل أي أنشطة مرتبطة بهذه الصفقة خلال الأسبوعين الماضيين.'
        : 'No activity has been recorded against this opportunity in the past two weeks.',
      isRuleBased: true,
    });
  }

  const pendingTasks = relatedTasks.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled'
  );
  const overdueTasks = pendingTasks.filter(t => isTaskOverdueShared(t.due_date, t.status, ctx.now, ctx.tzOffsetMinutes));
  if (overdueTasks.length > 0) {
    riskSignals.push({
      level: 'high',
      signal: ar ? 'مهام متأخرة مرتبطة بالصفقة' : 'Overdue tasks on this deal',
      explanation: ar
        ? `توجد ${overdueTasks.length} مهمة متأخرة مرتبطة بهذه الصفقة.`
        : `${overdueTasks.length} task(s) linked to this deal are overdue.`,
      isRuleBased: true,
    });
  }

  if (deal.stage === 'new') {
    riskSignals.push({
      level: 'low',
      signal: ar ? 'مرحلة أولية (New)' : 'Early pipeline stage',
      explanation: ar ? 'الصفقة ما زالت في مرحلة التأهيل الأولي.' : 'The deal still requires initial qualification.',
      isRuleBased: true,
    });
  }

  return { riskSignals, missingInformation: missing };
}

export function buildDealRuleIntelligence(
  input: DealRuleEvalInput & { contactName: string | null }
): DealIntelligenceResultCore {
  const ar = isArabic(input.ctx.locale);
  const { deal } = input;
  const { riskSignals, missingInformation } = evaluateDealRuleSignals(input);

  const value = formatMoneyShared(toNumber(deal.value), deal.currency || 'USD', input.ctx.locale);
  const evidence: GroundedEvidence[] = [
    {
      id: deal.id,
      type: 'deal',
      title: deal.title,
      subtitle: value,
      route: '/deals',
      snippet: `Stage: ${(deal.stage || 'new').toUpperCase()}`,
    },
  ];

  const dealSummary = ar
    ? `صفقة "${deal.title}" بقيمة ${value} في مرحلة (${(deal.stage || 'new').toUpperCase()}). المسند إليه: ${deal.assignee?.full_name ?? 'غير مسند'}. جهة الاتصال: ${input.contactName ?? 'غير مقترنة'}.`
    : `Opportunity "${deal.title}" valued at ${value} in stage ${(deal.stage || 'new').toUpperCase()}. Assigned to: ${deal.assignee?.full_name ?? 'Unassigned'}. Linked contact: ${input.contactName ?? 'none'}.`;

  const recommendedNextAction = ar
    ? (deal.stage === 'proposal'
        ? 'متابعة العرض المقدم وتحديد موعد لمناقشة الملاحظات الفنية والميزانية.'
        : 'جدولة مكالمة لتحديد المتطلبات وتأكيد الميزانية والخطوة التالية.')
    : deal.stage === 'proposal'
      ? 'Follow up on the sent proposal to address technical or commercial feedback.'
      : 'Schedule a discovery call to qualify budget, timeline, and decision criteria.';

  const coachingQuestions = ar
    ? [
        'هل تم الاتفاق على معايير نجاح واضحة مع العميل؟',
        'هل هناك منافسون آخرون يجرون محادثات في نفس التوقيت؟',
        'ما هي الخطوة التي تحول هذه الصفقة إلى مرحلة الفوز (Won)؟',
      ]
    : [
        'Have measurable success metrics been agreed upon with the sponsor?',
        'Are competing alternatives currently under consideration?',
        'What specific trigger secures signature and closes this deal as won?',
      ];

  return {
    dealSummary,
    riskSignals,
    missingInformation,
    recommendedNextAction,
    coachingQuestions,
    suggestedDraftPrompt: `Follow-up regarding ${deal.title} (${deal.stage})`,
    evidence,
  };
}

// ------------------------------------------------------------------------------
// CONTACT INTELLIGENCE
// ------------------------------------------------------------------------------
export interface ContactRuleEvalInput {
  contact: SharedContactRow;
  relatedDeals: SharedDealRow[];
  relatedActivities: SharedActivityRow[];
  locale: 'en' | 'ar';
  now: Date;
}

export function buildContactRuleIntelligence(input: ContactRuleEvalInput): ContactIntelligenceResultCore {
  const ar = isArabic(input.locale);
  const { contact, relatedDeals, relatedActivities } = input;

  const missing: string[] = [];
  if (!contact.email) missing.push(ar ? 'البريد الإلكتروني' : 'Email address');
  if (!contact.phone) missing.push(ar ? 'رقم الهاتف' : 'Phone number');
  if (!contact.company) missing.push(ar ? 'اسم الشركة' : 'Company name');
  if (!contact.job_title) missing.push(ar ? 'المسمى الوظيفي' : 'Job title');

  const evidence: GroundedEvidence[] = [
    {
      id: contact.id,
      type: 'contact',
      title: contact.full_name,
      subtitle: contact.company ?? undefined,
      route: '/contacts',
      snippet: `Status: ${(contact.status || 'lead').toUpperCase()}`,
    },
  ];

  // Deterministic, fact-only summary.
  const summary = ar
    ? `${contact.full_name} (${contact.job_title || 'بدون مسمى'} في ${contact.company || 'غير محدد'}). الحالة: ${(contact.status || 'lead').toUpperCase()}، ومصدر الاكتساب: ${contact.lead_source || 'موقع الويب'}. الصفقات المرتبطة: ${relatedDeals.length}.`
    : `${contact.full_name} (${contact.job_title || 'N/A'} at ${contact.company || 'Unspecified'}). Status: ${(contact.status || 'lead').toUpperCase()} via ${contact.lead_source || 'website'}. Related deals: ${relatedDeals.length}.`;

  // Communication recency computed from verified activity rows.
  let communicationPattern: string;
  const lastTouch = relatedActivities
    .map(a => (a.occurred_at ? new Date(a.occurred_at).getTime() : NaN))
    .filter(t => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];

  if (typeof lastTouch === 'number' && lastTouch) {
    const daysAgo = Math.floor((input.now.getTime() - lastTouch) / 86_400_000);
    communicationPattern = ar
      ? `آخر تواصل مسجل كان قبل ${daysAgo} يومًا (${relatedActivities.length} نشاط إجمالًا، أخذها من سجلات الأنشطة).`
      : `Last recorded touch was ${daysAgo} day(s) ago (verified across ${relatedActivities.length} activity record(s)).`;
  } else if (contact.notes) {
    communicationPattern = ar
      ? 'توجد ملاحظات سابقة مسجلة، لكن لا توجد سجلات أنشطة مرفقة.'
      : 'Historical notes exist, but no linked activity records were found.';
  } else {
    communicationPattern = ar
      ? 'لا توجد سجلات تواصل سابقة كافية.'
      : 'No sufficient communication history recorded.';
  }

  const suggestedQuestions = ar
    ? [
        'ما هي الأولويات والميزانية المحددة للربع الحالي؟',
        'من هم أصحاب القرار الإضافيون المشاركون في التقييم؟',
        'ما هو الإطار الزمني المستهدف لتطبيق الحل؟',
      ]
    : [
        'What is your target timeline for evaluating this solution?',
        'Who are the key decision makers involved in this sign-off?',
        'What budget has been allocated for this initiative?',
      ];

  const recommendedNextSteps = ar
    ? [
        missing.length > 0 ? `استكمال البيانات الناقصة: (${missing.join('، ')})` : 'البيانات الأساسية مكتملة',
        'إرسال رسالة متابعة وجدولة مكالمة تعريفية',
        relatedDeals.length === 0 ? 'ربط جهة الاتصال بفرصة بيع جديدة عند وجود اهتمام صريح' : 'مراجعة الصفقات المرتبطة وتحديث مراحلها',
      ]
    : [
        missing.length > 0 ? `Enrich missing contact fields: (${missing.join(', ')})` : 'Contact details are complete',
        'Send a follow-up message and schedule an exploratory call',
        relatedDeals.length === 0 ? 'Link the contact to a new opportunity when qualification is confirmed' : 'Review linked deals and refresh their stages',
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
