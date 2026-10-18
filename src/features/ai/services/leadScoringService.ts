import { Contact, Deal, Task, Activity } from '../../../types/crm.types';
import { LeadScoreBreakdown } from '../types/ai.types';

export class LeadScoringService {
  /**
   * Calculates a transparent, explainable lead score (0-100) based on verified CRM signals.
   * Clearly marked as a deterministic rule-based framework.
   */
  static calculateLeadScore(
    contact: Contact,
    relatedDeals: Deal[],
    relatedTasks: Task[],
    relatedActivities: Activity[],
    locale: 'en' | 'ar' = 'en'
  ): LeadScoreBreakdown {
    const isArabic = locale === 'ar';
    const factors: LeadScoreBreakdown['factors'] = [];

    // Factor 1: Profile Completeness (max 25 pts)
    let completenessPts = 0;
    const completenessDetails: string[] = [];
    if (contact.email) {
      completenessPts += 10;
      completenessDetails.push(isArabic ? 'بريد إلكتروني موثق (+10)' : 'Verified email (+10)');
    }
    if (contact.phone) {
      completenessPts += 8;
      completenessDetails.push(isArabic ? 'هاتف مباشر (+8)' : 'Direct phone (+8)');
    }
    if (contact.company) {
      completenessPts += 4;
      completenessDetails.push(isArabic ? 'اسم الشركة (+4)' : 'Company entity (+4)');
    }
    if (contact.job_title) {
      completenessPts += 3;
      completenessDetails.push(isArabic ? 'المسمى الوظيفي (+3)' : 'Job title (+3)');
    }

    factors.push({
      factor: isArabic ? 'اكتمال بيانات الملف الشخصي' : 'Profile Completeness',
      points: completenessPts,
      maxPoints: 25,
      reason: completenessDetails.join(', ') || (isArabic ? 'بيانات اتصال شحيحة' : 'Sparse profile data'),
    });

    // Factor 2: Deal Pipeline Association (max 35 pts)
    let dealPts = 0;
    let dealReason = isArabic ? 'لا توجد صفقات مرتبطة حالياً' : 'No active deals linked';
    const activeDeals = relatedDeals.filter(d => d.stage !== 'lost');

    if (activeDeals.some(d => d.stage === 'won')) {
      dealPts = 35;
      dealReason = isArabic ? 'عميل فعلي مع صفقة رابحة مغلقة' : 'Active customer with closed-won deal';
    } else if (activeDeals.some(d => d.stage === 'negotiation' || d.stage === 'proposal')) {
      dealPts = 30;
      dealReason = isArabic ? 'صفقة في مرحلة متقدمة (عرض أسعار أو تفاوض)' : 'Advanced stage opportunity (Proposal/Negotiation)';
    } else if (activeDeals.some(d => d.stage === 'qualified' || d.stage === 'new')) {
      dealPts = 20;
      dealReason = isArabic ? 'فرصة بيع نشطة في مرحلة التأهيل' : 'Active opportunity in qualification pipeline';
    }

    factors.push({
      factor: isArabic ? 'حالة الفرص البيعية' : 'Deal Stage & Pipeline Velocity',
      points: dealPts,
      maxPoints: 35,
      reason: dealReason,
    });

    // Factor 3: Engagement Cadence & Activities (max 25 pts)
    let activityPts = 0;
    const actCount = relatedActivities.length;
    if (actCount >= 5) {
      activityPts = 25;
    } else if (actCount >= 2) {
      activityPts = 15;
    } else if (actCount === 1) {
      activityPts = 8;
    }

    factors.push({
      factor: isArabic ? 'سجل التفاعل والتواصل' : 'Recorded Interaction Cadence',
      points: activityPts,
      maxPoints: 25,
      reason: isArabic ? `${actCount} سجل تفاعل موثق في CRM` : `${actCount} recorded CRM interaction(s)`,
    });

    // Factor 4: Follow-up Discipline & Overdue Tasks (max 15 pts)
    let taskPts = 15;
    const overdueTasks = relatedTasks.filter(
      t => t.status !== 'completed' && new Date(t.due_date) < new Date()
    );

    if (overdueTasks.length > 0) {
      taskPts = Math.max(0, 15 - overdueTasks.length * 5);
    }

    factors.push({
      factor: isArabic ? 'انضباط المتابعات والمهام' : 'Follow-up Task Health',
      points: taskPts,
      maxPoints: 15,
      reason:
        overdueTasks.length === 0
          ? (isArabic ? 'لا توجد مهام متأخرة' : 'No overdue follow-ups')
          : (isArabic ? `تنبيه: ${overdueTasks.length} مهمة متأخرة المتابعة` : `Warning: ${overdueTasks.length} overdue task(s)`),
    });

    const totalScore = Math.min(100, Math.max(0, factors.reduce((sum, f) => sum + f.points, 0)));

    let tier: 'hot' | 'warm' | 'cold' = 'cold';
    if (totalScore >= 70) {
      tier = 'hot';
    } else if (totalScore >= 40) {
      tier = 'warm';
    }

    return {
      contactId: contact.id,
      totalScore,
      tier,
      factors,
      isRuleBased: true,
    };
  }
}
