# 로컬 Docker 빌드/배포 가이드 (GitHub 없이)

이 문서는 GitHub 저장소 없이 로컬 파일만으로 Docker 이미지를 빌드하고 배포하는 방법을 설명합니다.

## 📋 목차

- [개요](#개요)
- [사전 준비](#사전-준비)
- [방법 1: 로컬 빌드 (권장)](#방법-1-로컬-빌드-권장)
- [방법 2: Docker 레지스트리 사용](#방법-2-docker-레지스트리-사용)
- [방법 3: 이미지 파일 전송](#방법-3-이미지-파일-전송)
- [트러블슈팅](#트러블슈팅)

---

## 개요

GitHub 저장소 없이 Docker를 사용하는 3가지 방법:

1. **로컬 빌드**: 서버에 직접 소스 코드를 복사하여 빌드
2. **Docker 레지스트리**: 로컬 레지스트리에 이미지 푸시 후 배포
3. **이미지 파일 전송**: 빌드한 이미지를 tar 파일로 저장하여 전송

---

## 사전 준비

### 1. 소스 코드 준비

프로젝트 디렉토리를 압축합니다:

```bash
# 현재 프로젝트 디렉토리에서 실행
cd /Users/jhyun/Git/Kotlin/Fido2_Client

# 압축 (불필요한 파일 제외)
tar czf passkey-client.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='.serena' \
  --exclude='.playwright-mcp' \
  .
```

### 2. 서버로 전송

```bash
# SCP로 전송
scp passkey-client.tar.gz user@server:/opt/

# 또는 USB, 네트워크 공유 등 다른 방법 사용
```

---

## 방법 1: 로컬 빌드 (권장)

서버에서 직접 소스 코드를 빌드하는 방법입니다.

### 단계 1: 서버 접속 및 압축 해제

```bash
# 서버 접속
ssh user@server

# 작업 디렉토리 생성
sudo mkdir -p /opt/passkey-client
cd /opt/passkey-client

# 압축 해제
sudo tar xzf /opt/passkey-client.tar.gz -C /opt/passkey-client
```

### 단계 2: SSL 인증서 준비

```bash
# SSL 디렉토리 생성
mkdir -p /opt/passkey-client/deploy/docker/ssl

# 인증서 복사 또는 생성
# 방법 A: 기존 인증서 복사
cp /path/to/your/cert.crt deploy/docker/ssl/passkey.crosscert.com.crt
cp /path/to/your/key.key deploy/docker/ssl/passkey.crosscert.com.key

# 방법 B: 자체 서명 인증서 생성 (테스트용)
cd /opt/passkey-client/deploy/docker/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout passkey.crosscert.com.key \
  -out passkey.crosscert.com.crt \
  -subj "/CN=passkey.crosscert.com"
```

### 단계 3: Docker 이미지 빌드

```bash
cd /opt/passkey-client

# 이미지 빌드
docker-compose build

# 빌드 확인
docker images | grep passkey
```

### 단계 4: 컨테이너 실행

```bash
# 백그라운드로 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

### 단계 5: 동작 확인

```bash
# 로컬 테스트
curl http://localhost/client/

# HTTPS 테스트
curl -k https://localhost/client/

# 헬스 체크
curl http://localhost/health
```

---

## 방법 2: Docker 레지스트리 사용

로컬 또는 사설 Docker 레지스트리를 사용하는 방법입니다.

### 로컬 레지스트리 설정

#### 1. 레지스트리 서버 실행

```bash
# 개발 머신에서 레지스트리 실행
docker run -d -p 5000:5000 --name registry registry:2

# 또는 보안 레지스트리 (HTTPS)
docker run -d -p 5000:5000 --restart=always --name registry \
  -v /path/to/certs:/certs \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  registry:2
```

#### 2. 이미지 빌드 및 푸시

```bash
# 개발 머신에서
cd /Users/jhyun/Git/Kotlin/Fido2_Client

# 레지스트리 주소로 태그
docker build -t localhost:5000/passkey-client:latest .

# 레지스트리에 푸시
docker push localhost:5000/passkey-client:latest
```

#### 3. 서버에서 이미지 가져오기

```bash
# 서버에서 (레지스트리 주소를 실제 IP로 변경)
docker pull 192.168.1.100:5000/passkey-client:latest

# 태그 변경
docker tag 192.168.1.100:5000/passkey-client:latest passkey-client:latest

# docker-compose.yml 수정 (image 사용)
# services:
#   passkey-client:
#     image: passkey-client:latest
#     # build 섹션 제거

# 실행
docker-compose up -d
```

### Insecure 레지스트리 설정 (HTTP 사용 시)

서버의 Docker 데몬 설정:

```bash
# /etc/docker/daemon.json 편집
sudo vi /etc/docker/daemon.json
```

```json
{
  "insecure-registries": ["192.168.1.100:5000"]
}
```

```bash
# Docker 재시작
sudo systemctl restart docker
```

---

## 방법 3: 이미지 파일 전송

빌드한 Docker 이미지를 파일로 저장하여 전송하는 방법입니다.

### 단계 1: 개발 머신에서 이미지 빌드

```bash
cd /Users/jhyun/Git/Kotlin/Fido2_Client

# 이미지 빌드
docker-compose build
```

### 단계 2: 이미지를 tar 파일로 저장

```bash
# passkey-client 이미지 저장
docker save fido2_client-passkey-client:latest -o passkey-client-image.tar

# nginx-proxy 이미지 저장 (필요시)
docker save nginx:1.24-alpine -o nginx-proxy-image.tar

# 또는 압축하여 저장 (용량 절약)
docker save fido2_client-passkey-client:latest | gzip > passkey-client-image.tar.gz
```

### 단계 3: 서버로 전송

```bash
# SCP로 전송
scp passkey-client-image.tar.gz user@server:/opt/

# 또는 USB, 네트워크 공유 등
```

### 단계 4: 서버에서 이미지 로드

```bash
# 서버 접속
ssh user@server

# 압축된 이미지 로드
docker load -i /opt/passkey-client-image.tar.gz

# 또는 압축되지 않은 이미지
docker load -i /opt/passkey-client-image.tar

# 이미지 확인
docker images | grep passkey
```

### 단계 5: 소스 코드 및 설정 파일 전송

이미지만으로는 부족하며, docker-compose.yml과 설정 파일도 필요합니다:

```bash
# 개발 머신에서 필요한 파일만 압축
cd /Users/jhyun/Git/Kotlin/Fido2_Client
tar czf passkey-config.tar.gz \
  docker-compose.yml \
  deploy/docker/

# 서버로 전송
scp passkey-config.tar.gz user@server:/opt/passkey-client/

# 서버에서 압축 해제
cd /opt/passkey-client
tar xzf passkey-config.tar.gz
```

### 단계 6: docker-compose.yml 수정

서버에서 `docker-compose.yml` 편집:

```yaml
services:
  passkey-client:
    # build 섹션을 image로 변경
    image: fido2_client-passkey-client:latest
    # build:
    #   context: .
    #   dockerfile: Dockerfile
    # 나머지 설정은 그대로
```

### 단계 7: 컨테이너 실행

```bash
cd /opt/passkey-client

# SSL 인증서 준비 (위 방법 1 참조)
mkdir -p deploy/docker/ssl
# ... 인증서 복사 ...

# 컨테이너 실행
docker-compose up -d

# 확인
docker-compose ps
```

---

## 빠른 배포 스크립트

전체 과정을 자동화한 스크립트입니다.

### 개발 머신용 스크립트 (prepare-offline.sh)

```bash
#!/bin/bash
# 파일: prepare-offline.sh

set -e

echo "🔨 Docker 이미지 빌드 중..."
docker-compose build

echo "💾 이미지를 파일로 저장 중..."
docker save fido2_client-passkey-client:latest | gzip > passkey-client-image.tar.gz
docker save nginx:1.24-alpine | gzip > nginx-image.tar.gz

echo "📦 설정 파일 압축 중..."
tar czf passkey-config.tar.gz \
  docker-compose.yml \
  deploy/docker/ \
  --exclude='deploy/docker/ssl/*'

echo "✅ 준비 완료!"
echo ""
echo "서버로 전송할 파일:"
echo "  - passkey-client-image.tar.gz"
echo "  - nginx-image.tar.gz"
echo "  - passkey-config.tar.gz"
echo ""
echo "전송 명령 예시:"
echo "  scp *.tar.gz user@server:/opt/"
```

### 서버용 스크립트 (deploy-offline.sh)

```bash
#!/bin/bash
# 파일: deploy-offline.sh

set -e

DEPLOY_DIR="/opt/passkey-client"

echo "📂 디렉토리 준비 중..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

echo "📥 Docker 이미지 로드 중..."
if [ -f passkey-client-image.tar.gz ]; then
    docker load -i passkey-client-image.tar.gz
fi

if [ -f nginx-image.tar.gz ]; then
    docker load -i nginx-image.tar.gz
fi

echo "📦 설정 파일 압축 해제 중..."
if [ -f passkey-config.tar.gz ]; then
    tar xzf passkey-config.tar.gz
fi

echo "🔐 SSL 인증서 확인 중..."
if [ ! -f deploy/docker/ssl/passkey.crosscert.com.crt ]; then
    echo "⚠️  SSL 인증서가 없습니다."
    echo "다음 경로에 인증서를 배치하세요:"
    echo "  $DEPLOY_DIR/deploy/docker/ssl/passkey.crosscert.com.crt"
    echo "  $DEPLOY_DIR/deploy/docker/ssl/passkey.crosscert.com.key"
    exit 1
fi

echo "🚀 컨테이너 시작 중..."
docker-compose up -d

echo "✅ 배포 완료!"
echo ""
echo "상태 확인: docker-compose ps"
echo "로그 확인: docker-compose logs -f"
```

### 사용 방법

```bash
# 개발 머신에서
chmod +x prepare-offline.sh
./prepare-offline.sh

# 생성된 파일을 서버로 전송
scp *.tar.gz user@server:/opt/

# 서버에서
chmod +x deploy-offline.sh
sudo ./deploy-offline.sh
```

---

## Dockerfile 수정 (완전 오프라인)

Git 없이 완전히 로컬 파일만 사용하도록 Dockerfile이 이미 구성되어 있습니다:

```dockerfile
# 현재 Dockerfile은 이미 로컬 빌드를 지원합니다
FROM node:18-alpine AS builder
WORKDIR /app

# package.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production=false

# 소스 코드 복사
COPY . .

# 빌드
RUN npm run build:qa
```

Git 관련 명령이 없으므로 그대로 사용 가능합니다.

---

## 트러블슈팅

### 빌드 실패: npm install 오류

**문제**: 인터넷 연결 없이 npm 패키지 설치 불가

**해결책**: npm 캐시를 미리 준비

```bash
# 개발 머신에서
npm ci
npm cache verify

# npm 캐시 디렉토리 찾기
npm config get cache
# 예: /Users/jhyun/.npm

# 캐시 압축
tar czf npm-cache.tar.gz -C ~/.npm .

# 서버로 전송 및 압축 해제
scp npm-cache.tar.gz user@server:/opt/
ssh user@server
tar xzf /opt/npm-cache.tar.gz -C ~/.npm
```

### 이미지 로드 실패

**문제**: `Error response from daemon: open /var/lib/docker/tmp/...`

**해결책**: Docker 데몬 재시작

```bash
sudo systemctl restart docker
docker load -i passkey-client-image.tar.gz
```

### 컨테이너 시작 실패: 이미지를 찾을 수 없음

**문제**: `Error: No such image: fido2_client-passkey-client:latest`

**해결책**: 이미지 이름 확인 및 재태그

```bash
# 로드된 이미지 확인
docker images

# 이름이 다르면 재태그
docker tag <actual-image-name> fido2_client-passkey-client:latest
```

### SSL 인증서 오류

**문제**: 인증서 파일이 없음

**해결책**: 자체 서명 인증서 생성

```bash
cd /opt/passkey-client/deploy/docker/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout passkey.crosscert.com.key \
  -out passkey.crosscert.com.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=CROSSCERT/CN=passkey.crosscert.com"
```

---

## 완전 오프라인 배포 체크리스트

- [ ] 소스 코드 압축 (passkey-client.tar.gz)
- [ ] Docker 이미지 저장 (passkey-client-image.tar.gz)
- [ ] nginx 이미지 저장 (nginx-image.tar.gz)
- [ ] 설정 파일 압축 (passkey-config.tar.gz)
- [ ] SSL 인증서 준비
- [ ] npm 캐시 준비 (선택사항)
- [ ] 배포 스크립트 준비
- [ ] 서버로 전송
- [ ] 서버에서 이미지 로드
- [ ] 설정 파일 압축 해제
- [ ] SSL 인증서 배치
- [ ] docker-compose up -d 실행
- [ ] 동작 확인

---

**작성일**: 2026-01-30
**버전**: 1.0.0
**작성자**: CROSSCERT
