import { Contact, Deal } from '../../../types/crm.types';
import { DataQualityIssue } from '../types/ai.types';

export class DataQualityService {
  /**
   * Performs non-destructive workspace data hygiene audits.
   */
  static auditWorkspace(
    contacts: Contact[],
    deals: Deal[],
    locale: 'en' | 'ar' = 'en'
  ): DataQualityIssue[] {
    const isArabic = locale === 'ar';
    const issues: DataQualityIssue[] = [];

    // 1. Check for Duplicate Contacts by Email
    const emailMap = new Map<string, Contact[]>();
    contacts.forEach(c => {
      if (c.email) {
        const norm = c.email.toLowerCase().trim();
        const list = emailMap.get(norm) || [];
        list.push(c);
        emailMap.set(norm, list);
      }
    });

    emailMap.forEach((matched, email) => {
      if (matched.length > 1) {
        issues.push({
          id: `dup-email-${email}`,
          type: 'duplicate_contact',
          severity: 'high',
          description: isArabic
            ? `تم العثور على ${matched.length} جهات اتصال تشترك في نفس البريد الإلكتروني (${email}).`
            : `Detected ${matched.length} contacts sharing the exact same email address (${email}).`,
          affectedRecords: matched.map(c => ({
            id: c.id,
            type: 'contact',
            title: c.full_name,
            subtitle: c.company || email,
            route: `/contacts?id=${c.id}`,
          })),
          suggestedAction: isArabic
            ? 'مراجعة جهات الاتصال وتوحيد السجلات أو حذف التكرار بعد تأكيد المستخدم.'
            : 'Review duplicate entries and merge records or archive older duplicates.',
        });
      }
    });

    // 2. Check for Duplicate Contacts by Similar Name & Company
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];

        const name1 = c1.full_name.toLowerCase().trim();
        const name2 = c2.full_name.toLowerCase().trim();

        // Exact name match or one is substring of other and same company
        if (name1 === name2 && c1.company && c2.company && c1.company.toLowerCase() === c2.company.toLowerCase()) {
          // If already caught by email, skip
          if (c1.email && c2.email && c1.email.toLowerCase() === c2.email.toLowerCase()) continue;

          issues.push({
            id: `dup-name-${c1.id}-${c2.id}`,
            type: 'duplicate_contact',
            severity: 'medium',
            description: isArabic
              ? `احتمال وجود تكرار: "${c1.full_name}" في شركة "${c1.company}".`
              : `Likely duplicate: "${c1.full_name}" at company "${c1.company}".`,
            affectedRecords: [
              {
                id: c1.id,
                type: 'contact',
                title: c1.full_name,
                subtitle: c1.company || undefined,
                route: `/contacts?id=${c1.id}`,
              },
              {
                id: c2.id,
                type: 'contact',
                title: c2.full_name,
                subtitle: c2.company || undefined,
                route: `/contacts?id=${c2.id}`,
              },
            ],
            suggestedAction: isArabic
              ? 'التحقق من صحة جهة الاتصال والتأكد ما إذا كانت تخص نفس الشخص.'
              : 'Verify with account manager whether these represent the same individual.',
          });
        }
      }
    }

    // 3. Contacts missing both Email and Phone
    const uncontactable = contacts.filter(c => !c.email && !c.phone);
    if (uncontactable.length > 0) {
      issues.push({
        id: 'missing-contact-channels',
        type: 'missing_email_phone',
        severity: 'medium',
        description: isArabic
          ? `يوجد ${uncontactable.length} جهة اتصال تفتقر إلى البريد الإلكتروني ورقم الهاتف معاً.`
          : `Found ${uncontactable.length} contact(s) missing both email and phone number.`,
        affectedRecords: uncontactable.slice(0, 5).map(c => ({
          id: c.id,
          type: 'contact',
          title: c.full_name,
          subtitle: c.company || undefined,
          route: `/contacts?id=${c.id}`,
        })),
        suggestedAction: isArabic
          ? 'تحديث بيانات الاتصال لتفادي فقدان فرص المتابعة.'
          : 'Enrich contact records with verified outreach details.',
      });
    }

    // 4. Stagnant Deals missing expected close date or contact
    const stagnantDeals = deals.filter(
      d => d.stage !== 'won' && d.stage !== 'lost' && (!d.expected_close_date || !d.contact_id)
    );

    if (stagnantDeals.length > 0) {
      issues.push({
        id: 'stagnant-deals-missing-info',
        type: 'stagnant_deal',
        severity: 'low',
        description: isArabic
          ? `يوجد ${stagnantDeals.length} صفقة مفتوحة ينقصها تاريخ إغلاق متوقع أو جهة اتصال مرتبطة.`
          : `Found ${stagnantDeals.length} active deal(s) lacking an expected close date or primary contact.`,
        affectedRecords: stagnantDeals.slice(0, 5).map(d => ({
          id: d.id,
          type: 'deal',
          title: d.title,
          subtitle: d.stage.toUpperCase(),
          route: `/deals?id=${d.id}`,
        })),
        suggestedAction: isArabic
          ? 'تحديد تاريخ إغلاق مستهدف وربط جهة اتصال أساسية بكل صفقة نشطة.'
          : 'Set realistic close dates and link customer champions to active deals.',
      });
    }

    return issues;
  }
}
