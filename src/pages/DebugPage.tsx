import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { getMockCredentials, clearMockData } from '../services/mockServer';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isConditionalMediationAvailable,
} from '../services/webauthn';

interface WebAuthnStatus {
  supported: boolean;
  platformAuthenticator: boolean;
  conditionalMediation: boolean;
  loading: boolean;
}

export function DebugPage() {
  const { config, updateConfig } = useConfig();
  const [status, setStatus] = useState<WebAuthnStatus>({
    supported: false,
    platformAuthenticator: false,
    conditionalMediation: false,
    loading: true,
  });
  const [serverUrl, setServerUrl] = useState(config.serverUrl);

  const credentials = config.useMockServer ? getMockCredentials() : [];

  useEffect(() => {
    async function checkStatus() {
      const supported = isWebAuthnSupported();
      const platformAuthenticator = await isPlatformAuthenticatorAvailable();
      const conditionalMediation = await isConditionalMediationAvailable();

      setStatus({
        supported,
        platformAuthenticator,
        conditionalMediation,
        loading: false,
      });
    }

    checkStatus();
  }, []);

  const handleToggleMockMode = () => {
    updateConfig({ useMockServer: !config.useMockServer });
  };

  const handleUpdateServerUrl = () => {
    updateConfig({ serverUrl });
  };

  const handleClearMockData = () => {
    clearMockData();
    window.location.reload();
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">개발자 도구</h1>
            <p className="text-gray-600">FIDO2/WebAuthn 테스트 설정 및 디버깅</p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            돌아가기
          </Link>
        </div>

        {/* WebAuthn Status */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">WebAuthn 지원 상태</h3>
          </div>
          <div className="p-6">
            {status.loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <StatusRow
                  label="WebAuthn API"
                  supported={status.supported}
                  description="navigator.credentials 지원 여부"
                />
                <StatusRow
                  label="Platform Authenticator"
                  supported={status.platformAuthenticator}
                  description="Touch ID, Face ID, Windows Hello 등"
                />
                <StatusRow
                  label="Conditional UI (Autofill)"
                  supported={status.conditionalMediation}
                  description="Passkey 자동완성 지원"
                />
              </div>
            )}
          </div>
        </div>

        {/* Server Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">서버 설정</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Mock Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Mock 모드</p>
                <p className="text-sm text-gray-500">
                  백엔드 서버 없이 로컬에서 테스트
                </p>
              </div>
              <button
                onClick={handleToggleMockMode}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  config.useMockServer ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    config.useMockServer ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Server URL */}
            <div className={config.useMockServer ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서버 URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleUpdateServerUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                엔드포인트: /api/passkey/register/start, /api/passkey/register/finish, /api/passkey/auth/start, /api/passkey/auth/finish
              </p>
            </div>
          </div>
        </div>

        {/* Mock Data */}
        {config.useMockServer && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Mock 데이터</h3>
              <button
                onClick={handleClearMockData}
                className="text-sm text-red-600 hover:text-red-700"
              >
                모두 삭제
              </button>
            </div>
            <div className="p-6">
              {credentials.length === 0 ? (
                <p className="text-gray-500 text-center py-4">저장된 Credential이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {credentials.map((cred) => (
                    <div
                      key={cred.credentialId}
                      className="p-4 bg-gray-50 rounded-lg font-mono text-xs"
                    >
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                        <span className="text-gray-500">ID:</span>
                        <span className="text-gray-800 break-all">{cred.credentialId}</span>
                        <span className="text-gray-500">Username:</span>
                        <span className="text-gray-800">{cred.username}</span>
                        <span className="text-gray-500">Display:</span>
                        <span className="text-gray-800">{cred.displayName}</span>
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-800">
                          {new Date(cred.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">빠른 링크</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickLink to="/" label="랜딩 페이지" />
              <QuickLink to="/login" label="로그인" />
              <QuickLink to="/signup" label="회원가입" />
              <QuickLink to="/dashboard" label="대시보드" />
            </div>
          </div>
        </div>

        {/* Legacy Pages */}
        <div className="mt-6 p-4 bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-500 mb-3">이전 테스트 페이지 (개발용)</p>
          <div className="flex gap-3">
            <Link
              to="/register"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              등록 테스트
            </Link>
            <Link
              to="/authenticate"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              인증 테스트
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  supported: boolean;
  description: string;
}

function StatusRow({ label, supported, description }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          supported
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}
      >
        {supported ? '지원됨' : '미지원'}
      </span>
    </div>
  );
}

interface QuickLinkProps {
  to: string;
  label: string;
}

function QuickLink({ to, label }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="p-3 bg-gray-50 rounded-lg text-center text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
    >
      {label}
    </Link>
  );
}
