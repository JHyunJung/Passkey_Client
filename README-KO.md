# CROSSCERT FIDO2 Passkey 클라이언트

> 비밀번호 없는 안전한 인증을 위한 FIDO2/WebAuthn 기반 웹 애플리케이션

## 📋 프로젝트 개요

이 프로젝트는 **FIDO2 (Fast IDentity Online 2)** 표준을 구현한 WebAuthn 기반의 Passkey 인증 시스템입니다. 사용자는 비밀번호 대신 생체 인증(지문, 얼굴 인식)이나 보안 키를 사용하여 안전하고 편리하게 로그인할 수 있습니다.

### 주요 특징

- ✨ **비밀번호 불필요**: 생체 인증으로 간편하고 안전한 로그인
- 🔒 **피싱 방지**: FIDO2 표준으로 피싱 공격 원천 차단
- 🚀 **빠른 인증**: 0.3초 이내의 즉각적인 인증 완료
- 🎨 **현대적인 UI/UX**: Tailwind CSS v4와 Framer Motion을 활용한 아름다운 인터페이스
- 🧪 **Mock 모드**: 백엔드 서버 없이도 테스트 가능
- 🌐 **브랜드 커스터마이징**: 한국전자인증(CROSSCERT) 브랜딩 적용

## 🏗️ 기술 스택

### Frontend Framework
- **React 19.2** - 최신 React 버전으로 구현
- **TypeScript 5.9** - 타입 안정성 보장
- **Vite 7.2** - 빠른 개발 환경과 최적화된 빌드

### UI/UX
- **Tailwind CSS v4** - 유틸리티 우선 CSS 프레임워크
- **Framer Motion 12** - 부드러운 애니메이션과 인터랙션
- **Lucide React** - 깔끔한 아이콘 세트

### Routing & State
- **React Router v7** - 페이지 라우팅 및 네비게이션
- **Context API** - 전역 설정 관리

### WebAuthn & FIDO2
- **Web Authentication API** - 브라우저 기본 WebAuthn 구현
- **Custom Mock Server** - 테스트를 위한 로컬 Mock 서버

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn
- 모던 브라우저 (Chrome 67+, Safari 14+, Edge 79+)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone [repository-url]
cd Fido2_Client

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 열기
# http://localhost:5173
```

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 📱 주요 기능

### 1. Passkey 등록 (회원가입)
- 사용자 정보 입력 (이름, 이메일)
- WebAuthn을 통한 Passkey 생성
- 기기의 생체 인증 정보와 연결

### 2. Passkey 인증 (로그인)
- 이메일 입력 또는 직접 Passkey 선택
- 생체 인증으로 즉시 로그인
- 다중 기기 지원

### 3. 대시보드
- 등록된 Passkey 목록 확인
- 인증 통계 및 보안 상태 표시
- 추가 Passkey 등록 가능

### 4. 설정
- Mock 모드 / 실제 서버 전환
- 서버 URL 설정
- 로고 언어 선택 (영문/한글)

## 🎯 사용 시나리오

### 신규 사용자 등록
1. 랜딩 페이지에서 "회원가입" 클릭
2. 이름과 이메일 입력
3. 약관 동의
4. "Passkey로 회원가입" 클릭
5. 기기의 생체 인증 수행 (지문/얼굴)
6. 등록 완료 → 대시보드로 이동

### 기존 사용자 로그인
1. 랜딩 페이지에서 "로그인" 클릭
2. 방법 1: "Passkey로 로그인" 직접 클릭
3. 방법 2: 이메일 입력 후 "계속하기"
4. 생체 인증 수행
5. 로그인 완료 → 대시보드로 이동

## 🧪 Mock 모드

백엔드 서버가 없어도 로컬에서 테스트할 수 있습니다:

1. 헤더의 설정(⚙️) 아이콘 클릭
2. "Mock 모드" 토글 활성화
3. 모든 FIDO2 API가 로컬 메모리에서 시뮬레이션됨
4. localStorage에 자격 증명 저장

## 📂 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── common/         # Button, Input, Card 등 공통 컴포넌트
│   ├── config/         # 설정 관련 컴포넌트
│   └── layout/         # Header, Footer, Layout
├── context/            # React Context (전역 상태)
│   └── ConfigContext.tsx
├── hooks/              # 커스텀 React 훅
│   └── useFido2Api.ts
├── pages/              # 페이지 컴포넌트
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   └── DashboardPage.tsx
├── services/           # 비즈니스 로직
│   ├── api.ts          # 실제 API 통신
│   ├── mockServer.ts   # Mock 서버
│   ├── webauthn.ts     # WebAuthn 헬퍼 함수
│   └── encoding.ts     # Base64 인코딩/디코딩
├── types/              # TypeScript 타입 정의
│   ├── api.ts
│   └── webauthn.ts
└── lib/                # 유틸리티 함수
    └── utils.ts        # 클래스명 병합 등
```

