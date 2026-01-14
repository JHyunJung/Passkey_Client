import { useState } from 'react';
import { Card, Button, Input, Alert } from '../components/common';
import { useFido2Api } from '../hooks/useFido2Api';
import { useConfig } from '../context/ConfigContext';
import {
  isWebAuthnSupported,
  convertAuthenticationOptions,
  getCredential,
  getWebAuthnErrorMessage,
} from '../services/webauthn';

type AuthenticationStatus = 'idle' | 'loading' | 'success' | 'error';

interface AuthenticationState {
  status: AuthenticationStatus;
  message: string;
  username?: string;
  debugInfo?: string;
}

export function AuthenticatePage() {
  const [username, setUsername] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [state, setState] = useState<AuthenticationState>({
    status: 'idle',
    message: '',
  });

  const { authStart, authFinish, isMockMode } = useFido2Api();
  const { config } = useConfig();

  const handleAuthenticate = async (useDiscoverable: boolean = false) => {
    // WebAuthn 지원 확인
    if (!isWebAuthnSupported()) {
      setState({
        status: 'error',
        message: '이 브라우저는 WebAuthn을 지원하지 않습니다.',
      });
      return;
    }

    // 사용자명 입력 확인 (Discoverable 아닌 경우)
    if (!useDiscoverable && !username.trim()) {
      setState({
        status: 'error',
        message: '사용자명을 입력하거나 "Passkey로 로그인"을 사용해 주세요.',
      });
      return;
    }

    setState({
      status: 'loading',
      message: isMockMode ? '(Mock) 인증 옵션 생성 중...' : '인증 옵션을 요청 중...',
    });

    try {
      // 1. 서버에서 인증 옵션 요청
      const serverOptions = await authStart(
        useDiscoverable ? {} : { username: username.trim() }
      );

      setState({
        status: 'loading',
        message: 'Passkey 인증 중... 인증기를 확인해 주세요.',
        debugInfo: JSON.stringify(serverOptions, null, 2),
      });

      // 2. 서버 옵션을 WebAuthn 형식으로 변환
      const options = convertAuthenticationOptions(serverOptions);

      // 3. Credential 획득 (사용자 인증 발생)
      const credential = await getCredential(options);

      setState({
        status: 'loading',
        message: isMockMode ? '(Mock) 인증 검증 중...' : '서버에서 검증 중...',
        debugInfo: JSON.stringify(credential, null, 2),
      });

      // 4. 서버에 Credential 전송 및 검증
      const result = await authFinish(credential);

      if (result.success) {
        setState({
          status: 'success',
          message: result.message || '인증이 성공적으로 완료되었습니다!',
          username: result.username,
          debugInfo: JSON.stringify(result, null, 2),
        });
      } else {
        setState({
          status: 'error',
          message: result.message || '인증에 실패했습니다.',
          debugInfo: JSON.stringify(result, null, 2),
        });
      }
    } catch (error) {
      const errorMessage = getWebAuthnErrorMessage(error);
      setState({
        status: 'error',
        message: errorMessage,
        debugInfo: error instanceof Error ? error.stack : String(error),
      });
    }
  };

  const handleReset = () => {
    setUsername('');
    setState({
      status: 'idle',
      message: '',
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Passkey 인증
        </h1>
        <p className="text-gray-600">
          등록된 Passkey를 사용하여 인증합니다.
        </p>
      </div>

      {/* Mock 모드 표시 */}
      {isMockMode && (
        <Alert type="info">
          <span className="font-medium">Mock 모드</span> - 백엔드 서버 없이 로컬에서 테스트 중입니다.
        </Alert>
      )}

      {/* 서버 URL 표시 */}
      {!isMockMode && (
        <div className="text-sm text-gray-500 text-center">
          서버: <code className="bg-gray-100 px-2 py-1 rounded">{config.serverUrl}</code>
        </div>
      )}

      <Card>
        <div className="space-y-4">
          {/* Discoverable Credential 버튼 */}
          <Button
            onClick={() => handleAuthenticate(true)}
            loading={state.status === 'loading'}
            disabled={state.status === 'loading'}
            className="w-full"
            size="lg"
            variant={isMockMode ? 'success' : 'primary'}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            Passkey로 로그인
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 사용자명 입력 방식 */}
          <Input
            label="사용자명"
            placeholder="user@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={state.status === 'loading'}
            helperText="등록 시 사용한 사용자명을 입력하세요."
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => handleAuthenticate(false)}
              loading={state.status === 'loading'}
              disabled={state.status === 'loading'}
              className="flex-1"
            >
              사용자명으로 인증
            </Button>

            {state.status !== 'idle' && state.status !== 'loading' && (
              <Button variant="secondary" onClick={handleReset}>
                초기화
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 상태 메시지 */}
      {state.status === 'loading' && (
        <Alert type="info">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            {state.message}
          </div>
        </Alert>
      )}

      {state.status === 'success' && (
        <Alert type="success" title="인증 성공!">
          <p>{state.message}</p>
          {state.username && (
            <p className="mt-2">
              <span className="font-medium">인증된 사용자:</span> {state.username}
            </p>
          )}
        </Alert>
      )}

      {state.status === 'error' && (
        <Alert type="error" title="인증 실패">
          {state.message}
        </Alert>
      )}

      {/* 디버그 정보 */}
      <div className="mt-6">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showDebug ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          디버그 정보
        </button>

        {showDebug && state.debugInfo && (
          <Card className="mt-2">
            <pre className="text-xs overflow-auto max-h-64 bg-gray-50 p-3 rounded">
              {state.debugInfo}
            </pre>
          </Card>
        )}
      </div>

      {/* 안내 */}
      <Card title="인증 방식">
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">
              Passkey로 로그인 (권장)
            </h4>
            <p>
              Discoverable Credential을 사용하여 사용자명 없이 바로 인증합니다.
              저장된 모든 Passkey 중에서 선택할 수 있습니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">
              사용자명으로 인증
            </h4>
            <p>
              특정 사용자명에 연결된 Passkey로만 인증합니다.
              서버가 해당 사용자의 Credential 목록을 제공합니다.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
