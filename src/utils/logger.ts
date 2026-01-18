/**
 * @fileoverview 디버깅용 로거 유틸리티
 *
 * FIDO2 클라이언트 애플리케이션의 디버깅을 위한 로깅 시스템을 제공합니다.
 * 개발 환경에서만 활성화되며, 프로덕션 빌드에서는 자동으로 비활성화됩니다.
 *
 * 주요 기능:
 * - 모듈별 네임스페이스 구분 (WebAuthn, API, Mock, Hook)
 * - 로그 레벨 지원 (debug, info, warn, error)
 * - 컬러 코딩으로 가독성 향상
 * - 타임스탬프 및 실행 시간 측정
 * - 민감 데이터 마스킹
 *
 * @module logger
 * @author CROSSCERT
 * @since 1.0.0
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  showTimestamp: boolean;
}

// 로거 설정 (localStorage에서 읽어옴)
const STORAGE_KEY = 'fido2-debug-config';

function getDefaultConfig(): LoggerConfig {
  return {
    enabled: import.meta.env.DEV,
    level: 'debug',
    showTimestamp: true,
  };
}

function loadConfig(): LoggerConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...getDefaultConfig(), ...JSON.parse(stored) };
    }
  } catch {
    // localStorage 접근 실패 시 기본값 사용
  }
  return getDefaultConfig();
}

let config = loadConfig();

/**
 * 로거 설정 업데이트
 */
export function setLoggerConfig(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

/**
 * 로깅 활성화/비활성화
 */
export function enableLogging(enabled: boolean): void {
  setLoggerConfig({ enabled });
}

// 로그 레벨 우선순위
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 모듈별 색상
const MODULE_COLORS: Record<string, string> = {
  WebAuthn: '#4CAF50',    // 녹색
  API: '#2196F3',         // 파랑
  Mock: '#FF9800',        // 주황
  Hook: '#9C27B0',        // 보라
  Encoding: '#607D8B',    // 회색
  Config: '#00BCD4',      // 청록
};

// 레벨별 스타일
const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #888',
  info: 'color: #2196F3',
  warn: 'color: #FF9800',
  error: 'color: #F44336; font-weight: bold',
};

/**
 * 타임스탬프 포맷팅
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[1].slice(0, -1);
}

/**
 * 민감 데이터 마스킹
 */
function maskSensitiveData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // 민감한 필드 마스킹
    if (
      key.toLowerCase().includes('signature') ||
      key.toLowerCase().includes('private') ||
      key.toLowerCase().includes('secret')
    ) {
      masked[key] = '[MASKED]';
    } else if (typeof value === 'string' && value.length > 100) {
      // 긴 Base64 문자열 축약
      masked[key] = `${value.substring(0, 20)}...${value.substring(value.length - 20)} (${value.length} chars)`;
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * 로그 출력 함수
 */
function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: unknown
): void {
  if (!config.enabled) return;
  if (LOG_LEVELS[level] < LOG_LEVELS[config.level]) return;

  const moduleColor = MODULE_COLORS[module] || '#666';
  const levelStyle = LEVEL_STYLES[level];

  const parts: string[] = [];
  const styles: string[] = [];

  // 타임스탬프
  if (config.showTimestamp) {
    parts.push(`%c[${formatTimestamp()}]`);
    styles.push('color: #888');
  }

  // 모듈명
  parts.push(`%c[${module}]`);
  styles.push(`color: ${moduleColor}; font-weight: bold`);

  // 레벨
  parts.push(`%c[${level.toUpperCase()}]`);
  styles.push(levelStyle);

  // 메시지
  parts.push(`%c${message}`);
  styles.push('color: inherit');

  const logFn = level === 'error' ? console.error :
                level === 'warn' ? console.warn :
                level === 'debug' ? console.debug :
                console.log;

  if (data !== undefined) {
    const maskedData = maskSensitiveData(data);
    logFn(parts.join(' '), ...styles, maskedData);
  } else {
    logFn(parts.join(' '), ...styles);
  }
}

/**
 * 성능 측정을 위한 타이머
 */
const timers = new Map<string, number>();

/**
 * 타이머 시작
 */
export function startTimer(label: string): void {
  if (!config.enabled) return;
  timers.set(label, performance.now());
}

/**
 * 타이머 종료 및 시간 출력
 */
export function endTimer(label: string, module: string = 'Perf'): number {
  if (!config.enabled) return 0;

  const start = timers.get(label);
  if (start === undefined) {
    log('warn', module, `타이머 '${label}'이 시작되지 않았습니다.`);
    return 0;
  }

  const elapsed = performance.now() - start;
  timers.delete(label);
  log('debug', module, `⏱ ${label}: ${elapsed.toFixed(2)}ms`);
  return elapsed;
}

/**
 * 그룹 로그 시작
 */
export function group(module: string, label: string): void {
  if (!config.enabled) return;
  const moduleColor = MODULE_COLORS[module] || '#666';
  console.group(`%c[${module}] ${label}`, `color: ${moduleColor}; font-weight: bold`);
}

/**
 * 그룹 로그 종료
 */
export function groupEnd(): void {
  if (!config.enabled) return;
  console.groupEnd();
}

/**
 * 모듈별 로거 생성
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', module, message, data),
    info: (message: string, data?: unknown) => log('info', module, message, data),
    warn: (message: string, data?: unknown) => log('warn', module, message, data),
    error: (message: string, data?: unknown) => log('error', module, message, data),
    group: (label: string) => group(module, label),
    groupEnd,
    startTimer: (label: string) => startTimer(`${module}:${label}`),
    endTimer: (label: string) => endTimer(`${module}:${label}`, module),
  };
}

// 미리 정의된 모듈 로거
export const webauthnLogger = createLogger('WebAuthn');
export const apiLogger = createLogger('API');
export const mockLogger = createLogger('Mock');
export const hookLogger = createLogger('Hook');
export const encodingLogger = createLogger('Encoding');
export const configLogger = createLogger('Config');

// 전역 로거 (모듈 지정 없이 사용)
export const logger = {
  debug: (message: string, data?: unknown) => log('debug', 'App', message, data),
  info: (message: string, data?: unknown) => log('info', 'App', message, data),
  warn: (message: string, data?: unknown) => log('warn', 'App', message, data),
  error: (message: string, data?: unknown) => log('error', 'App', message, data),
  group: (label: string) => group('App', label),
  groupEnd,
  startTimer,
  endTimer,
  createLogger,
  setConfig: setLoggerConfig,
  enable: enableLogging,
};

export default logger;
