import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Alert } from '../components/common';
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

export function HomePage() {
  const [status, setStatus] = useState<WebAuthnStatus>({
    supported: false,
    platformAuthenticator: false,
    conditionalMediation: false,
    loading: true,
  });

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

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          FIDO2 Passkey 테스트
        </h1>
        <p className="text-gray-600">
          WebAuthn API를 사용하여 Passkey 등록 및 인증을 테스트합니다.
        </p>
      </div>

      {/* WebAuthn 상태 */}
      <Card title="WebAuthn 지원 상태">
        {status.loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <StatusItem
              label="WebAuthn API"
              supported={status.supported}
              description="브라우저의 WebAuthn 지원 여부"
            />
            <StatusItem
              label="Platform Authenticator"
              supported={status.platformAuthenticator}
              description="Touch ID, Face ID, Windows Hello 등"
            />
            <StatusItem
              label="Conditional UI"
              supported={status.conditionalMediation}
              description="Passkey 자동 완성 지원"
            />
          </div>
        )}
      </Card>

      {/* 지원 여부에 따른 경고/안내 */}
      {!status.loading && !status.supported && (
        <Alert type="error" title="WebAuthn 미지원">
          이 브라우저는 WebAuthn을 지원하지 않습니다.
          Chrome, Firefox, Safari, Edge 등 최신 브라우저를 사용해 주세요.
        </Alert>
      )}

      {!status.loading && status.supported && !status.platformAuthenticator && (
        <Alert type="warning" title="Platform Authenticator 미지원">
          Platform Authenticator가 감지되지 않았습니다.
          보안 키(Security Key)를 사용하여 테스트할 수 있습니다.
        </Alert>
      )}

      {/* 기능 카드 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Passkey 등록
            </h3>
            <p className="text-gray-600 mb-4">
              새로운 Passkey를 생성하고 서버에 등록합니다.
            </p>
            <Link
              to="/register"
              className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              등록하기
            </Link>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Passkey 인증
            </h3>
            <p className="text-gray-600 mb-4">
              등록된 Passkey를 사용하여 인증합니다.
            </p>
            <Link
              to="/authenticate"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              인증하기
            </Link>
          </div>
        </Card>
      </div>

      {/* 정보 섹션 */}
      <Card title="FIDO2/WebAuthn이란?">
        <div className="prose prose-sm text-gray-600">
          <p>
            FIDO2는 비밀번호 없이 안전하게 인증할 수 있는 개방형 표준입니다.
            WebAuthn API를 통해 브라우저에서 생체 인증(지문, 얼굴), PIN 또는
            보안 키를 사용하여 로그인할 수 있습니다.
          </p>
          <ul className="mt-3 space-y-1">
            <li>• 비밀번호보다 안전 (피싱 방지)</li>
            <li>• 편리한 사용자 경험</li>
            <li>• 다양한 인증 방식 지원</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

interface StatusItemProps {
  label: string;
  supported: boolean;
  description: string;
}

function StatusItem({ label, supported, description }: StatusItemProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="font-medium text-gray-800">{label}</span>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <span
        className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${supported ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        `}
      >
        {supported ? '지원됨' : '미지원'}
      </span>
    </div>
  );
}
