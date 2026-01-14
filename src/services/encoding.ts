/**
 * Base64URL 인코딩/디코딩 유틸리티
 * WebAuthn API는 Base64URL 인코딩을 사용합니다.
 */

/**
 * ArrayBuffer를 Base64URL 문자열로 인코딩
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL 문자열을 ArrayBuffer로 디코딩
 */
export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Base64URL을 표준 Base64로 변환
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // 패딩 추가
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(paddingNeeded);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Base64URL 문자열을 Uint8Array로 디코딩
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  return new Uint8Array(base64UrlToArrayBuffer(base64url));
}

/**
 * 문자열을 Uint8Array로 변환
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Uint8Array를 문자열로 변환
 */
export function uint8ArrayToString(array: Uint8Array): string {
  return new TextDecoder().decode(array);
}
