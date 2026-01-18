/**
 * Mock 서버 - 백엔드 없이 WebAuthn 테스트 가능
 * 실제 서버가 없을 때 로컬에서 테스트용으로 사용
 */

import type {
  RegistrationOptionsResponse,
  AuthenticationOptionsResponse,
  RegistrationCredential,
  AuthenticationCredential,
  RegistrationResult,
  AuthenticationResult,
} from '../types/webauthn';
import type { RegisterStartRequest, AuthStartRequest } from '../types/api';
import { arrayBufferToBase64Url } from './encoding';
import { mockLogger as log } from '../utils/logger';

// Mock 데이터 저장소 (메모리)
interface StoredCredential {
  credentialId: string;
  publicKey: string;
  username: string;
  displayName: string;
  createdAt: Date;
}

const mockStorage: Map<string, StoredCredential> = new Map();
const challengeStorage: Map<string, { challenge: string; username: string; timestamp: number }> = new Map();

// 랜덤 바이트 생성
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Challenge 생성
function generateChallenge(): string {
  const bytes = generateRandomBytes(32);
  return arrayBufferToBase64Url(bytes.buffer as ArrayBuffer);
}

// User ID 생성
function generateUserId(): string {
  const bytes = generateRandomBytes(16);
  return arrayBufferToBase64Url(bytes.buffer as ArrayBuffer);
}

/**
 * Mock 등록 시작 - Challenge 및 옵션 생성
 */
