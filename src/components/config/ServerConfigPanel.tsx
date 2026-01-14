import { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { Button, Input, Card, Alert } from '../common';
import { checkServerConnection } from '../../services/api';

interface ServerConfigPanelProps {
  onClose?: () => void;
}

export function ServerConfigPanel({ onClose }: ServerConfigPanelProps) {
  const { config, updateConfig, resetConfig } = useConfig();
  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    updateConfig({ serverUrl });
    setConnectionStatus('idle');
  };

  const handleCheckConnection = async () => {
    setIsChecking(true);
    setConnectionStatus('idle');

    try {
      const isConnected = await checkServerConnection();
      setConnectionStatus(isConnected ? 'success' : 'error');
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleMock = () => {
    updateConfig({ useMockServer: !config.useMockServer });
  };

  return (
    <Card title="서버 설정" className="max-w-lg">
      <div className="space-y-4">
        {/* Mock 모드 토글 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Mock 모드</h4>
            <p className="text-sm text-gray-500">
              백엔드 서버 없이 로컬에서 테스트
            </p>
          </div>
          <button
            onClick={handleToggleMock}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${config.useMockServer ? 'bg-blue-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${config.useMockServer ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {config.useMockServer && (
          <Alert type="info">
            Mock 모드가 활성화되었습니다. 실제 백엔드 서버 없이 WebAuthn 기능을 테스트할 수 있습니다.
          </Alert>
        )}

        {/* 로고 언어 선택 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">로고 언어</h4>
          <div className="flex gap-2">
            <button
              onClick={() => updateConfig({ logoLanguage: 'eng' })}
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium transition-all
                ${
                  config.logoLanguage === 'eng'
                    ? 'bg-[#0066CC] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              English (CROSSCERT)
            </button>
            <button
              onClick={() => updateConfig({ logoLanguage: 'kor' })}
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium transition-all
                ${
                  config.logoLanguage === 'kor'
                    ? 'bg-[#0066CC] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              한국어 (한국전자인증)
            </button>
          </div>
        </div>

        {/* 서버 URL 설정 */}
        {!config.useMockServer && (
          <>
            <Input
              label="서버 URL"
              placeholder="http://localhost:8080"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              helperText="FIDO2 백엔드 서버 주소"
            />

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCheckConnection}
                loading={isChecking}
                disabled={isChecking}
              >
                연결 테스트
              </Button>
              <Button onClick={handleSave} disabled={serverUrl === config.serverUrl}>
                저장
              </Button>
            </div>

            {connectionStatus === 'success' && (
              <Alert type="success">서버에 연결되었습니다!</Alert>
            )}

            {connectionStatus === 'error' && (
              <Alert type="error">
                서버에 연결할 수 없습니다. URL을 확인하거나 Mock 모드를 사용하세요.
              </Alert>
            )}
          </>
        )}

        {/* API 엔드포인트 정보 */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-800 mb-2">API 엔드포인트</h4>
          <div className="text-sm text-gray-600 space-y-1 font-mono bg-gray-50 p-3 rounded">
            <p>POST /api/passkey/register/start</p>
            <p>POST /api/passkey/register/finish</p>
            <p>POST /api/passkey/auth/start</p>
            <p>POST /api/passkey/auth/finish</p>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={resetConfig}>
            기본값 복원
          </Button>
          {onClose && (
            <Button onClick={onClose}>닫기</Button>
          )}
        </div>
      </div>
    </Card>
  );
}