자세한 아키텍처 설명은 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참조하세요.

## 🔐 보안 고려사항

### WebAuthn 보안 특징
- **피싱 방지**: 도메인 바인딩으로 피싱 사이트에서 사용 불가
- **중간자 공격 방지**: 공개키 암호화 방식 사용
- **생체 정보 미전송**: 생체 정보는 기기 내부에만 저장
- **재사용 공격 방지**: 챌린지-응답 방식으로 재사용 불가능

### 구현 보안 사항
- HTTPS 필수 (localhost 제외)
- 민감 정보는 서버에 저장하지 않음
- CORS 정책 준수
- CSP(Content Security Policy) 권장

## 🎨 브랜딩

### CROSSCERT (한국전자인증)
- **브랜드 컬러**: `#0066CC` (Primary Blue)
- **그라디언트**: `#0099CC` → `#0066CC`
- **로고**: 영문/한글 전환 가능

### 커스터마이징
설정 패널에서 로고 언어를 선택할 수 있습니다:
- English: CROSSCERT 영문 로고
- 한국어: 한국전자인증 한글 로고

## 🔧 설정

### 환경 변수
프로젝트는 환경 변수를 사용하지 않습니다. 모든 설정은 UI에서 동적으로 변경 가능합니다.

### 서버 연결
1. 설정 패널 열기
2. Mock 모드 비활성화
3. 서버 URL 입력 (예: `http://localhost:8080`)
4. "연결 테스트" 클릭
5. "저장" 클릭

## 📊 성능 최적화

### 적용된 최적화
- ✅ **코드 스플리팅**: React.lazy로 페이지별 분리
- ✅ **컴포넌트 메모이제이션**: React.memo 적용
- ✅ **Context 최적화**: useMemo로 불필요한 리렌더링 방지
- ✅ **번들 크기 최적화**: 트리 쉐이킹 활용

### 성능 지표
- 초기 로딩: < 1초
- 페이지 전환: < 200ms
- 인증 완료: < 300ms

## 🧩 브라우저 호환성

| 브라우저 | 최소 버전 | WebAuthn 지원 |
|---------|----------|--------------|
| Chrome  | 67+      | ✅ Full       |
| Edge    | 79+      | ✅ Full       |
| Safari  | 14+      | ✅ Full       |
| Firefox | 60+      | ✅ Full       |

## 📚 추가 문서

- [아키텍처 가이드](./ARCHITECTURE.md) - 상세한 아키텍처 설명
- [API 문서](./API.md) - FIDO2 API 엔드포인트 및 타입
- [기여 가이드](./CONTRIBUTING.md) - 프로젝트 기여 방법

## 🤝 기여하기

기여를 환영합니다! 다음 절차를 따라주세요:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🙋 지원

문제가 발생하거나 질문이 있으신가요?
- GitHub Issues에 문제 제기
- 이메일: support@crosscert.com

## 🔗 관련 링크

- [FIDO Alliance](https://fidoalliance.org/)
- [WebAuthn 표준](https://www.w3.org/TR/webauthn/)
- [MDN WebAuthn Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [한국전자인증](https://www.crosscert.com/)

---

Made with ❤️ by CROSSCERT | Powered by FIDO2 & WebAuthn
