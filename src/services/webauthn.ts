/**
 * @fileoverview WebAuthn 서비스 계층 - 브라우저 WebAuthn API 래핑
 *
 * 이 모듈은 브라우저의 navigator.credentials API를 래핑하여
 * FIDO2 Passkey 등록 및 인증 기능을 제공합니다.
 *
 * 주요 기능:
 * - WebAuthn 지원 여부 감지
 * - 서버 옵션을 브라우저 API 형식으로 변환
 * - Passkey 생성 (등록)
 * - Passkey 검증 (인증)
 * - Base64Url 인코딩/디코딩 (바이너리 데이터 처리)
 * - 에러 메시지 한국어 변환
 *
 * WebAuthn 기본 개념:
 * - Challenge: 서버가 생성한 일회용 난수 (Replay 공격 방지)
 * - Credential: 공개키 자격 증명 (기기에 저장됨)
 * - Attestation: 등록 시 인증기의 신뢰성 증명
 * - Assertion: 인증 시 개인키로 서명한 응답
 * - RP (Relying Party): 서비스 제공자 (이 애플리케이션)
 *
 * 보안 고려사항:
 * - HTTPS 필수 (localhost 제외)
 * - 생체 정보는 절대 서버로 전송되지 않음
 * - 개인키는 기기의 보안 영역에만 저장됨
 * - 공개키만 서버에 저장되어 인증에 사용됨
 *
 * @module webauthn
 * @author CROSSCERT
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // 1. 지원 여부 확인
 * if (!isWebAuthnSupported()) {
 *   console.error('WebAuthn을 지원하지 않는 브라우저입니다.');
 *   return;
 * }
 *
 * // 2. 등록
 * const serverOptions = await fetch('/api/passkey/register/start').then(r => r.json());
 * const webauthnOptions = convertRegistrationOptions(serverOptions);
 * const credential = await createCredential(webauthnOptions);
 *
 * // 3. 인증
 * const authOptions = await fetch('/api/passkey/auth/start').then(r => r.json());
 * const webauthnAuthOptions = convertAuthenticationOptions(authOptions);
 * const assertion = await getCredential(webauthnAuthOptions);
 * ```
 */

import type {
  RegistrationOptionsResponse,
  AuthenticationOptionsResponse,
  RegistrationCredential,
  AuthenticationCredential,
} from '../types/webauthn';
import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
} from './encoding';

/**
 * WebAuthn 지원 여부 확인
 *
 * 브라우저가 Web Authentication API (WebAuthn)를 지원하는지 검사합니다.
 * PublicKeyCredential API의 존재 여부를 확인하여 판단합니다.
 *
 * 동작 원리:
 * - window.PublicKeyCredential이 정의되어 있는지 확인
 * - PublicKeyCredential이 함수 타입인지 확인
 * - 두 조건을 모두 만족하면 WebAuthn 지원으로 판단
 *
 * 브라우저 지원:
 * - Chrome 67+ ✅
 * - Edge 79+ ✅
 * - Safari 14+ ✅
 * - Firefox 60+ ✅
 *
 * @returns {boolean} WebAuthn을 지원하면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (!isWebAuthnSupported()) {
 *   alert('이 브라우저는 Passkey를 지원하지 않습니다.');
 *   return;
 * }
 * // WebAuthn 기능 사용 가능
 * ```
 *
 * @example
 * ```typescript
 * // 사용자에게 안내 메시지 표시
 * function checkCompatibility() {
 *   if (!isWebAuthnSupported()) {
 *     showErrorMessage(
 *       'Passkey 기능을 사용하려면 최신 브라우저로 업데이트하세요.',
 *       'Chrome 67+, Safari 14+, Edge 79+, Firefox 60+ 이상'
 *     );
 *     return false;
 *   }
 *   return true;
 * }
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential
 */