export async function mockRegisterStart(
  request: RegisterStartRequest
): Promise<RegistrationOptionsResponse> {
  log.group('Mock 등록 시작');
  log.info('등록 요청 수신', { username: request.username, displayName: request.displayName });

  const challenge = generateChallenge();
  const userId = generateUserId();
  log.debug('Challenge 및 User ID 생성', {
    challengeLength: challenge.length,
    userIdLength: userId.length,
  });

  // Challenge 저장 (5분 유효)
  challengeStorage.set(challenge, {
    challenge,
    username: request.username,
    timestamp: Date.now(),
  });
  log.debug('Challenge 저장 완료', { totalChallenges: challengeStorage.size });

  // 기존 등록된 credential 확인
  const existingCredentials = Array.from(mockStorage.values())
    .filter((cred) => cred.username === request.username)
    .map((cred) => ({
      type: 'public-key' as const,
      id: cred.credentialId,
    }));

  log.debug('기존 Credential 확인', {
    existingCount: existingCredentials.length,
    totalStoredCredentials: mockStorage.size,
  });

  const response: RegistrationOptionsResponse = {
    challenge,
    rp: {
      name: 'FIDO2 Test Server (Mock)',
      id: window.location.hostname,
    },
    user: {
      id: userId,
      name: request.username,
      displayName: request.displayName || request.username,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials: existingCredentials.length > 0 ? existingCredentials : undefined,
  };

  log.info('등록 옵션 생성 완료', {
    rpId: response.rp.id,
    username: response.user.name,
    excludeCredentialsCount: existingCredentials.length,
  });
  log.groupEnd();

  return response;
}

/**
 * Mock 등록 완료 - Attestation 검증 (Mock)
 */
export async function mockRegisterFinish(
  credential: RegistrationCredential
): Promise<RegistrationResult> {
  log.group('Mock 등록 완료');
  log.info('Credential 수신', { credentialId: credential.id });

  try {
    // 실제로는 attestationObject를 파싱하여 공개키를 추출해야 함
    // Mock에서는 단순히 저장
    const storedCredential: StoredCredential = {
      credentialId: credential.id,
      publicKey: credential.response.attestationObject, // 실제로는 파싱 필요
      username: 'mock-user', // Challenge에서 가져와야 함
      displayName: 'Mock User',
      createdAt: new Date(),
    };

    mockStorage.set(credential.id, storedCredential);
    log.info('Credential 저장 완료', {
      credentialId: credential.id,
      totalCredentials: mockStorage.size,
    });

    log.groupEnd();
    return {
      success: true,
      credentialId: credential.id,
      message: 'Passkey가 성공적으로 등록되었습니다. (Mock)',
    };
  } catch (error) {
    log.error('등록 실패', {
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    });
    log.groupEnd();
    return {
      success: false,
      message: `등록 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}

/**
 * Mock 인증 시작 - Challenge 생성
 */
export async function mockAuthStart(
  request: AuthStartRequest = {}
): Promise<AuthenticationOptionsResponse> {
  log.group('Mock 인증 시작');
  log.info('인증 요청 수신', { username: request.username || '(Discoverable)' });

  const challenge = generateChallenge();
  log.debug('Challenge 생성', { challengeLength: challenge.length });

  // Challenge 저장
  challengeStorage.set(challenge, {
    challenge,
    username: request.username || '',
    timestamp: Date.now(),
  });
  log.debug('Challenge 저장 완료', { totalChallenges: challengeStorage.size });

  // 등록된 credential 목록
  let allowCredentials: { type: 'public-key'; id: string }[] | undefined;
  if (request.username) {
    const userCredentials = Array.from(mockStorage.values())
      .filter((cred) => cred.username === request.username);

    log.debug('사용자 Credential 조회', {
      username: request.username,
      foundCount: userCredentials.length,
    });

    if (userCredentials.length > 0) {
      allowCredentials = userCredentials.map((cred) => ({
        type: 'public-key' as const,
        id: cred.credentialId,
      }));
    }
  } else {
    log.debug('Discoverable Credential 모드 (username 미지정)');
  }

  const response: AuthenticationOptionsResponse = {
    challenge,
    timeout: 60000,
    rpId: window.location.hostname,
    userVerification: 'preferred',
    allowCredentials,
  };

  log.info('인증 옵션 생성 완료', {
    rpId: response.rpId,
    allowCredentialsCount: allowCredentials?.length ?? 0,
  });
  log.groupEnd();

  return response;
}

/**
 * Mock 인증 완료 - Assertion 검증 (Mock)
 */
export async function mockAuthFinish(
  credential: AuthenticationCredential
): Promise<AuthenticationResult> {
  log.group('Mock 인증 완료');
  log.info('Assertion 수신', { credentialId: credential.id });

  try {
    // Mock에서는 credential이 존재하면 성공
    const storedCredential = mockStorage.get(credential.id);

    if (storedCredential) {
      log.info('저장된 Credential 매칭 성공', {
        credentialId: credential.id,
        username: storedCredential.username,
      });
      log.groupEnd();
      return {
        success: true,
        username: storedCredential.username,
        message: '인증이 성공적으로 완료되었습니다. (Mock)',
      };
    }

    // 새로운 credential인 경우 (Discoverable Credential)
    log.info('Discoverable Credential로 인증', { credentialId: credential.id });
    log.groupEnd();
    return {
      success: true,
      username: 'discovered-user',
      message: '인증이 성공적으로 완료되었습니다. (Mock - Discoverable)',
    };
  } catch (error) {
    log.error('인증 실패', {
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    });
    log.groupEnd();
    return {
      success: false,
      message: `인증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}

/**
 * 저장된 Credential 목록 조회
 */
export function getMockCredentials(): StoredCredential[] {
  const credentials = Array.from(mockStorage.values());
  log.debug('Mock Credential 목록 조회', { count: credentials.length });
  return credentials;
}

/**
 * Mock 데이터 초기화
 */
export function clearMockData(): void {
  const credentialCount = mockStorage.size;
  const challengeCount = challengeStorage.size;
  mockStorage.clear();
  challengeStorage.clear();
  log.info('Mock 데이터 초기화', {
    clearedCredentials: credentialCount,
    clearedChallenges: challengeCount,
  });
}

/**
 * 만료된 Challenge 정리 (5분)
 */
export function cleanupExpiredChallenges(): void {
  const now = Date.now();
  const expiry = 5 * 60 * 1000; // 5분
  let cleanedCount = 0;

  for (const [key, value] of challengeStorage.entries()) {
    if (now - value.timestamp > expiry) {
      challengeStorage.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    log.debug('만료된 Challenge 정리', {
      cleaned: cleanedCount,
      remaining: challengeStorage.size,
    });
  }
}
