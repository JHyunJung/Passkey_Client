import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { ServerConfigPanel } from '../config/ServerConfigPanel';
import logoCrosscertEng from '../../assets/logo_crosscert_eng.jpg';
import logoCrosscertKor from '../../assets/logo_crosscert_kor.jpg';

export function Header() {
  const location = useLocation();
  const { config } = useConfig();
  const [showConfig, setShowConfig] = useState(false);

  // 랜딩, 로그인, 회원가입 페이지에서는 간단한 헤더 표시
  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname);

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img
                src={config.logoLanguage === 'kor' ? logoCrosscertKor : logoCrosscertEng}
                alt={config.logoLanguage === 'kor' ? '한국전자인증' : 'CROSSCERT'}
                className="h-8 object-contain"
              />
              {config.useMockServer && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  Test
                </span>
              )}
            </Link>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Navigation - only show on non-auth pages */}
              {!isAuthPage && (
                <nav className="hidden md:flex items-center gap-1 mr-2">
                  <NavLink to="/dashboard" current={location.pathname}>
                    대시보드
                  </NavLink>
                </nav>
              )}

              {/* Settings Button */}
              <button
                onClick={() => setShowConfig(true)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="설정"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfig(false)}
          />
          <div className="relative z-10 m-4">
            <ServerConfigPanel onClose={() => setShowConfig(false)} />
          </div>
        </div>
      )}
    </>
  );
}

interface NavLinkProps {
  to: string;
  current: string;
  children: React.ReactNode;
}

function NavLink({ to, current, children }: NavLinkProps) {
  const isActive = current === to;

  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#0066CC]/10 text-[#0066CC]'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}