export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Platform Authenticator 사용 가능 여부 확인
 *
 * 기기에 내장된 생체 인증 기능 (Touch ID, Face ID, Windows Hello 등)을
 * 사용할 수 있는지 확인합니다. 이는 사용자가 외부 보안 키 없이
 * 기기 자체의 생체 인증으로 Passkey를 생성/사용할 수 있는지를 나타냅니다.
 *
 * Platform Authenticator 종류:
 * - macOS/iOS: Touch ID, Face ID
 * - Windows: Windows Hello (얼굴 인식, 지문, PIN)
 * - Android: 지문, 얼굴 인식, 패턴
 *
 * 동작 원리:
 * 1. WebAuthn 지원 여부를 먼저 확인
 * 2. PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() 호출
 * 3. 사용 가능하면 true, 아니면 false 반환
 *
 * 주의사항:
 * - 이 함수가 true를 반환해도 사용자가 생체 인증을 설정하지 않았을 수 있음
 * - 실제 인증 시도 시 사용자에게 설정을 요구할 수 있음
 * - 네트워크 연결이 필요하지 않음 (로컬 확인)
 *
 * @returns {Promise<boolean>} Platform Authenticator를 사용할 수 있으면 true
 *
 * @example
 * ```typescript
 * const available = await isPlatformAuthenticatorAvailable();
 * if (available) {
 *   console.log('이 기기에서 생체 인증을 사용할 수 있습니다.');
 *   // Passkey 등록 UI 표시
 * } else {
 *   console.log('이 기기는 생체 인증을 지원하지 않습니다.');
 *   // 외부 보안 키 사용 안내 또는 다른 인증 방법 제시
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 회원가입 페이지에서 사용
 * async function checkDeviceCapability() {
 *   if (!isWebAuthnSupported()) {
 *     return 'unsupported';
 *   }
 *
 *   const platformAuth = await isPlatformAuthenticatorAvailable();
 *   if (platformAuth) {
 *     return 'biometric'; // Touch ID, Face ID 사용 가능
 *   }
 *
 *   return 'security-key'; // 외부 USB 키만 사용 가능
 * }
 * ```
 *
 * @see https://www.w3.org/TR/webauthn/#dom-publickeycredential-isuserverifyingplatformauthenticatoravailable
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * 조건부 UI (Conditional UI) 지원 여부 확인
 *
 * Passkey 자동 완성 기능을 사용할 수 있는지 확인합니다.
 * 조건부 UI는 입력 필드에서 브라우저의 자동 완성 UI를 통해
 * Passkey를 선택할 수 있게 하는 기능입니다.
 *
 * Conditional UI 동작 방식:
 * 1. 사용자가 이메일 입력 필드를 클릭
 * 2. 브라우저가 저장된 Passkey 목록을 드롭다운으로 표시
 * 3. 사용자가 Passkey를 선택하면 즉시 인증 진행
 * 4. 별도의 "로그인" 버튼 클릭 불필요
 *
 * 브라우저 지원:
 * - Chrome 108+ ✅
 * - Safari 16+ ✅
 * - Edge 108+ ✅
 * - Firefox: 아직 미지원 ⚠️
 *
 * 주의사항:
 * - 최신 브라우저에서만 지원되는 실험적 기능
 * - 지원하지 않는 브라우저에서는 false 반환
 * - 타입 캐스팅을 사용하여 안전하게 확인
 *
 * @returns {Promise<boolean>} Conditional UI를 지원하면 true
 *
 * @example
 * ```typescript
 * const conditionalUI = await isConditionalMediationAvailable();
 * if (conditionalUI) {
 *   // 이메일 입력 필드에 autocomplete="webauthn" 속성 추가
 *   // 사용자가 필드를 클릭하면 Passkey 자동 완성 표시
 *   console.log('Passkey 자동 완성 기능 사용 가능');
 * } else {
 *   // 전통적인 방식: 별도의 "Passkey로 로그인" 버튼 표시
 *   console.log('일반 로그인 버튼 사용');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 로그인 페이지에서 최적의 UX 제공
 * async function setupLoginForm() {
 *   const input = document.querySelector('input[type="email"]');
 *
 *   if (await isConditionalMediationAvailable()) {
 *     // Conditional UI 지원: 자동 완성 활성화
 *     input.setAttribute('autocomplete', 'webauthn');
 *
 *     // 백그라운드에서 Passkey 요청 시작 (modal=false)
 *     navigator.credentials.get({
 *       publicKey: options,
 *       mediation: 'conditional', // 핵심 옵션
 *     });
 *   } else {
 *     // Conditional UI 미지원: 일반 버튼 표시
 *     showPasskeyButton();
 *   }
 * }
 * ```
 *
 * @see https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Conditional-UI
 */
