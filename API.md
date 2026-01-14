# API 문서

> FIDO2 Passkey 클라이언트의 API 엔드포인트 및 타입 정의

## 목차
1. [FIDO2 API 엔드포인트](#fido2-api-엔드포인트)
2. [타입 정의](#타입-정의)
3. [Mock 서버](#mock-서버)
4. [에러 처리](#에러-처리)

## FIDO2 API 엔드포인트

### 기본 URL
- **개발**: `http://localhost:8080`
- **프로덕션**: 설정에서 지정
- **Mock 모드**: 로컬 (서버 불필요)

### 공통 헤더
```http
Content-Type: application/json
```

---

## 1. Passkey 등록 (Registration)

### 1.1 등록 시작

**엔드포인트**: `POST /api/passkey/register/start`

**설명**: Passkey 등록 프로세스를 시작하고 WebAuthn 챌린지를 받습니다.

**요청 (Request)**:
```json
{
  "username": "user@example.com",
  "displayName": "홍길동"
}
```

**응답 (Response)**:
```json
{
  "challenge": "랜덤_챌린지_base64url",
  "rp": {
    "name": "CROSSCERT",
    "id": "crosscert.com"
  },
  "user": {
    "id": "사용자_ID_base64url",
    "name": "user@example.com",
    "displayName": "홍길동"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },   // ES256
    { "type": "public-key", "alg": -257 }  // RS256
  ],
  "timeout": 60000,
  "attestation": "none",
  "authenticatorSelection": {
    "authenticatorAttachment": "platform",
    "requireResidentKey": false,
    "userVerification": "required"
  }
}
```

**타입**:
```typescript
interface RegisterStartRequest {
  username: string;
  displayName?: string;
}

interface RegistrationOptionsResponse {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}
```

### 1.2 등록 완료

**엔드포인트**: `POST /api/passkey/register/finish`

**설명**: 브라우저에서 생성한 Passkey 자격 증명을 서버로 전송하여 등록을 완료합니다.

**요청 (Request)**:
```json
{
  "id": "자격증명_ID_base64url",
  "rawId": "자격증명_ID_base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "클라이언트_데이터_base64url",
    "attestationObject": "증명_객체_base64url",
    "publicKeyAlgorithm": -7,
    "publicKey": "공개키_base64url",
    "authenticatorData": "인증자_데이터_base64url"
  },
  "authenticatorAttachment": "platform",
  "clientExtensionResults": {}
}
```

**응답 (Response)**:
```json
{
  "success": true,
  "message": "등록이 완료되었습니다",
  "username": "user@example.com",
  "credentialId": "자격증명_ID_base64url"
}
```

**타입**:
```typescript
interface RegistrationCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    attestationObject: string;
    publicKeyAlgorithm?: number;
    publicKey?: string;
    authenticatorData?: string;
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults: Record<string, any>;
}

interface RegistrationResult {
  success: boolean;
  message: string;
  username?: string;
  credentialId?: string;
}
```

---

## 2. Passkey 인증 (Authentication)

### 2.1 인증 시작

**엔드포인트**: `POST /api/passkey/auth/start`

**설명**: Passkey 인증 프로세스를 시작하고 챌린지를 받습니다.

**요청 (Request)**:
```json
{
  "username": "user@example.com"  // 선택사항
}
```

**응답 (Response)**:
```json
{
  "challenge": "랜덤_챌린지_base64url",
  "timeout": 60000,
  "rpId": "crosscert.com",
  "allowCredentials": [
    {
      "type": "public-key",
      "id": "자격증명_ID_base64url",
      "transports": ["internal"]
    }
  ],
  "userVerification": "required"
}
```

**타입**:
```typescript
interface AuthStartRequest {
  username?: string;
}

interface AuthenticationOptionsResponse {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: Array<'usb' | 'nfc' | 'ble' | 'internal'>;
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}
```

### 2.2 인증 완료

**엔드포인트**: `POST /api/passkey/auth/finish`

**설명**: 브라우저에서 생성한 인증 응답을 서버로 전송하여 인증을 완료합니다.

**요청 (Request)**:
```json
{
  "id": "자격증명_ID_base64url",
  "rawId": "자격증명_ID_base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "클라이언트_데이터_base64url",
    "authenticatorData": "인증자_데이터_base64url",
    "signature": "서명_base64url",
    "userHandle": "사용자_핸들_base64url"
  },
  "authenticatorAttachment": "platform",
  "clientExtensionResults": {}
}
```

**응답 (Response)**:
```json
{
  "success": true,
  "message": "인증이 완료되었습니다",
  "username": "user@example.com",
  "sessionToken": "세션_토큰" // 선택사항
}
```

**타입**:
```typescript
interface AuthenticationCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults: Record<string, any>;
}

interface AuthenticationResult {
  success: boolean;
  message: string;
  username?: string;
  sessionToken?: string;
}
```

---

## 타입 정의

### Base64Url 문자열

WebAuthn API는 binary 데이터를 Base64Url 인코딩으로 주고받습니다.

```typescript
// Base64Url 형식: A-Za-z0-9_-
type Base64UrlString = string;

// 변환 함수
function arrayBufferToBase64Url(buffer: ArrayBuffer): Base64UrlString;
function base64UrlToArrayBuffer(base64url: Base64UrlString): ArrayBuffer;
```

### PublicKeyCredential 알고리즘

```typescript
// COSE 알고리즘 식별자
enum COSEAlgorithm {
  ES256 = -7,   // ECDSA with SHA-256
  RS256 = -257, // RSASSA-PKCS1-v1_5 with SHA-256
  PS256 = -37,  // RSASSA-PSS with SHA-256
}
```

### Authenticator 연결 방식

```typescript
type AuthenticatorAttachment =
  | 'platform'        // 기기 내장 (생체 인증)
  | 'cross-platform'; // 외부 보안 키
```

### User Verification

```typescript
type UserVerificationRequirement =
  | 'required'      // 필수 (생체 인증 반드시 수행)
  | 'preferred'     // 선호 (가능하면 수행)
  | 'discouraged';  // 비권장 (수행하지 않음)
```

---

## Mock 서버

Mock 모드에서는 localStorage를 데이터베이스로 사용합니다.

### 데이터 구조

```typescript
interface MockDatabase {
  users: Record<string, MockUser>;
  credentials: Record<string, MockCredential>;
  challenges: Record<string, MockChallenge>;
}

interface MockUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
}

interface MockCredential {
  credentialId: string;
  userId: string;
  publicKey: string;
  counter: number;
  createdAt: number;
  aaguid: string;
  username: string;
  displayName: string;
}

interface MockChallenge {
  challenge: string;
  type: 'registration' | 'authentication';
  userId?: string;
  createdAt: number;
  expiresAt: number;
}
```

### localStorage 키
```
fido2-mock-db
```

### Mock API 동작

#### 1. mockRegisterStart()
```typescript
1. 랜덤 챌린지 생성 (32 bytes)
2. 사용자 ID 생성 (UUID)
3. Challenge를 localStorage에 저장 (60초 만료)
4. RegistrationOptions 반환
```

#### 2. mockRegisterFinish()
```typescript
1. Challenge 검증 (localStorage에서 확인)
2. 자격 증명 저장 (credential ID를 키로 사용)
3. 사용자 저장 (user ID를 키로 사용)
4. Challenge 삭제 (일회용)
5. RegistrationResult 반환
```

#### 3. mockAuthStart()
```typescript
1. 랜덤 챌린지 생성
2. 사용자의 자격 증명 조회
3. Challenge 저장
4. AuthenticationOptions 반환 (allowCredentials 포함)
```

#### 4. mockAuthFinish()
```typescript
1. Challenge 검증
2. 자격 증명 존재 확인
3. Counter 증가 (Replay 공격 방지)
4. Challenge 삭제
5. AuthenticationResult 반환
```

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 의미 | 설명 |
|-----|------|-----|
| 200 | OK | 요청 성공 |
| 400 | Bad Request | 잘못된 요청 (유효성 검사 실패) |
| 401 | Unauthorized | 인증 실패 |
| 404 | Not Found | 사용자 또는 자격 증명 없음 |
| 409 | Conflict | 이미 존재하는 사용자 |
| 500 | Internal Server Error | 서버 오류 |

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적 메시지",
    "details": "개발자를 위한 상세 정보"
  }
}
```

### 에러 코드

```typescript
enum ErrorCode {
  // 일반 에러
  INVALID_REQUEST = 'INVALID_REQUEST',
  SERVER_ERROR = 'SERVER_ERROR',

  // 등록 에러
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_REGISTRATION_DATA = 'INVALID_REGISTRATION_DATA',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',

  // 인증 에러
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',

  // WebAuthn 에러
  WEBAUTHN_NOT_SUPPORTED = 'WEBAUTHN_NOT_SUPPORTED',
  WEBAUTHN_CANCELLED = 'WEBAUTHN_CANCELLED',
  WEBAUTHN_TIMEOUT = 'WEBAUTHN_TIMEOUT',
  WEBAUTHN_INVALID_STATE = 'WEBAUTHN_INVALID_STATE',
}
```

### WebAuthn 에러 매핑

```typescript
// services/webauthn.ts
export function getWebAuthnErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotSupportedError':
        return 'WebAuthn을 지원하지 않는 브라우저입니다.';
      case 'SecurityError':
        return '보안 오류가 발생했습니다. HTTPS를 사용해주세요.';
      case 'NotAllowedError':
        return '사용자가 인증을 취소했습니다.';
      case 'InvalidStateError':
        return '이미 등록된 자격 증명입니다.';
      case 'ConstraintError':
        return '요청한 인증 방식을 사용할 수 없습니다.';
      case 'TimeoutError':
        return '인증 시간이 초과되었습니다.';
      default:
        return `인증 오류: ${error.message}`;
    }
  }
  return '알 수 없는 오류가 발생했습니다.';
}
```

---

## API 사용 예제

### 1. 회원가입 전체 플로우

```typescript
import { useFido2Api } from './hooks/useFido2Api';
import {
  convertRegistrationOptions,
  createCredential,
} from './services/webauthn';

