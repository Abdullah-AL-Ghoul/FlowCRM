// ==============================================================================
// FlowAI Sales Writer — deterministic rule-based draft generator.
// Used when no server provider is configured (and by demo mode) so users get
// an honest, template-driven draft built ONLY from verified fields + explicit
// placeholders. It never fabricates commitments or prior context, and it is
// always labeled as rule-based by the surrounding engine metadata.
// ==============================================================================

import { GroundedEvidence, SalesWriterRequestCore, SalesWriterResponseCore } from './types.ts';

function isArabic(language: 'en' | 'ar'): boolean {
  return language === 'ar';
}

export function buildRuleBasedDraft(
  request: SalesWriterRequestCore,
  evidence: GroundedEvidence[]
): SalesWriterResponseCore {
  const ar = isArabic(request.language);
  const recipient = request.contact?.full_name || (ar ? 'عميلنا العزيز' : 'Valued Client');
  const company = request.contact?.company || '';
  const goal = request.goal || (ar ? 'المتابعة' : 'Follow-up');

  const greeting = ar ? `مرحبًا ${recipient}،` : `Dear ${recipient},`;
  const contextLine = company
    ? ar
      ? `آمل أن تكون أموركم في ${company} على أفضل ما يرام.`
      : `I hope things are going well at ${company}.`
    : ar
      ? 'أتمنى أن تكونوا بأفضل حال.'
      : 'I hope this message finds you well.';

  const missing: string[] = [];
  if (!request.contact?.full_name) missing.push(ar ? '[اسم العميل]' : '[Recipient name]');
  if (!request.contact?.company) missing.push(ar ? '[اسم الشركة]' : '[Company name]');

  const channelSpecific = ArOrEn(ar, request);

  const body = [
    greeting,
    '',
    contextLine,
    channelSpecific,
    '',
    ar
      ? 'خطوة مقترحة: يُرجى تخصيص هذه المسودة بالتفاصيل الفعلية قبل الإرسال.'
      : 'Suggested next step: please customize this draft with real details before sending.',
    '',
    ar ? 'مع خالص التحية،\n[اسم ممثل المبيعات]' : 'Best regards,\n[Your Name]',
  ].join('\n');

  if (!request.contact?.full_name) missing.push(ar ? '[اسم ممثل المبيعات]' : '[Your name]');
  missing.push(ar ? '[الوقت/الموعد المقترح]' : '[Proposed date/time]');

  return {
    subject: channelLabelSubject(request.channel, ar, goal),
    body,
    detectedMissingFields: missing,
    suggestedNextStep: ar
      ? 'تخصيص المسودة بالتفاصيل الفعلية (مواعيد/التزامات) والمراجعة قبل الإرسال اليدوي.'
      : 'Personalize with real details (dates/commitments) and review before manual sending.',
    evidence,
  };
}

function ArOrEn(ar: boolean, request: SalesWriterRequestCore): string {
  const goal = request.goal;
  if (ar) {
    switch (request.channel) {
      case 'email':
      case 'meeting_followup':
        return `أود المتابعة بخصوص: ${goal}، ومناقشة الخطوات التالية المحددة لإنجاح هذا الموضوع.`;
      case 'whatsapp':
      case 'intro':
      case 'proposal_cover':
      case 'renewal':
        return `أود متابعة ${goal} والتأكد من رأيكم في الخطوة التالية.`;
      default:
        return `متابعة بخصوص ${goal}.`;
    }
  }
  switch (request.channel) {
    case 'email':
    case 'meeting_followup':
      return `I am reaching out regarding ${goal} to align on the concrete next steps.`;
    case 'whatsapp':
    case 'intro':
    case 'proposal_cover':
    case 'renewal':
      return `Quick note to follow up on ${goal} — would love your take on the next step.`;
    default:
      return `Follow-up regarding ${goal}.`;
  }
}

function channelLabelSubject(channel: SalesWriterRequestCore['channel'], ar: boolean, goal: string): string {
  if (channel !== 'email' && channel !== 'proposal_cover' && channel !== 'renewal') {
    return '';
  }
  return ar ? `متابعة: ${goal}` : `Follow-up: ${goal}`;
}