export async function isConditionalMediationAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    // isConditionalMediationAvailable는 아직 모든 브라우저에서 지원되지 않음
    const pkc = PublicKeyCredential as typeof PublicKeyCredential & {
      isConditionalMediationAvailable?: () => Promise<boolean>;
    };
    if (pkc.isConditionalMediationAvailable) {
      return await pkc.isConditionalMediationAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 서버 옵션을 WebAuthn API 형식으로 변환 (등록용)
 *
 * 서버에서 받은 Passkey 등록 옵션을 브라우저의
 * navigator.credentials.create() API가 요구하는 형식으로 변환합니다.
 * 주요 변환 작업은 Base64Url 문자열을 ArrayBuffer로 디코딩하는 것입니다.
 *
 * 변환되는 주요 필드:
 * - challenge: Base64Url → ArrayBuffer (서버가 생성한 난수)
 * - user.id: Base64Url → ArrayBuffer (사용자 고유 ID)
 * - excludeCredentials[].id: Base64Url → ArrayBuffer (중복 방지용)
 *
 * WebAuthn 등록 옵션 구조:
 * - rp: Relying Party 정보 (서비스 이름, 도메인)
 * - user: 사용자 정보 (ID, 이름, 표시 이름)
 * - challenge: 서버가 생성한 일회용 챌린지
 * - pubKeyCredParams: 지원하는 공개키 알고리즘 (-7: ES256, -257: RS256)
 * - timeout: 사용자 응답 대기 시간 (밀리초)
 * - attestation: 인증기 증명 수준 ('none', 'indirect', 'direct')
 * - authenticatorSelection: 인증기 선택 조건
 * - excludeCredentials: 중복 등록 방지를 위한 기존 자격 증명 목록
 *
 * @param {RegistrationOptionsResponse} serverOptions - 서버에서 받은 등록 옵션
 * @returns {PublicKeyCredentialCreationOptions} 브라우저 API용 옵션
 *
 * @example
 * ```typescript
 * // 1. 서버에서 등록 옵션 가져오기
 * const serverOptions = await fetch('/api/passkey/register/start', {
 *   method: 'POST',
 *   body: JSON.stringify({ username: 'user@example.com' }),
 * }).then(r => r.json());
 *
 * // 2. 브라우저 API 형식으로 변환
 * const webauthnOptions = convertRegistrationOptions(serverOptions);
 *
 * // 3. Passkey 생성
 * const credential = await createCredential(webauthnOptions);
 * ```
 *
 * @example
 * ```typescript
 * // 서버 응답 예시
 * const serverOptions = {
 *   challenge: "dGVzdC1jaGFsbGVuZ2U",  // Base64Url 문자열
 *   rp: { name: "CROSSCERT", id: "example.com" },
 *   user: {
 *     id: "dXNlci0xMjM",              // Base64Url → ArrayBuffer 변환 필요
 *     name: "user@example.com",
 *     displayName: "홍길동"
 *   },
 *   pubKeyCredParams: [
 *     { type: "public-key", alg: -7 },  // ES256
 *     { type: "public-key", alg: -257 } // RS256
 *   ],
 *   timeout: 60000,
 *   attestation: "none"
 * };
 *
 * const options = convertRegistrationOptions(serverOptions);
 * // options.challenge는 이제 ArrayBuffer
 * // options.user.id도 ArrayBuffer
 * ```
 *
 * @see https://www.w3.org/TR/webauthn/#dictdef-publickeycredentialcreationoptions
 */
export function convertRegistrationOptions(
  serverOptions: RegistrationOptionsResponse
): PublicKeyCredentialCreationOptions {
  const options: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToArrayBuffer(serverOptions.challenge),
    rp: serverOptions.rp,
    user: {
      id: base64UrlToArrayBuffer(serverOptions.user.id),
      name: serverOptions.user.name,
      displayName: serverOptions.user.displayName,
    },
    pubKeyCredParams: serverOptions.pubKeyCredParams,
    timeout: serverOptions.timeout,
    attestation: serverOptions.attestation || 'none',
  };

  if (serverOptions.authenticatorSelection) {
    options.authenticatorSelection = serverOptions.authenticatorSelection;
  }

  if (serverOptions.excludeCredentials) {
    options.excludeCredentials = serverOptions.excludeCredentials.map((cred) => ({
      type: cred.type,
      id: base64UrlToArrayBuffer(cred.id),
      transports: cred.transports,
    }));
  }

  return options;
}

