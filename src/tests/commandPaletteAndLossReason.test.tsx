import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext';
import { CRMProvider } from '../context/CRMContext';
import { AuthProvider } from '../context/AuthContext';
import { LossReasonModal } from '../features/deals/LossReasonModal';
import { CommandPalette } from '../components/common/CommandPalette';

describe('LossReasonModal Component', () => {
  it('renders modal with title and allows reason selection and submission', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <I18nProvider>
        <LossReasonModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          dealTitle="Enterprise Cloud Migration"
        />
      </I18nProvider>
    );

    expect(screen.getByText('Enterprise Cloud Migration')).toBeDefined();
    expect(screen.getByText(/Record Deal Loss Reason|تسجيل سبب خسارة الصفقة/i)).toBeDefined();

    // Find radio option for competitor
    const competitorLabel = screen.getByText(/Chose a competitor|تم التعاقد مع منافس آخر/i);
    fireEvent.click(competitorLabel);

    // Enter notes
    const textarea = screen.getByPlaceholderText(/e\.g\., Prospect chose competitor|مثال: اختار العميل الحل البديل/i);
    fireEvent.change(textarea, { target: { value: 'Competitor offered 20% discount.' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Confirm Loss|تأكيد وحفظ الخسارة/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith(
        expect.stringMatching(/Chose a competitor|تم التعاقد مع منافس آخر/),
        'Competitor offered 20% discount.'
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
});

describe('CommandPalette Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <CRMProvider>
              <CommandPalette isOpen={false} onClose={vi.fn()} />
            </CRMProvider>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders search input and filters items when isOpen is true', async () => {
    const handleOpenContactModal = vi.fn();

    render(
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <CRMProvider>
              <CommandPalette
                isOpen={true}
                onClose={vi.fn()}
                onOpenContactModal={handleOpenContactModal}
              />
            </CRMProvider>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Search contacts, deals, tasks, or navigate|ابحث في العملاء/i);
    expect(input).toBeDefined();

    // Search for "contact"
    fireEvent.change(input, { target: { value: 'contact' } });

    // Click on "Create New Contact"
    const actionBtn = await screen.findByText(/Create New Contact|إضافة عميل جديد/i);
    expect(actionBtn).toBeDefined();

    fireEvent.click(actionBtn);
    expect(handleOpenContactModal).toHaveBeenCalled();
  });
});
