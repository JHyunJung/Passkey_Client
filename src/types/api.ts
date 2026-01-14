/**
 * API 관련 타입 정의
 */

// API 설정
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

// 등록 시작 요청
export interface RegisterStartRequest {
  username: string;
  displayName?: string;
}

// 인증 시작 요청
export interface AuthStartRequest {
  username?: string;
}

// API 에러
export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

// 서버 상태
export interface ServerStatus {
  isConnected: boolean;
  lastChecked?: Date;
  error?: string;
}
