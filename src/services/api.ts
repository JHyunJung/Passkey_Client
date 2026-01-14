/**
 * FIDO2 백엔드 API 클라이언트
 */

import type {
  RegistrationOptionsResponse,
  AuthenticationOptionsResponse,
  RegistrationCredential,
  AuthenticationCredential,
  RegistrationResult,
  AuthenticationResult,
} from '../types/webauthn';
import type { ApiConfig, RegisterStartRequest, AuthStartRequest } from '../types/api';

// 기본 API 설정
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:8080',
  timeout: 30000,
};

let apiConfig: ApiConfig = { ...DEFAULT_CONFIG };

/**
 * API 설정 변경
 */
export function setApiConfig(config: Partial<ApiConfig>): void {
  apiConfig = { ...apiConfig, ...config };
}

/**
 * 현재 API 설정 반환
 */
export function getApiConfig(): ApiConfig {
  return { ...apiConfig };
}

/**
 * API 요청 헬퍼
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

  try {
    const response = await fetch(`${apiConfig.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 오류 (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다.');
      }
      throw error;
    }

    throw new Error('알 수 없는 오류가 발생했습니다.');
  }
}

// ============================================
// 등록 관련 API
// ============================================

/**
 * 등록 시작 - Challenge 및 옵션 요청
 * POST /api/passkey/register/start
 */
export async function registerStart(
  request: RegisterStartRequest
): Promise<RegistrationOptionsResponse> {
  return fetchApi<RegistrationOptionsResponse>('/api/passkey/register/start', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * 등록 완료 - Attestation 검증
 * POST /api/passkey/register/finish
 */
export async function registerFinish(
  credential: RegistrationCredential
): Promise<RegistrationResult> {
  return fetchApi<RegistrationResult>('/api/passkey/register/finish', {
    method: 'POST',
    body: JSON.stringify(credential),
  });
}

// ============================================
// 인증 관련 API
// ============================================

/**
 * 인증 시작 - Challenge 요청
 * POST /api/passkey/auth/start
 */
export async function authStart(
  request: AuthStartRequest = {}
): Promise<AuthenticationOptionsResponse> {
  return fetchApi<AuthenticationOptionsResponse>('/api/passkey/auth/start', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * 인증 완료 - Assertion 검증
 * POST /api/passkey/auth/finish
 */
export async function authFinish(
  credential: AuthenticationCredential
): Promise<AuthenticationResult> {
  return fetchApi<AuthenticationResult>('/api/passkey/auth/finish', {
    method: 'POST',
    body: JSON.stringify(credential),
  });
}

// ============================================
// 서버 연결 확인
// ============================================

/**
 * 서버 연결 상태 확인
 */
export async function checkServerConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${apiConfig.baseUrl}/api/passkey/register/start`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 405; // OPTIONS가 허용되지 않아도 서버는 동작 중
  } catch {
    return false;
  }
}
