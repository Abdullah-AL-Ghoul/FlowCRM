import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider } from './context/CRMContext';
import { I18nProvider } from './i18n/I18nContext';
import { AppLayout } from './components/layout/AppLayout';

// Public Landing Page (Lazy-loaded)
const LandingPage = lazy(() =>
  import('./features/landing/LandingPage').then(m => ({ default: m.LandingPage }))
);

// Auth Pages (Lazy-loaded)
const SignInPage = lazy(() =>
  import('./features/auth/SignInPage').then(m => ({ default: m.SignInPage }))
);
const SignUpPage = lazy(() =>
  import('./features/auth/SignUpPage').then(m => ({ default: m.SignUpPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage }))
);

// CRM Pages (Lazy-loaded)
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage }))
);
const ContactsPage = lazy(() =>
  import('./features/contacts/ContactsPage').then(m => ({ default: m.ContactsPage }))
);
const DealsKanbanPage = lazy(() =>
  import('./features/deals/DealsKanbanPage').then(m => ({ default: m.DealsKanbanPage }))
);
const TasksPage = lazy(() =>
  import('./features/tasks/TasksPage').then(m => ({ default: m.TasksPage }))
);
const ActivitiesPage = lazy(() =>
  import('./features/activities/ActivitiesPage').then(m => ({ default: m.ActivitiesPage }))
);
const ReportsPage = lazy(() =>
  import('./features/reports/ReportsPage').then(m => ({ default: m.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage }))
);

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
          <Suspense fallback={<FullPageSpinner />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;
