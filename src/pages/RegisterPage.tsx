import { useState } from 'react';
import { Card, Button, Input, Alert } from '../components/common';
import { useFido2Api } from '../hooks/useFido2Api';
import { useConfig } from '../context/ConfigContext';
import {
  isWebAuthnSupported,
  convertRegistrationOptions,
  createCredential,
  getWebAuthnErrorMessage,
} from '../services/webauthn';

type RegistrationStatus = 'idle' | 'loading' | 'success' | 'error';

interface RegistrationState {
  status: RegistrationStatus;
  message: string;
  credentialId?: string;
  debugInfo?: string;
}

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [state, setState] = useState<RegistrationState>({
    status: 'idle',
    message: '',
  });

  const { registerStart, registerFinish, isMockMode } = useFido2Api();
  const { config } = useConfig();

  const handleRegister = async () => {
    // 입력 검증
    if (!username.trim()) {
      setState({
        status: 'error',
        message: '사용자명을 입력해 주세요.',
      });
      return;
    }

    // WebAuthn 지원 확인
    if (!isWebAuthnSupported()) {
      setState({
        status: 'error',
        message: '이 브라우저는 WebAuthn을 지원하지 않습니다.',
      });
      return;
    }

    setState({
      status: 'loading',
      message: isMockMode ? '(Mock) 등록 옵션 생성 중...' : '등록 옵션을 요청 중...',
    });

    try {
      // 1. 서버에서 등록 옵션 요청
      const serverOptions = await registerStart({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
      });

      setState({
        status: 'loading',
        message: 'Passkey 생성 중... 인증기를 확인해 주세요.',
        debugInfo: JSON.stringify(serverOptions, null, 2),
      });

      // 2. 서버 옵션을 WebAuthn 형식으로 변환
      const options = convertRegistrationOptions(serverOptions);

      // 3. Credential 생성 (사용자 인증 발생)
      const credential = await createCredential(options);

      setState({
        status: 'loading',
        message: isMockMode ? '(Mock) 등록 완료 처리 중...' : '서버에 등록 중...',
        debugInfo: JSON.stringify(credential, null, 2),
      });

      // 4. 서버에 Credential 전송 및 검증
      const result = await registerFinish(credential);

      if (result.success) {
        setState({
          status: 'success',
          message: result.message || 'Passkey가 성공적으로 등록되었습니다!',
          credentialId: result.credentialId,
          debugInfo: JSON.stringify(result, null, 2),
        });
      } else {
        setState({
          status: 'error',
          message: result.message || '등록에 실패했습니다.',
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
    setDisplayName('');
    setState({
      status: 'idle',
      message: '',
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Passkey 등록
        </h1>
        <p className="text-gray-600">
          새로운 Passkey를 생성하고 서버에 등록합니다.
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
          <Input
            label="사용자명"
            placeholder="user@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={state.status === 'loading'}
          />

          <Input
            label="표시 이름 (선택)"
            placeholder="홍길동"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={state.status === 'loading'}
            helperText="인증기에 표시될 이름입니다."
          />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleRegister}
              loading={state.status === 'loading'}
              disabled={state.status === 'loading'}
              className="flex-1"
              variant={isMockMode ? 'success' : 'primary'}
            >
              {state.status === 'loading' ? '등록 중...' : 'Passkey 등록'}
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
        <Alert type="success" title="등록 성공!">
          <p>{state.message}</p>
          {state.credentialId && (
            <p className="mt-2 text-xs font-mono break-all">
              Credential ID: {state.credentialId}
            </p>
          )}
        </Alert>
      )}

      {state.status === 'error' && (
        <Alert type="error" title="등록 실패">
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
      <Card title="등록 과정">
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>서버에서 등록 옵션(Challenge)을 요청합니다.</li>
          <li>브라우저가 인증기(Touch ID, Face ID 등)를 호출합니다.</li>
          <li>사용자가 인증을 완료하면 Credential이 생성됩니다.</li>
          <li>생성된 Credential을 서버에 전송하여 등록을 완료합니다.</li>
        </ol>
      </Card>
    </div>
  );
}