/**
 * 서버 옵션을 WebAuthn API 형식으로 변환 (인증용)
 *
 * 서버에서 받은 Passkey 인증 옵션을 브라우저의
 * navigator.credentials.get() API가 요구하는 형식으로 변환합니다.
 * 주요 변환 작업은 Base64Url 문자열을 ArrayBuffer로 디코딩하는 것입니다.
 *
 * 변환되는 주요 필드:
 * - challenge: Base64Url → ArrayBuffer (서버가 생성한 난수)
 * - allowCredentials[].id: Base64Url → ArrayBuffer (허용된 자격 증명 ID)
 *
 * WebAuthn 인증 옵션 구조:
 * - challenge: 서버가 생성한 일회용 챌린지
 * - rpId: Relying Party ID (도메인, 예: "example.com")
 * - timeout: 사용자 응답 대기 시간 (밀리초)
 * - userVerification: 사용자 검증 수준
 *   - 'required': 생체 인증 필수
 *   - 'preferred': 가능하면 생체 인증 (기본값)
 *   - 'discouraged': 생체 인증 불필요
 * - allowCredentials: 허용된 자격 증명 목록 (특정 사용자 지정 시)
 *   - 비어있으면 Discoverable Credential (아무 Passkey나 사용 가능)
 *
 * Discoverable Credential vs Specific Credential:
 * - allowCredentials가 비어있으면: 사용자가 저장된 모든 Passkey 중 선택
 * - allowCredentials가 있으면: 해당 사용자의 Passkey만 허용
 *
 * @param {AuthenticationOptionsResponse} serverOptions - 서버에서 받은 인증 옵션
 * @returns {PublicKeyCredentialRequestOptions} 브라우저 API용 옵션
 *
 * @example
 * ```typescript
 * // 특정 사용자 인증 (이메일 입력 후)
 * const serverOptions = await fetch('/api/passkey/auth/start', {
 *   method: 'POST',
 *   body: JSON.stringify({ username: 'user@example.com' }),
 * }).then(r => r.json());
 *
 * const webauthnOptions = convertAuthenticationOptions(serverOptions);
 * const credential = await getCredential(webauthnOptions);
 * ```
 *
 * @example
 * ```typescript
 * // Discoverable Credential (사용자 선택)
 * const serverOptions = await fetch('/api/passkey/auth/start', {
 *   method: 'POST',
 *   body: JSON.stringify({}), // username 없음
 * }).then(r => r.json());
 *
 * // serverOptions.allowCredentials는 빈 배열 또는 undefined
 * const webauthnOptions = convertAuthenticationOptions(serverOptions);
 * const credential = await getCredential(webauthnOptions);
 * // 브라우저가 사용자에게 저장된 Passkey 목록 표시
 * ```
 *
 * @example
 * ```typescript
 * // 서버 응답 예시
 * const serverOptions = {
 *   challenge: "YXV0aC1jaGFsbGVuZ2U",
 *   rpId: "example.com",
 *   timeout: 60000,
 *   userVerification: "preferred",
 *   allowCredentials: [
 *     {
 *       type: "public-key",
 *       id: "Y3JlZC0xMjM",  // Base64Url → ArrayBuffer 변환 필요
 *       transports: ["internal", "hybrid"]
 *     }
 *   ]
 * };
 *
 * const options = convertAuthenticationOptions(serverOptions);
 * // options.challenge는 ArrayBuffer
 * // options.allowCredentials[0].id도 ArrayBuffer
 * ```
 *
 * @see https://www.w3.org/TR/webauthn/#dictdef-publickeycredentialrequestoptions
 */
