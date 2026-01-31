# 빌드 산출물 배포 가이드

이 문서는 빌드된 정적 파일(dist)을 사용하여 배포하는 방법을 설명합니다.

## 📋 목차

- [개요](#개요)
- [빌드 프로세스](#빌드-프로세스)
- [배포 방법](#배포-방법)
- [운영 관리](#운영-관리)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### 빌드 산출물 배포의 장점

- ✅ **빠른 배포**: 빌드된 파일만 전송하므로 배포 속도 향상
- ✅ **서버 부담 감소**: 서버에서 빌드 불필요
- ✅ **일관성**: 한 번 빌드한 산출물을 여러 서버에 배포
- ✅ **간단한 구성**: nginx만으로 정적 파일 서빙
- ✅ **롤백 용이**: 이전 버전 아카이브를 다시 배포

### 배포 흐름

```
개발 환경                     서버 환경
┌─────────────────┐          ┌─────────────────┐
│ 1. 소스 코드    │          │                 │
│    빌드         │          │                 │
│ ↓               │          │                 │
│ 2. dist/        │          │                 │
│    생성         │──전송──→ │ 3. nginx로      │
│ ↓               │          │    정적 파일    │
│ 3. tar.gz       │          │    서빙         │
│    패키징       │          │                 │
└─────────────────┘          └─────────────────┘
```

---

## 빌드 프로세스

### 1. 빌드 스크립트 실행

#### QA 환경 빌드

```bash
cd /Users/jhyun/Git/Kotlin/Fido2_Client

# QA 환경 빌드 (기본)
./scripts/build-production.sh --qa
```

#### Production 환경 빌드

```bash
# Production 환경 빌드
./scripts/build-production.sh --prod
```

### 2. 빌드 과정

스크립트가 자동으로 수행하는 작업:

1. ✅ **사전 요구사항 확인**
   - Node.js, npm 버전 확인
   - 프로젝트 루트 확인

2. ✅ **의존성 설치**
   - `npm install` 실행

3. ✅ **코드 품질 검사**
   - ESLint 실행
   - TypeScript 타입 체크

4. ✅ **빌드 실행**
   - `npm run build:qa` 또는 `npm run build`
   - dist/ 디렉토리 생성

5. ✅ **아티팩트 패키징**
   - 빌드 산출물 복사
   - 배포 설정 포함
   - tar.gz 압축
   - 체크섬 생성

### 3. 생성되는 파일 구조

```
artifacts/
├── passkey-client-qa-20260130-153045/
│   ├── dist/                          # 빌드된 정적 파일
│   │   ├── index.html
│   │   ├── assets/
│   │   │   ├── index-abc123.js
│   │   │   ├── index-def456.css
│   │   │   └── ...
│   │   └── ...
│   ├── deploy/                        # 배포 설정
│   │   ├── nginx/
│   │   │   └── passkey-static.conf
│   │   └── systemd/
│   ├── deploy-static.sh               # 배포 스크립트
│   ├── DEPLOY-README.md               # 배포 가이드
│   └── VERSION.txt                    # 버전 정보
├── passkey-client-qa-20260130-153045.tar.gz
├── passkey-client-qa-20260130-153045.tar.gz.sha256
├── passkey-client-qa-20260130-153045.tar.gz.md5
└── BUILD-REPORT.txt                   # 빌드 리포트
```

### 4. 빌드 산출물 검증

```bash
# 체크섬 확인
cd artifacts
sha256sum -c passkey-client-*.tar.gz.sha256

# 또는 MD5
md5sum -c passkey-client-*.tar.gz.md5
```

---

## 배포 방법

### 방법 1: 자동 배포 스크립트 (권장)

가장 간단하고 빠른 방법입니다.

#### 1단계: 서버로 아카이브 전송

```bash
# 개발 환경에서
cd /Users/jhyun/Git/Kotlin/Fido2_Client/artifacts

# SCP로 전송
scp passkey-client-*.tar.gz user@server:/opt/
```

#### 2단계: 서버에서 압축 해제

```bash
# 서버에 접속
ssh user@server

# 압축 해제
cd /opt
tar xzf passkey-client-*.tar.gz
cd passkey-client-*
```

#### 3단계: 배포 스크립트 실행

```bash
# 자동 배포
sudo ./deploy-static.sh
```

**완료!** 애플리케이션이 `https://passkey.crosscert.com/client`에서 접근 가능합니다.

---

### 방법 2: 수동 배포

단계별로 수동 배포하는 방법입니다.

#### 1. 정적 파일 디렉토리 생성

```bash
sudo mkdir -p /var/www/passkey-client
```

#### 2. 빌드 산출물 복사

```bash
cd /opt/passkey-client-*
sudo cp -r dist/* /var/www/passkey-client/
```

#### 3. 권한 설정

```bash
# nginx 사용자로 권한 설정
sudo chown -R nginx:nginx /var/www/passkey-client
sudo chmod -R 755 /var/www/passkey-client
```

#### 4. SELinux 설정 (RHEL/CentOS)

```bash
# SELinux 컨텍스트 설정
sudo chcon -R -t httpd_sys_content_t /var/www/passkey-client

# 또는 영구 설정
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/passkey-client(/.*)?"
sudo restorecon -R /var/www/passkey-client
```

#### 5. nginx 설정

```bash
# nginx 설정 파일 복사
sudo cp deploy/nginx/passkey-static.conf /etc/nginx/conf.d/

# SSL 인증서 경로 수정
sudo vi /etc/nginx/conf.d/passkey-static.conf
# ssl_certificate와 ssl_certificate_key 경로를 실제 인증서 경로로 수정

# nginx 설정 테스트
sudo nginx -t

# nginx 재시작
sudo systemctl reload nginx
```

#### 6. 방화벽 설정

```bash
# HTTP/HTTPS 포트 개방
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 7. 동작 확인

```bash
# 로컬 테스트
curl http://localhost/client/

# HTTPS 테스트
curl -k https://localhost/client/

# 헬스 체크
curl http://localhost/health
```

---

### 방법 3: 블루-그린 배포

무중단 배포를 위한 블루-그린 배포 방법입니다.

#### 1. 새 버전 디렉토리 생성

```bash
# 현재 버전: /var/www/passkey-client (심볼릭 링크)
# 블루: /var/www/passkey-client-blue
# 그린: /var/www/passkey-client-green

# 현재 활성 버전 확인
ls -l /var/www/passkey-client

# 비활성 디렉토리에 새 버전 배포
sudo mkdir -p /var/www/passkey-client-green
sudo cp -r dist/* /var/www/passkey-client-green/
sudo chown -R nginx:nginx /var/www/passkey-client-green
```

#### 2. 테스트

```bash
# 임시로 nginx 설정을 green으로 변경하여 테스트
# (또는 별도 포트로 테스트 서버 구성)
```

#### 3. 전환

```bash
# 심볼릭 링크 변경
sudo rm /var/www/passkey-client
sudo ln -s /var/www/passkey-client-green /var/www/passkey-client

# nginx 리로드
sudo systemctl reload nginx
```

#### 4. 롤백 (필요시)

```bash
# 이전 버전으로 롤백
sudo rm /var/www/passkey-client
sudo ln -s /var/www/passkey-client-blue /var/www/passkey-client
sudo systemctl reload nginx
```

---

## 운영 관리

### 버전 관리

#### 버전 정보 확인

```bash
# 현재 배포된 버전 확인
cat /var/www/passkey-client/VERSION.txt

# 또는 nginx 로그에서
tail /var/log/nginx/passkey-client-access.log
```

#### 여러 버전 유지

```bash
# 버전별 디렉토리 구조
/var/www/
├── passkey-client -> passkey-client-20260130  (현재 버전, 심볼릭 링크)
├── passkey-client-20260130/                   (최신)
├── passkey-client-20260129/                   (이전)
└── passkey-client-20260128/                   (백업)
```

### 로그 관리

#### 로그 확인

```bash
# Access 로그
sudo tail -f /var/log/nginx/passkey-client-access.log

# Error 로그
sudo tail -f /var/log/nginx/passkey-client-error.log

# 특정 시간대 로그
sudo grep "30/Jan/2026" /var/log/nginx/passkey-client-access.log
```

#### 로그 로테이션

```bash
# /etc/logrotate.d/nginx 확인
cat /etc/logrotate.d/nginx
```

### 캐시 관리

#### 브라우저 캐시 강제 새로고침 안내

사용자에게 안내할 내용:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

#### nginx 캐시 삭제 (설정된 경우)

```bash
# nginx 캐시 디렉토리 확인
sudo nginx -T | grep proxy_cache_path

# 캐시 삭제
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

### 성능 모니터링

#### 응답 시간 확인

```bash
# nginx 로그에서 응답 시간 분석
awk '{print $NF}' /var/log/nginx/passkey-client-access.log | sort -n | tail -10
```

#### 트래픽 분석

```bash
# 시간대별 요청 수
awk '{print $4}' /var/log/nginx/passkey-client-access.log | cut -d: -f1-2 | sort | uniq -c
```

---

## 트러블슈팅

### 404 Not Found 오류

#### 원인 1: 파일 경로 문제

```bash
# 파일이 올바른 위치에 있는지 확인
ls -la /var/www/passkey-client/

# index.html이 있는지 확인
ls -la /var/www/passkey-client/index.html
```

**해결책**: 파일을 올바른 위치로 복사

```bash
sudo cp -r dist/* /var/www/passkey-client/
```

#### 원인 2: nginx 설정 오류

```bash
# nginx 설정 확인
sudo nginx -t

# alias 경로 확인
grep -A 5 "location /client" /etc/nginx/conf.d/passkey-static.conf
```

**해결책**: nginx 설정 수정 및 재시작

```bash
sudo vi /etc/nginx/conf.d/passkey-static.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 403 Forbidden 오류

#### 원인 1: 파일 권한 문제

```bash
# 권한 확인
ls -la /var/www/passkey-client/
```

**해결책**: 권한 수정

```bash
sudo chown -R nginx:nginx /var/www/passkey-client
sudo chmod -R 755 /var/www/passkey-client
```

#### 원인 2: SELinux 차단

```bash
# SELinux 상태 확인
getenforce

# audit 로그 확인
sudo ausearch -m avc -ts recent
```

**해결책**: SELinux 컨텍스트 설정

```bash
sudo chcon -R -t httpd_sys_content_t /var/www/passkey-client
# 또는
sudo setenforce 0  # 임시로 SELinux 비활성화 (테스트용)
```

### CSS/JS 파일이 로드되지 않음

#### 원인: MIME 타입 문제

```bash
# nginx 에러 로그 확인
sudo tail -f /var/log/nginx/passkey-client-error.log
```

**해결책**: nginx에서 MIME 타입 확인

```bash
# /etc/nginx/mime.types 확인
cat /etc/nginx/mime.types | grep -E "js|css"
```

### SPA 라우팅 문제 (새로고침 시 404)

#### 원인: nginx가 SPA 라우팅을 처리하지 못함

**해결책**: `try_files` 설정 확인

nginx 설정에 다음이 포함되어 있는지 확인:

```nginx
location /client/ {
    alias /var/www/passkey-client/;
    try_files $uri $uri/ /client/index.html;
}
```

### API 연결 실패

#### CORS 오류

브라우저 콘솔에 CORS 오류가 표시되는 경우:

**해결책**: API 서버의 CORS 설정 확인 또는 nginx에서 프록시 설정

```nginx
location /api/ {
    proxy_pass https://localhost:8005/;
    # CORS 헤더 추가
    add_header Access-Control-Allow-Origin * always;
}
```

---

## 배포 자동화 (CI/CD)

### GitHub Actions 예시

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Build
        run: |
          npm install
          ./scripts/build-production.sh --qa

      - name: Deploy to Server
        run: |
          scp artifacts/*.tar.gz user@server:/opt/
          ssh user@server 'cd /opt && tar xzf passkey-client-*.tar.gz && cd passkey-client-* && sudo ./deploy-static.sh'
```

---

## 체크리스트

### 빌드 전

- [ ] 코드 변경사항 커밋
- [ ] 버전 정보 업데이트 (필요시)
- [ ] 환경 변수 확인 (.env.qa)

### 빌드 중

- [ ] ESLint 통과
- [ ] TypeScript 타입 체크 통과
- [ ] 빌드 성공
- [ ] 체크섬 생성

### 배포 전

- [ ] 빌드 산출물 검증
- [ ] SSL 인증서 유효성 확인
- [ ] 서버 디스크 공간 확인
- [ ] 백업 (기존 버전)

### 배포 후

- [ ] 파일 권한 확인
- [ ] nginx 설정 테스트
- [ ] 서비스 정상 작동 확인
- [ ] 로그 모니터링
- [ ] 사용자 접속 테스트

---

## 추가 리소스

- **빌드 스크립트**: `scripts/build-production.sh`
- **nginx 설정**: `deploy/nginx/passkey-static.conf`
- **배포 가이드**: 각 아티팩트의 `DEPLOY-README.md`

---

**작성일**: 2026-01-30
**버전**: 1.0.0
**작성자**: CROSSCERT
