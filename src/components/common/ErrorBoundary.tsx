/**
 * @fileoverview React 에러 바운더리 컴포넌트
 *
 * React 앱에서 발생하는 런타임 에러를 잡아내어
 * 전체 앱이 충돌하는 것을 방지합니다.
 *
 * 주요 기능:
 * - 자식 컴포넌트에서 발생한 에러 캐치
 * - 사용자 친화적인 에러 UI 표시
 * - 에러 정보 로깅 (개발 환경)
 * - 앱 재시작 기능 제공
 *
 * @module ErrorBoundary
 * @author CROSSCERT
 * @since 1.0.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  /** 감싸질 자식 컴포넌트 */
  children: ReactNode;
  /** 에러 발생 시 보여줄 커스텀 UI (선택사항) */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  /** 에러 발생 여부 */
  hasError: boolean;
  /** 발생한 에러 객체 */
  error: Error | null;
}

/**
 * React 에러 바운더리 컴포넌트
 *
 * React 컴포넌트 트리에서 발생하는 JavaScript 에러를 캐치하여
 * 전체 앱이 충돌하는 것을 방지하고 대체 UI를 표시합니다.
 *
 * 캐치하는 에러:
 * - 렌더링 중 발생하는 에러
 * - 생명주기 메서드에서 발생하는 에러
 * - 생성자에서 발생하는 에러
 *
 * 캐치하지 않는 에러:
 * - 이벤트 핸들러의 에러 (try-catch 사용 필요)
 * - 비동기 코드의 에러 (Promise rejection 등)
 * - 서버 사이드 렌더링 에러
 * - 에러 바운더리 자체의 에러
 *
 * @example
 * ```tsx
 * // App 전체를 감싸기
 * function App() {
 *   return (
 *     <ErrorBoundary>
 *       <YourApp />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 특정 섹션만 보호
 * function Dashboard() {
 *   return (
 *     <div>
 *       <Header />
 *       <ErrorBoundary>
 *         <MainContent />
 *       </ErrorBoundary>
 *       <Footer />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 커스텀 fallback UI
 * function App() {
 *   return (
 *     <ErrorBoundary
 *       fallback={(error, reset) => (
 *         <div>
 *           <h1>앗! 문제가 발생했습니다</h1>
 *           <p>{error.message}</p>
 *           <button onClick={reset}>다시 시도</button>
 *         </div>
 *       )}
 *     >
 *       <YourApp />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * 에러 발생 시 state 업데이트
   *
   * 이 메서드는 렌더링 단계에서 호출되므로
   * 부수 효과(side-effect)가 없어야 합니다.
   *
   * @param error - 발생한 에러 객체
   * @returns 업데이트할 state
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * 에러 정보 로깅
   *
   * 커밋 단계에서 호출되므로 부수 효과가 허용됩니다.
   * 여기서 에러 로깅 서비스에 에러를 전송할 수 있습니다.
   *
   * @param error - 발생한 에러 객체
   * @param errorInfo - 에러 발생 위치 정보 (컴포넌트 스택)
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 개발 환경에서만 상세 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // 프로덕션 환경에서는 에러 로깅 서비스로 전송
    // 예: Sentry, LogRocket 등
    // logErrorToService(error, errorInfo);
  }

  /**
   * 에러 상태 초기화 및 재시도
   *
   * 사용자가 "다시 시도" 버튼을 클릭하면
   * 에러 상태를 초기화하고 앱을 다시 렌더링합니다.
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  /**
   * 페이지 새로고침
   *
   * 에러가 지속되는 경우 전체 페이지를 새로고침합니다.
   */
  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    // 에러가 발생한 경우
    if (hasError && error) {
      // 커스텀 fallback이 제공된 경우
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // 기본 에러 UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            {/* 에러 아이콘 */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* 에러 메시지 */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              앗! 문제가 발생했습니다
            </h2>
            <p className="text-gray-600 text-center mb-6">
              예상치 못한 오류로 인해 페이지를 표시할 수 없습니다.
              {process.env.NODE_ENV === 'development' && (
                <>
                  <br />
                  <br />
                  <span className="text-sm font-mono text-red-600 block break-all">
                    {error.message}
                  </span>
                </>
              )}
            </p>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                다시 시도
              </button>
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                페이지 새로고침
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                홈으로 돌아가기
              </button>
            </div>

            {/* 지원 정보 */}
            <p className="mt-6 text-sm text-gray-500 text-center">
              문제가 계속되면{' '}
              <a href="mailto:support@crosscert.com" className="text-blue-600 hover:underline">
                고객 지원팀
              </a>
              에 문의하세요.
            </p>
          </div>
        </div>
      );
    }

    // 정상 동작 시 자식 컴포넌트 렌더링
    return children;
  }
}
