import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';

describe('Internationalization (i18n) Key Parity', () => {
  it('has identical top-level keys in English and Arabic dictionaries', () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it('has matching navigation keys', () => {
    const enNav = Object.keys(en.nav).sort();
    const arNav = Object.keys(ar.nav).sort();
    expect(enNav).toEqual(arNav);
  });

  it('has matching pipeline stages translated in both languages', () => {
    const enStages = Object.keys(en.deals.stages).sort();
    const arStages = Object.keys(ar.deals.stages).sort();
    expect(enStages).toEqual(arStages);
    expect(enStages).toContain('new');
    expect(enStages).toContain('won');
    expect(enStages).toContain('lost');
  });

  it('has matching contact statuses translated in both languages', () => {
    const enStatuses = Object.keys(en.contacts.statuses).sort();
    const arStatuses = Object.keys(ar.contacts.statuses).sort();
    expect(enStatuses).toEqual(arStatuses);
  });
});
