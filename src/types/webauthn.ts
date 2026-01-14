/**
 * WebAuthn 관련 타입 정의
 */

// 등록 옵션 (서버에서 받는 응답)
export interface RegistrationOptionsResponse {
  challenge: string; // Base64URL encoded
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string; // Base64URL encoded
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    residentKey?: ResidentKeyRequirement;
    requireResidentKey?: boolean;
    userVerification?: UserVerificationRequirement;
  };
  excludeCredentials?: Array<{
    type: 'public-key';
    id: string; // Base64URL encoded
    transports?: AuthenticatorTransport[];
  }>;
}

// 인증 옵션 (서버에서 받는 응답)
export interface AuthenticationOptionsResponse {
  challenge: string; // Base64URL encoded
  timeout?: number;
  rpId?: string;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string; // Base64URL encoded
    transports?: AuthenticatorTransport[];
  }>;
}

// 등록 결과 (서버로 보내는 요청)
export interface RegistrationCredential {
  id: string;
  rawId: string; // Base64URL encoded
  response: {
    clientDataJSON: string; // Base64URL encoded
    attestationObject: string; // Base64URL encoded
  };
  type: 'public-key';
  clientExtensionResults?: AuthenticationExtensionsClientOutputs;
  authenticatorAttachment?: string;
}

// 인증 결과 (서버로 보내는 요청)
export interface AuthenticationCredential {
  id: string;
  rawId: string; // Base64URL encoded
  response: {
    clientDataJSON: string; // Base64URL encoded
    authenticatorData: string; // Base64URL encoded
    signature: string; // Base64URL encoded
    userHandle?: string; // Base64URL encoded
  };
  type: 'public-key';
  clientExtensionResults?: AuthenticationExtensionsClientOutputs;
  authenticatorAttachment?: string;
}

// 서버 응답 타입
export interface ServerResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface RegistrationResult {
  success: boolean;
  credentialId?: string;
  message?: string;
}

export interface AuthenticationResult {
  success: boolean;
  username?: string;
  message?: string;
}