export function convertAuthenticationOptions(
  serverOptions: AuthenticationOptionsResponse
): PublicKeyCredentialRequestOptions {
  const options: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToArrayBuffer(serverOptions.challenge),
    timeout: serverOptions.timeout,
    rpId: serverOptions.rpId,
    userVerification: serverOptions.userVerification || 'preferred',
  };

  if (serverOptions.allowCredentials) {
    options.allowCredentials = serverOptions.allowCredentials.map((cred) => ({
      type: cred.type,
      id: base64UrlToArrayBuffer(cred.id),
      transports: cred.transports,
    }));
  }

  return options;
}

/**
 * Passkey 등록 (Credential 생성)
 *
 * 브라우저의 WebAuthn API를 사용하여 새로운 Passkey를 생성합니다.
 * 이 함수는 사용자에게 생체 인증을 요청하는 브라우저 UI를 표시하고,
 * 인증 성공 시 공개키 자격 증명을 생성합니다.
 *
 * 동작 과정:
 * 1. navigator.credentials.create() 호출
 * 2. 브라우저가 생체 인증 UI 표시 (Touch ID, Face ID 등)
 * 3. 사용자가 생체 인증 수행
 * 4. 기기의 보안 영역에 개인키 저장 (외부로 절대 노출 안 됨)
 * 5. 공개키와 attestation 데이터 반환
 * 6. ArrayBuffer를 Base64Url로 인코딩하여 서버 전송 가능하게 변환
 *
 * 반환되는 Credential 구조:
 * - id: 자격 증명 ID (Base64Url 인코딩)
 * - rawId: 자격 증명 ID의 원본 (Base64Url 인코딩)
 * - response.clientDataJSON: 클라이언트 데이터 (origin, challenge 등)
 * - response.attestationObject: 인증기의 증명 객체 (공개키 포함)
 * - type: 항상 'public-key'
 * - clientExtensionResults: 확장 기능 결과 (선택적)
 * - authenticatorAttachment: 인증기 연결 방식 ('platform' 또는 'cross-platform')
 *
 * 보안 고려사항:
 * - 개인키는 절대 JavaScript나 서버로 노출되지 않음
 * - 공개키만 서버에 저장되어 나중에 서명 검증에 사용됨
 * - HTTPS 필수 (localhost 제외)
 * - 사용자 제스처(버튼 클릭 등)에 의해서만 호출 가능
 *
 * @param {PublicKeyCredentialCreationOptions} options - WebAuthn 등록 옵션
 * @returns {Promise<RegistrationCredential>} 생성된 자격 증명 (서버 전송용)
 *
 * @throws {Error} Credential 생성 실패 시
 * @throws {DOMException} 다양한 WebAuthn 에러 발생 시
 *   - NotAllowedError: 사용자 취소 또는 타임아웃
 *   - InvalidStateError: 이미 등록된 자격 증명
 *   - NotSupportedError: 지원하지 않는 알고리즘
 *   - SecurityError: HTTPS가 아니거나 도메인 불일치
 *
 * @example
 * ```typescript
 * try {
 *   // 1. 서버에서 옵션 가져오기
 *   const serverOptions = await fetch('/api/passkey/register/start', {
 *     method: 'POST',
 *     body: JSON.stringify({ username: 'user@example.com' }),
 *   }).then(r => r.json());
 *
 *   // 2. WebAuthn 형식으로 변환
 *   const options = convertRegistrationOptions(serverOptions);
 *
 *   // 3. Passkey 생성 (생체 인증 UI 표시)
 *   const credential = await createCredential(options);
 *
 *   // 4. 서버에 등록 완료 요청
 *   const result = await fetch('/api/passkey/register/finish', {
 *     method: 'POST',
 *     body: JSON.stringify(credential),
 *   }).then(r => r.json());
 *
 *   console.log('Passkey 등록 완료:', result);
 * } catch (error) {
 *   console.error('Passkey 등록 실패:', getWebAuthnErrorMessage(error));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 에러 처리 예시
 * async function handlePasskeyRegistration(options) {
 *   try {
 *     const credential = await createCredential(options);
 *     return { success: true, credential };
 *   } catch (error) {
 *     if (error instanceof DOMException) {
 *       if (error.name === 'NotAllowedError') {
 *         return { success: false, message: '사용자가 등록을 취소했습니다.' };
 *       }
 *       if (error.name === 'InvalidStateError') {
 *         return { success: false, message: '이미 등록된 Passkey가 있습니다.' };
 *       }
 *     }
 *     return { success: false, message: getWebAuthnErrorMessage(error) };
 *   }
 * }
 * ```
 *
 * @see https://www.w3.org/TR/webauthn/#sctn-createCredential
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/create
 */
