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
import { apiLogger as log } from '../utils/logger';

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
  const prevConfig = { ...apiConfig };
  apiConfig = { ...apiConfig, ...config };
  log.info('API 설정 변경', { prev: prevConfig, new: apiConfig });
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
  const requestId = Math.random().toString(36).substring(7);
  const url = `${apiConfig.baseUrl}${endpoint}`;

  log.group(`API 요청 [${requestId}]`);
  log.info(`${options.method || 'GET'} ${endpoint}`);
  log.debug('요청 상세', {
    url,
    method: options.method,
    timeout: apiConfig.timeout,
    hasBody: !!options.body,
  });
  log.startTimer(`request-${requestId}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    log.endTimer(`request-${requestId}`);
    clearTimeout(timeoutId);

    log.debug('응답 상태', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('API 오류 응답', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      log.groupEnd();
      throw new Error(`API 오류 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    log.info('API 응답 성공', { dataKeys: Object.keys(data) });
    log.groupEnd();
    return data;
  } catch (error) {
    log.endTimer(`request-${requestId}`);
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        log.error('요청 타임아웃', { timeout: apiConfig.timeout, endpoint });
        log.groupEnd();
        throw new Error('요청 시간이 초과되었습니다.');
      }
      log.error('API 요청 실패', {
        errorName: error.name,
        errorMessage: error.message,
      });
      log.groupEnd();
      throw error;
    }

    log.error('알 수 없는 API 오류', { error });
    log.groupEnd();
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
  log.info('등록 시작 요청', { username: request.username, displayName: request.displayName });
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
  log.info('등록 완료 요청', { credentialId: credential.id });
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
  log.info('인증 시작 요청', { username: request.username || '(Discoverable)' });
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
  log.info('인증 완료 요청', { credentialId: credential.id });
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
  log.debug('서버 연결 확인 시작', { baseUrl: apiConfig.baseUrl });
  log.startTimer('serverConnection');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${apiConfig.baseUrl}/api/passkey/register/start`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    log.endTimer('serverConnection');

    const isConnected = response.ok || response.status === 405;
    log.info('서버 연결 확인 완료', {
      status: response.status,
      isConnected,
    });
    return isConnected;
  } catch (error) {
    log.endTimer('serverConnection');
    log.warn('서버 연결 실패', {
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    });
    return false;
  }
}