async function signup(name: string, email: string) {
  const { registerStart, registerFinish } = useFido2Api();

  try {
    // 1. 등록 시작
    const serverOptions = await registerStart({
      username: email,
      displayName: name,
    });

    // 2. 옵션 변환 (Base64Url → ArrayBuffer)
    const options = convertRegistrationOptions(serverOptions);

    // 3. Passkey 생성 (브라우저 WebAuthn API)
    const credential = await createCredential(options);

    // 4. 등록 완료 (서버로 전송)
    const result = await registerFinish(credential);

    if (result.success) {
      console.log('회원가입 성공:', result.username);
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('회원가입 실패:', error);
    throw error;
  }
}
```

### 2. 로그인 전체 플로우

```typescript
import { useFido2Api } from './hooks/useFido2Api';
import {
  convertAuthenticationOptions,
  getCredential,
} from './services/webauthn';

async function login(email?: string) {
  const { authStart, authFinish } = useFido2Api();

  try {
    // 1. 인증 시작
    const serverOptions = await authStart({ username: email });

    // 2. 옵션 변환
    const options = convertAuthenticationOptions(serverOptions);

    // 3. 인증 (브라우저 WebAuthn API)
    const credential = await getCredential(options);

    // 4. 인증 완료
    const result = await authFinish(credential);

    if (result.success) {
      console.log('로그인 성공:', result.username);
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
}
```

### 3. Mock 모드 전환

```typescript
import { useConfig } from './context/ConfigContext';

function Settings() {
  const { config, updateConfig } = useConfig();

  const toggleMockMode = () => {
    updateConfig({ useMockServer: !config.useMockServer });
  };

  return (
    <button onClick={toggleMockMode}>
      {config.useMockServer ? 'Mock 모드' : '실제 서버'}
    </button>
  );
}
```

---

## 보안 권장사항

### 1. Challenge 관리
- Challenge는 서버에서 생성하고 검증
- 최소 32 bytes의 랜덤 데이터 사용
- 일회용으로 사용 (재사용 금지)
- 만료 시간 설정 (60초 권장)

### 2. 자격 증명 검증
- Signature 검증 필수
- Counter 값 검증 (Replay 공격 방지)
- Origin 검증 (도메인 확인)
- RP ID 검증

### 3. HTTPS 필수
```typescript
if (window.location.protocol !== 'https:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1') {
  throw new Error('WebAuthn requires HTTPS');
}
```

### 4. User Verification
- 민감한 작업은 `userVerification: 'required'` 사용
- 생체 인증 또는 PIN 입력 강제

### 5. Rate Limiting
- 등록/인증 시도 횟수 제한
- IP 기반 제한
- 계정 잠금 정책

---

더 자세한 내용은 [W3C WebAuthn 표준](https://www.w3.org/TR/webauthn-2/)을 참조하세요.