export async function createCredential(
  options: PublicKeyCredentialCreationOptions
): Promise<RegistrationCredential> {
  const credential = await navigator.credentials.create({
    publicKey: options,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Credential 생성 실패');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64Url(response.attestationObject),
    },
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
}

/**
 * Passkey 인증 (Assertion 획득)
 *
 * 브라우저의 WebAuthn API를 사용하여 기존 Passkey로 인증합니다.
 * 이 함수는 사용자에게 생체 인증을 요청하는 브라우저 UI를 표시하고,
 * 인증 성공 시 서버가 검증할 수 있는 서명된 응답(Assertion)을 반환합니다.
 *
 * 동작 과정:
 * 1. navigator.credentials.get() 호출
 * 2. 브라우저가 저장된 Passkey 목록 표시 (또는 특정 Passkey 선택)
 * 3. 사용자가 Passkey를 선택하고 생체 인증 수행
 * 4. 기기의 보안 영역에 저장된 개인키로 challenge 서명
 * 5. 서명과 authenticatorData를 포함한 Assertion 반환
 * 6. ArrayBuffer를 Base64Url로 인코딩하여 서버 전송 가능하게 변환
 *
 * 반환되는 Credential 구조:
 * - id: 사용된 자격 증명 ID (Base64Url 인코딩)
 * - rawId: 자격 증명 ID의 원본 (Base64Url 인코딩)
 * - response.clientDataJSON: 클라이언트 데이터 (origin, challenge 등)
 * - response.authenticatorData: 인증기 데이터 (RP ID hash, counter 등)
 * - response.signature: 개인키로 서명한 값 (서버가 공개키로 검증)
 * - response.userHandle: 사용자 ID (Discoverable Credential 시)
 * - type: 항상 'public-key'
 * - clientExtensionResults: 확장 기능 결과 (선택적)
 * - authenticatorAttachment: 인증기 연결 방식
 *
 * 서버 검증 항목:
 * - signature 검증: 저장된 공개키로 서명 확인
 * - challenge 검증: 서버가 생성한 challenge인지 확인 (Replay 공격 방지)
 * - origin 검증: clientDataJSON의 origin이 예상 도메인인지 확인 (피싱 방지)
 * - counter 검증: authenticatorData의 counter가 증가했는지 확인 (복제 방지)
 *
 * 보안 고려사항:
 * - 개인키는 절대 노출되지 않고, 서명만 전송됨
 * - challenge는 일회용이므로 재사용 불가능
 * - origin이 도메인에 바인딩되어 피싱 사이트에서 사용 불가능
 * - HTTPS 필수 (localhost 제외)
 *
 * @param {PublicKeyCredentialRequestOptions} options - WebAuthn 인증 옵션
 * @returns {Promise<AuthenticationCredential>} 인증 응답 (서버 검증용)
 *
 * @throws {Error} Credential 획득 실패 시
 * @throws {DOMException} 다양한 WebAuthn 에러 발생 시
 *   - NotAllowedError: 사용자 취소 또는 타임아웃
 *   - SecurityError: HTTPS가 아니거나 도메인 불일치
 *   - NotFoundError: 해당 사용자의 Passkey를 찾을 수 없음
 *
 * @example
 * ```typescript
 * try {
 *   // 1. 서버에서 인증 옵션 가져오기
 *   const serverOptions = await fetch('/api/passkey/auth/start', {
 *     method: 'POST',
 *     body: JSON.stringify({ username: 'user@example.com' }),
 *   }).then(r => r.json());
 *
 *   // 2. WebAuthn 형식으로 변환
 *   const options = convertAuthenticationOptions(serverOptions);
 *
 *   // 3. Passkey 인증 (생체 인증 UI 표시)
 *   const credential = await getCredential(options);
 *
 *   // 4. 서버에 인증 완료 요청
 *   const result = await fetch('/api/passkey/auth/finish', {
 *     method: 'POST',
 *     body: JSON.stringify(credential),
 *   }).then(r => r.json());
 *
 *   if (result.success) {
 *     console.log('로그인 성공:', result.username);
 *     // 세션 토큰 저장, 페이지 이동 등
 *   }
 * } catch (error) {
 *   console.error('인증 실패:', getWebAuthnErrorMessage(error));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Discoverable Credential (사용자 선택)
 * async function loginWithPasskey() {
 *   try {
 *     const serverOptions = await fetch('/api/passkey/auth/start', {
 *       method: 'POST',
 *       body: JSON.stringify({}), // username 없음
 *     }).then(r => r.json());
 *
 *     const options = convertAuthenticationOptions(serverOptions);
 *     // options.allowCredentials가 비어있으면 모든 Passkey 표시
 *
 *     const credential = await getCredential(options);
 *     // credential.response.userHandle에서 사용자 ID 확인 가능
 *
 *     const result = await fetch('/api/passkey/auth/finish', {
 *       method: 'POST',
 *       body: JSON.stringify(credential),
 *     }).then(r => r.json());
 *
 *     return result;
 *   } catch (error) {
 *     if (error instanceof DOMException && error.name === 'NotAllowedError') {
 *       console.log('사용자가 인증을 취소했습니다.');
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Conditional UI (자동 완성)와 함께 사용
 * async function setupConditionalUI(options) {
 *   try {
 *     // mediation: 'conditional'로 설정하면
 *     // 입력 필드에서 자동 완성으로 Passkey 선택 가능
 *     const credential = await navigator.credentials.get({
 *       publicKey: options,
 *       mediation: 'conditional',
 *     });
 *
 *     // 사용자가 Passkey를 선택하면 자동으로 credential 반환
 *     return credential;
 *   } catch (error) {
 *     console.error('Conditional UI 실패:', error);
 *   }
 * }
 * ```
 *
 * @see https://www.w3.org/TR/webauthn/#sctn-getAssertion
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get
 */
export async function getCredential(
  options: PublicKeyCredentialRequestOptions
): Promise<AuthenticationCredential> {
  const credential = await navigator.credentials.get({
    publicKey: options,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Credential 획득 실패');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
      signature: arrayBufferToBase64Url(response.signature),
      userHandle: response.userHandle
        ? arrayBufferToBase64Url(response.userHandle)
        : undefined,
    },
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
}

/**
 * WebAuthn 에러 메시지 변환
 *
 * WebAuthn API에서 발생하는 DOMException을 사용자 친화적인
 * 한국어 메시지로 변환합니다. 이는 사용자에게 명확한 오류 원인과
 * 해결 방법을 제시하기 위해 사용됩니다.
 *
 * 주요 에러 타입:
 *
 * - **NotAllowedError**: 가장 흔한 에러
 *   - 사용자가 생체 인증 취소
 *   - 타임아웃 (기본 60초)
 *   - 사용자 제스처 없이 API 호출 (보안 정책)
 *
 * - **InvalidStateError**: 중복 등록 시도
 *   - excludeCredentials에 포함된 자격 증명 재등록 시도
 *   - 해결: 기존 Passkey 삭제 후 재등록
 *
 * - **NotSupportedError**: 브라우저/기기 미지원
 *   - 요청한 공개키 알고리즘 미지원
 *   - Platform Authenticator 미지원
 *   - 해결: 다른 인증 방법 제공
 *
 * - **SecurityError**: 보안 정책 위반
 *   - HTTP 사용 (HTTPS 필수, localhost 제외)
 *   - 도메인 불일치
 *   - 해결: HTTPS 활성화 또는 도메인 설정 확인
 *
 * - **AbortError**: 인증 프로세스 중단
 *   - 프로그래밍 방식으로 중단 (AbortController 사용 시)
 *   - 새로운 인증 요청으로 이전 요청 취소
 *
 * - **NotFoundError**: Passkey 없음 (인증 시)
 *   - 해당 사용자의 Passkey를 찾을 수 없음
 *   - 해결: 회원가입 유도 또는 다른 로그인 방법 제공
 *
 * 에러 처리 모범 사례:
 * - 사용자에게 구체적이고 실행 가능한 메시지 표시
 * - 필요시 대체 인증 방법 제공
 * - 개발 환경에서는 원본 에러도 함께 로깅
 * - 프로덕션에서는 사용자 친화적 메시지만 표시
 *
 * @param {unknown} error - WebAuthn API에서 발생한 에러
 * @returns {string} 사용자 친화적인 한국어 에러 메시지
 *
 * @example
 * ```typescript
 * try {
 *   const credential = await createCredential(options);
 * } catch (error) {
 *   const message = getWebAuthnErrorMessage(error);
 *   alert(message); // "사용자가 인증을 취소했거나 시간이 초과되었습니다."
 *
 *   // 개발 환경: 원본 에러도 로깅
 *   if (process.env.NODE_ENV === 'development') {
 *     console.error('WebAuthn error details:', error);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 에러 타입별 처리
 * async function handlePasskeyRegistration() {
 *   try {
 *     const credential = await createCredential(options);
 *     return { success: true, credential };
 *   } catch (error) {
 *     const message = getWebAuthnErrorMessage(error);
 *
 *     if (error instanceof DOMException) {
 *       switch (error.name) {
 *         case 'NotAllowedError':
 *           // 재시도 유도
 *           return {
 *             success: false,
 *             message,
 *             canRetry: true,
 *           };
 *
 *         case 'InvalidStateError':
 *           // 기존 Passkey 삭제 안내
 *           return {
 *             success: false,
 *             message,
 *             action: 'delete-existing',
 *           };
 *
 *         case 'NotSupportedError':
 *           // 대체 인증 방법 제공
 *           return {
 *             success: false,
 *             message,
 *             fallback: 'password',
 *           };
 *
 *         case 'SecurityError':
 *           // HTTPS 안내
 *           return {
 *             success: false,
 *             message,
 *             action: 'check-https',
 *           };
 *       }
 *     }
 *
 *     return { success: false, message };
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 사용자에게 친화적인 UI 표시
 * function showWebAuthnError(error: unknown) {
 *   const message = getWebAuthnErrorMessage(error);
 *
 *   if (error instanceof DOMException && error.name === 'NotAllowedError') {
 *     // 재시도 버튼과 함께 표시
 *     showDialog({
 *       title: '인증 취소',
 *       message,
 *       buttons: [
 *         { label: '다시 시도', action: 'retry' },
 *         { label: '취소', action: 'cancel' },
 *       ],
 *     });
 *   } else {
 *     // 일반 에러 메시지
 *     showToast({ type: 'error', message });
 *   }
 * }
 * ```
 *
 * @see https://www.w3.org/TR/webauthn/#sctn-error-handling
 */
export function getWebAuthnErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return '사용자가 인증을 취소했거나 시간이 초과되었습니다.';
      case 'InvalidStateError':
        return '이미 등록된 인증기가 있습니다.';
      case 'NotSupportedError':
        return '지원되지 않는 인증 방식입니다.';
      case 'SecurityError':
        return '보안 오류가 발생했습니다. HTTPS 연결을 확인하세요.';
      case 'AbortError':
        return '인증이 중단되었습니다.';
      default:
        return `인증 오류: ${error.message}`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}
