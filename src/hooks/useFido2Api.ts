/**
 * @fileoverview FIDO2 API 추상화 레이어 - Mock/실제 서버 자동 전환
 *
 * 이 훅은 FIDO2 API 호출을 추상화하여 Mock 서버와 실제 서버를
 * 설정에 따라 자동으로 전환합니다. 컴포넌트는 서버 모드를 신경 쓰지 않고
 * 동일한 인터페이스로 API를 호출할 수 있습니다.
 *
 * 주요 기능:
 * - Mock/실제 서버 자동 전환 (ConfigContext 기반)
 * - API 호출 추상화 및 통합 인터페이스 제공
 * - useCallback을 통한 성능 최적화
 * - 타입 안전성 보장
 *
 * @module useFido2Api
 * @author CROSSCERT
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * function SignupPage() {
 *   const { registerStart, registerFinish, isMockMode } = useFido2Api();
 *
 *   const handleSignup = async () => {
 *     const options = await registerStart({ username: 'user@example.com' });
 *     // ... WebAuthn API 호출
 *     const result = await registerFinish(credential);
 *   };
 * }
 * ```
 */

import { useCallback, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import {
  registerStart,
  registerFinish,
  authStart,
  authFinish,
  setApiConfig,
} from '../services/api';
import {
  mockRegisterStart,
  mockRegisterFinish,
  mockAuthStart,
  mockAuthFinish,
} from '../services/mockServer';
import type {
  RegistrationOptionsResponse,
  AuthenticationOptionsResponse,
  RegistrationCredential,
  AuthenticationCredential,
  RegistrationResult,
  AuthenticationResult,
} from '../types/webauthn';
import type { RegisterStartRequest, AuthStartRequest } from '../types/api';

/**
 * FIDO2 API 훅
 *
 * Mock 서버와 실제 서버를 자동으로 전환하며,
 * Passkey 등록 및 인증을 위한 통합 인터페이스를 제공합니다.
 *
 * @returns {Object} FIDO2 API 함수들과 현재 모드 정보
 * @returns {Function} registerStart - Passkey 등록 시작
 * @returns {Function} registerFinish - Passkey 등록 완료
 * @returns {Function} authStart - Passkey 인증 시작
 * @returns {Function} authFinish - Passkey 인증 완료
 * @returns {boolean} isMockMode - 현재 Mock 모드 여부
 *
 * @example
 * ```typescript
 * const api = useFido2Api();
 *
 * // 등록
 * const options = await api.registerStart({ username: 'user@example.com' });
 * const result = await api.registerFinish(credential);
 *
 * // 인증
 * const authOptions = await api.authStart({ username: 'user@example.com' });
 * const authResult = await api.authFinish(credential);
 *
 * // Mock 모드 확인
 * if (api.isMockMode) {
 *   console.log('현재 Mock 모드로 실행 중');
 * }
 * ```
 */
export function useFido2Api() {
  const { config } = useConfig();

  /**
   * 실제 API 클라이언트 설정 동기화
   *
   * useEffect를 사용하여 serverUrl과 timeout이 변경될 때만
   * API 설정을 업데이트합니다. 이렇게 하면 렌더링 중에
   * 사이드 이펙트가 발생하지 않습니다.
   *
   * 성능 최적화:
   * - 렌더링 중 불필요한 함수 호출 방지
   * - 정확한 의존성 지정으로 최소한의 업데이트만 수행
   *
   * @see services/api.ts:setApiConfig
   */
  useEffect(() => {
    setApiConfig({
      baseUrl: config.serverUrl,
      timeout: config.timeout,
    });
  }, [config.serverUrl, config.timeout]);

  /**
   * Passkey 등록 시작
   *
   * 사용자 정보를 받아 WebAuthn 등록 옵션을 생성합니다.
   * Mock 모드에서는 localStorage를 사용하고,
   * 실제 서버 모드에서는 백엔드 API를 호출합니다.
   *
   * @param {RegisterStartRequest} request - 등록 요청 (username, displayName)
   * @returns {Promise<RegistrationOptionsResponse>} WebAuthn 등록 옵션
   *
   * @throws {Error} 서버 연결 실패 또는 잘못된 요청
   *
   * @example
   * ```typescript
   * const options = await registerStart({
   *   username: 'user@example.com',
   *   displayName: '홍길동'
   * });
   * // options.challenge, options.user, options.pubKeyCredParams 등
   * ```
   *
   * 반환되는 옵션:
   * - challenge: 서버가 생성한 랜덤 챌린지 (Base64Url)
   * - rp: Relying Party 정보 (이름, ID)
   * - user: 사용자 정보 (ID, 이름, displayName)
   * - pubKeyCredParams: 지원하는 공개키 알고리즘 목록
   * - timeout: 타임아웃 (밀리초)
   * - authenticatorSelection: 인증자 선택 조건
   */
  const handleRegisterStart = useCallback(
    async (request: RegisterStartRequest): Promise<RegistrationOptionsResponse> => {
      if (config.useMockServer) {
        // Mock 모드: localStorage 기반 Mock 서버 사용
        return mockRegisterStart(request);
      }
      // 실제 서버 모드: POST /api/passkey/register/start
      return registerStart(request);
    },
    [config.useMockServer]
  );

  /**
   * Passkey 등록 완료
   *
   * 브라우저에서 생성한 자격 증명을 서버로 전송하여 등록을 완료합니다.
   * 서버는 자격 증명을 검증하고 저장합니다.
   *
   * @param {RegistrationCredential} credential - 브라우저가 생성한 자격 증명
   * @returns {Promise<RegistrationResult>} 등록 결과
   *
   * @throws {Error} 서버 검증 실패 또는 네트워크 오류
   *
   * @example
   * ```typescript
   * // WebAuthn API로 자격 증명 생성 후
   * const result = await registerFinish(credential);
   * if (result.success) {
   *   console.log('등록 성공:', result.username);
   *   navigate('/dashboard');
   * } else {
   *   console.error('등록 실패:', result.message);
   * }
   * ```
   *
   * credential 구조:
   * - id: 자격 증명 ID (Base64Url)
   * - rawId: 자격 증명 ID (Base64Url)
   * - type: 'public-key'
   * - response: attestationObject, clientDataJSON 등
   */
  const handleRegisterFinish = useCallback(
    async (credential: RegistrationCredential): Promise<RegistrationResult> => {
      if (config.useMockServer) {
        // Mock 모드: localStorage에 저장
        return mockRegisterFinish(credential);
      }
      // 실제 서버 모드: POST /api/passkey/register/finish
      return registerFinish(credential);
    },
    [config.useMockServer]
  );

  /**
   * Passkey 인증 시작
   *
   * 사용자를 인증하기 위한 WebAuthn 챌린지를 생성합니다.
   * username을 제공하면 해당 사용자의 자격 증명만 허용하고,
   * 제공하지 않으면 모든 자격 증명을 허용합니다 (Discoverable Credential).
   *
   * @param {AuthStartRequest} request - 인증 요청 (username은 선택사항)
   * @returns {Promise<AuthenticationOptionsResponse>} WebAuthn 인증 옵션
   *
   * @throws {Error} 사용자를 찾을 수 없거나 서버 오류
   *
   * @example
   * ```typescript
   * // 특정 사용자 인증
   * const options = await authStart({ username: 'user@example.com' });
   *
   * // 또는 Passkey 선택 (Discoverable)
   * const options = await authStart({});
   * ```
   *
   * 반환되는 옵션:
   * - challenge: 서버가 생성한 랜덤 챌린지
   * - allowCredentials: 허용된 자격 증명 목록 (username 제공 시)
   * - userVerification: 사용자 검증 요구 수준
   * - timeout: 타임아웃
   */
  const handleAuthStart = useCallback(
    async (request: AuthStartRequest = {}): Promise<AuthenticationOptionsResponse> => {
      if (config.useMockServer) {
        // Mock 모드: localStorage에서 자격 증명 조회
        return mockAuthStart(request);
      }
      // 실제 서버 모드: POST /api/passkey/auth/start
      return authStart(request);
    },
    [config.useMockServer]
  );

  /**
   * Passkey 인증 완료
   *
   * 브라우저에서 생성한 인증 응답을 서버로 전송하여 인증을 완료합니다.
   * 서버는 서명을 검증하고 세션을 생성합니다.
   *
   * @param {AuthenticationCredential} credential - 브라우저가 생성한 인증 응답
   * @returns {Promise<AuthenticationResult>} 인증 결과
   *
   * @throws {Error} 서버 검증 실패 또는 네트워크 오류
   *
   * @example
   * ```typescript
   * // WebAuthn API로 인증 응답 생성 후
   * const result = await authFinish(credential);
   * if (result.success) {
   *   console.log('인증 성공:', result.username);
   *   // 세션 토큰 저장
   *   if (result.sessionToken) {
   *     localStorage.setItem('token', result.sessionToken);
   *   }
   *   navigate('/dashboard');
   * } else {
   *   console.error('인증 실패:', result.message);
   * }
   * ```
   *
   * credential 구조:
   * - id: 자격 증명 ID
   * - rawId: 자격 증명 ID
   * - type: 'public-key'
   * - response: authenticatorData, signature, userHandle 등
   *
   * 서버 검증 항목:
   * - 서명 검증 (공개키 사용)
   * - Challenge 검증 (일회용)
   * - Counter 검증 (Replay 공격 방지)
   * - Origin 검증 (도메인 확인)
   */
  const handleAuthFinish = useCallback(
    async (credential: AuthenticationCredential): Promise<AuthenticationResult> => {
      if (config.useMockServer) {
        // Mock 모드: localStorage에서 검증
        return mockAuthFinish(credential);
      }
      // 실제 서버 모드: POST /api/passkey/auth/finish
      return authFinish(credential);
    },
    [config.useMockServer]
  );

  /**
   * API 함수들과 현재 모드 정보 반환
   *
   * 모든 함수는 useCallback으로 메모이제이션되어 있어
   * useMockServer가 변경되지 않는 한 동일한 함수 참조를 유지합니다.
   * 이는 이 훅을 사용하는 컴포넌트의 불필요한 리렌더링을 방지합니다.
   *
   * 성능 최적화 효과:
   * - 의존성 배열이 변경되지 않으면 함수 재생성 안 함
   * - 자식 컴포넌트에 props로 전달해도 안전
   * - useEffect의 의존성으로 사용해도 무한 루프 방지
   */
  return {
    registerStart: handleRegisterStart,
    registerFinish: handleRegisterFinish,
    authStart: handleAuthStart,
    authFinish: handleAuthFinish,
    isMockMode: config.useMockServer,
  };
}
