/**
 * @fileoverview Web Vitals 성능 측정 유틸리티
 *
 * Core Web Vitals 및 기타 성능 지표를 측정하여
 * 실제 사용자 경험을 모니터링합니다.
 *
 * 측정하는 지표:
 * - LCP (Largest Contentful Paint): 가장 큰 콘텐츠가 화면에 렌더링되는 시간
 * - FID (First Input Delay): 첫 번째 사용자 입력에 대한 응답 시간
 * - CLS (Cumulative Layout Shift): 레이아웃 이동의 누적 점수
 * - FCP (First Contentful Paint): 첫 번째 콘텐츠가 화면에 렌더링되는 시간
 * - TTFB (Time to First Byte): 서버 응답 시간
 * - INP (Interaction to Next Paint): 사용자 상호작용 응답성
 *
 * @module reportWebVitals
 * @author CROSSCERT
 * @since 1.0.0
 */

import type { Metric } from 'web-vitals';

/**
 * 성능 지표 임계값 (Good/Needs Improvement/Poor)
 *
 * @see https://web.dev/articles/vitals
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },        // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift (score)
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte (ms)
  INP: { good: 200, poor: 500 },        // Interaction to Next Paint (ms)
};

/**
 * 성능 등급 판정
 *
 * @param name - 지표 이름
 * @param value - 측정값
 * @returns 성능 등급 (good, needs-improvement, poor)
 */
function getRating(name: string, value: number): string {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 성능 지표를 콘솔에 출력
 *
 * 개발 환경에서 성능 지표를 시각적으로 확인하기 위해 사용됩니다.
 *
 * @param metric - Web Vitals 측정 결과
 */
function logMetricToConsole(metric: Metric): void {
  const { name, value, rating, delta } = metric;
  const formattedValue = name === 'CLS' ? value.toFixed(3) : Math.round(value);

  // 등급에 따른 이모지
  const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';

  console.log(
    `%c${emoji} ${name}`,
    'font-weight: bold; font-size: 14px;',
    `\nValue: ${formattedValue}${name === 'CLS' ? '' : 'ms'}`,
    `\nRating: ${rating}`,
    `\nDelta: ${delta.toFixed(2)}`
  );
}

/**
 * 성능 지표를 분석 서비스로 전송
 *
 * 프로덕션 환경에서 성능 데이터를 수집하기 위해 사용됩니다.
 * Google Analytics, Sentry, LogRocket 등의 서비스와 연동 가능합니다.
 *
 * @param metric - Web Vitals 측정 결과
 *
 * @example
 * ```typescript
 * // Google Analytics 4와 연동
 * function sendToAnalytics(metric: Metric) {
 *   const { name, value, id } = metric;
 *   gtag('event', name, {
 *     event_category: 'Web Vitals',
 *     value: Math.round(name === 'CLS' ? value * 1000 : value),
 *     event_label: id,
 *     non_interaction: true,
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Sentry와 연동
 * import * as Sentry from '@sentry/react';
 *
 * function sendToAnalytics(metric: Metric) {
 *   Sentry.captureMessage(`Web Vital: ${metric.name}`, {
 *     level: 'info',
 *     extra: {
 *       name: metric.name,
 *       value: metric.value,
 *       rating: metric.rating,
 *     },
 *   });
 * }
 * ```
 */
function sendToAnalytics(metric: Metric): void {
  // 프로덕션 환경에서만 전송
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // TODO: 실제 분석 서비스로 데이터 전송
  // 예: Google Analytics, Sentry, LogRocket 등

  // 예시: Beacon API를 사용한 전송 (서버 엔드포인트 필요)
  /*
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/web-vitals', body);
  } else {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
  */
}

/**
 * Web Vitals 성능 측정 시작
 *
 * 이 함수를 호출하면 Core Web Vitals 및 기타 성능 지표를
 * 자동으로 측정하고 콘솔에 출력하거나 분석 서비스로 전송합니다.
 *
 * 측정 시점:
 * - LCP, FCP, TTFB: 페이지 로드 완료 시
 * - FID, INP: 사용자의 첫 번째 상호작용 시
 * - CLS: 페이지 전체 생명주기 동안
 *
 * @param onPerfEntry - 성능 지표를 처리할 콜백 함수 (선택사항)
 *
 * @example
 * ```typescript
 * // main.tsx에서 호출
 * import { reportWebVitals } from './lib/reportWebVitals';
 *
 * reportWebVitals(); // 기본 동작 (콘솔 출력 + 분석 서비스 전송)
 * ```
 *
 * @example
 * ```typescript
 * // 커스텀 콜백 사용
 * reportWebVitals((metric) => {
 *   // 커스텀 처리 로직
 *   if (metric.rating === 'poor') {
 *     alert(`Performance issue: ${metric.name} = ${metric.value}`);
 *   }
 * });
 * ```
 */
export function reportWebVitals(onPerfEntry?: (metric: Metric) => void): void {
  // web-vitals 라이브러리 동적 import
  import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB, onINP }) => {
    // 각 성능 지표 측정
    const handleMetric = (metric: Metric) => {
      // 개발 환경: 콘솔에 출력
      if (process.env.NODE_ENV === 'development') {
        logMetricToConsole(metric);
      }

      // 분석 서비스로 전송
      sendToAnalytics(metric);

      // 커스텀 콜백 실행
      if (onPerfEntry && typeof onPerfEntry === 'function') {
        onPerfEntry(metric);
      }
    };

    // Core Web Vitals
    onCLS(handleMetric);  // Cumulative Layout Shift
    onFID(handleMetric);  // First Input Delay (deprecated, use INP)
    onLCP(handleMetric);  // Largest Contentful Paint

    // Other important metrics
    onFCP(handleMetric);  // First Contentful Paint
    onTTFB(handleMetric); // Time to First Byte
    onINP(handleMetric);  // Interaction to Next Paint (replaces FID)
  }).catch((error) => {
    // web-vitals 로드 실패 시 무시 (치명적이지 않음)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to load web-vitals:', error);
    }
  });
}

/**
 * 성능 지표 요약 정보 생성
 *
 * 측정된 모든 지표를 수집하여 요약 정보를 반환합니다.
 * 대시보드나 성능 리포트 생성에 유용합니다.
 *
 * @example
 * ```typescript
 * const metrics: Metric[] = [];
 *
 * reportWebVitals((metric) => {
 *   metrics.push(metric);
 *
 *   // 모든 Core Web Vitals 수집 완료 시
 *   if (metrics.length === 6) {
 *     console.table(metrics.map(m => ({
 *       name: m.name,
 *       value: m.value,
 *       rating: m.rating,
 *     })));
 *   }
 * });
 * ```
 */
export function getMetricsSummary(metrics: Metric[]): {
  good: number;
  needsImprovement: number;
  poor: number;
  score: number;
} {
  const ratings = metrics.map(m => m.rating);
  const good = ratings.filter(r => r === 'good').length;
  const needsImprovement = ratings.filter(r => r === 'needs-improvement').length;
  const poor = ratings.filter(r => r === 'poor').length;

  // 전체 점수 계산 (0-100)
  const score = Math.round((good / metrics.length) * 100);

  return { good, needsImprovement, poor, score };
}
