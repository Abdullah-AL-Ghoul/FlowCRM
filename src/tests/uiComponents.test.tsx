import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { I18nProvider, useI18n } from '../i18n/I18nContext';
import { Users } from 'lucide-react';

const LanguageToggleTester: React.FC = () => {
  const { locale, setLocale, direction, t } = useI18n();
  return (
    <div>
      <span data-testid="current-lang">{locale}</span>
      <span data-testid="current-dir">{direction}</span>
      <span data-testid="translated-title">{t('dashboard.title')}</span>
      <button onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}>
        Toggle Lang
      </button>
    </div>
  );
};

describe('UI & UX Components Suite', () => {
  it('renders Badge with correct variant styling classes', () => {
    const { rerender } = render(<Badge variant="gold">VIP Customer</Badge>);
    const badge = screen.getByText('VIP Customer');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-brand-goldMuted');

    rerender(<Badge variant="success">Deal Won</Badge>);
    expect(screen.getByText('Deal Won').className).toContain('bg-emerald-50');

    rerender(<Badge variant="danger">Overdue</Badge>);
    expect(screen.getByText('Overdue').className).toContain('bg-rose-50');
  });

  it('renders Button with variants and handles loading and click events', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="gold" onClick={handleClick}>
        Save Deal
      </Button>
    );

    const button = screen.getByRole('button', { name: /save deal/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('bg-brand-gold');

    // Click trigger
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Loading state disables interaction
    rerender(
      <Button variant="gold" loading onClick={handleClick}>
        Save Deal
      </Button>
    );
    expect(button).toBeDisabled();
  });

  it('renders Card with header and content sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Sales Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total Revenue: $250,000</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Sales Metrics')).toBeDefined();
    expect(screen.getByText('Total Revenue: $250,000')).toBeDefined();
  });

  it('renders EmptyState with custom icon, title, description, and action button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Users}
        title="No contacts found"
        description="Try adjusting your search criteria"
        actionLabel="Add Contact"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No contacts found')).toBeDefined();
    expect(screen.getByText('Try adjusting your search criteria')).toBeDefined();

    const actionBtn = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders ConfirmDialog inside I18nProvider and handles confirmations', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    const { rerender } = render(
      <I18nProvider>
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Contact"
          description="Are you sure you want to permanently delete this contact?"
          confirmLabel="Confirm Delete"
          cancelLabel="Cancel"
        />
      </I18nProvider>
    );

    expect(screen.getByText('Delete Contact')).toBeDefined();
    expect(screen.getByText(/permanently delete this contact/i)).toBeDefined();

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    // If isOpen is false, dialog should not render contents
    rerender(
      <I18nProvider>
        <ConfirmDialog
          isOpen={false}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Contact"
        />
      </I18nProvider>
    );
    expect(screen.queryByText('Delete Contact')).toBeNull();
  });

  it('switches languages and toggles RTL direction and translated strings', () => {
    render(
      <I18nProvider>
        <LanguageToggleTester />
      </I18nProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle lang/i });
    const langSpan = screen.getByTestId('current-lang');
    const dirSpan = screen.getByTestId('current-dir');
    const titleSpan = screen.getByTestId('translated-title');

    // Default is English LTR (or whichever is currently set in localStorage)
    expect(['en', 'ar']).toContain(langSpan.textContent);

    // Switch to Arabic explicitly
    fireEvent.click(toggleBtn);
    // If it was en, it's now ar; if it was ar, it's now en
    const newLang = langSpan.textContent;
    const expectedDir = newLang === 'ar' ? 'rtl' : 'ltr';
    expect(dirSpan.textContent).toBe(expectedDir);

    if (newLang === 'ar') {
      expect(titleSpan.textContent).toBe('نظرة عامة على المبيعات');
    } else {
      expect(titleSpan.textContent).toBe('Sales Overview');
    }
  });
});
