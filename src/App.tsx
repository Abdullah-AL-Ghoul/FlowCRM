import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider } from './context/CRMContext';
import { I18nProvider } from './i18n/I18nContext';
import { AppLayout } from './components/layout/AppLayout';

// Public Landing Page
import { LandingPage } from './features/landing/LandingPage';

// Auth Pages
import { SignInPage } from './features/auth/SignInPage';
import { SignUpPage } from './features/auth/SignUpPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';

// CRM Pages
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ContactsPage } from './features/contacts/ContactsPage';
import { DealsKanbanPage } from './features/deals/DealsKanbanPage';
import { TasksPage } from './features/tasks/TasksPage';
import { ActivitiesPage } from './features/activities/ActivitiesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';

// Loading screen
const FullPageSpinner = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-brand-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

// Root Route Guard: Renders high-converting LandingPage at '/' for unauthenticated visitors,
// or wraps authenticated users inside CRMProvider + AppLayout.
const RootRoute: React.FC = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!session) {
    if (location.pathname === '/' || location.pathname === '') {
      return <LandingPage />;
    }
    return <Navigate to="/signin" replace />;
  }

  return (
    <CRMProvider>
      <AppLayout />
    </CRMProvider>
  );
};

// Public Route Guard (Redirects to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Marketing Page */}
            <Route path="/landing" element={<LandingPage />} />

            {/* Public Auth Routes */}
            <Route
              path="/signin"
              element={
                <PublicRoute>
                  <SignInPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignUpPage />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              }
            />

            {/* Root & CRM Application Routes */}
            <Route path="/" element={<RootRoute />}>
              <Route index element={<DashboardPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="deals" element={<DealsKanbanPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;
