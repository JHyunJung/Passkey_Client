import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from './context/ConfigContext';
import { Layout } from './components/layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DebugPage = lazy(() => import('./pages/DebugPage').then(m => ({ default: m.DebugPage })));

// Legacy pages - lazy loaded
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const AuthenticatePage = lazy(() => import('./pages/AuthenticatePage').then(m => ({ default: m.AuthenticatePage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">로딩 중...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <BrowserRouter basename="/client">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* New UI/UX Routes (Realistic Flow) */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/debug" element={<DebugPage />} />

                {/* Legacy Test Routes (Developer Tools) */}
                <Route path="/home" element={<HomePage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/authenticate" element={<AuthenticatePage />} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
