# FIDO2 Passkey Client - Docker 배포 가이드

이 문서는 Docker를 사용하여 FIDO2 Passkey Client를 배포하는 방법을 설명합니다.

## 📋 목차

- [개요](#개요)
- [사전 요구사항](#사전-요구사항)
- [Docker 아키텍처](#docker-아키텍처)
- [빠른 시작](#빠른-시작)
- [상세 배포](#상세-배포)
- [설정](#설정)
- [운영](#운영)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### Docker 배포의 장점

- ✅ **일관성**: 모든 환경에서 동일한 실행 환경
- ✅ **격리성**: 호스트 시스템과 독립적인 실행 환경
- ✅ **이식성**: 어떤 Docker 호스트에서도 실행 가능
- ✅ **확장성**: 쉬운 수평 확장 (로드 밸런싱)
- ✅ **롤백**: 빠른 버전 롤백 가능
- ✅ **리소스 효율**: 가상 머신보다 가벼움

### 배포 환경 정보

| 항목 | 값 |
|------|-----|
| **도메인** | https://passkey.crosscert.com/client |
| **컨테이너 구성** | nginx-proxy + passkey-client |
| **노출 포트** | 80 (HTTP), 443 (HTTPS) |
| **내부 네트워크** | 172.20.0.0/24 (bridge) |
| **API 서버** | https://localhost:8005 (호스트) |

---

## 사전 요구사항

### 1. Docker 설치

#### RHEL 8.1

```bash
# Docker 저장소 추가
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo

# Docker 설치
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Docker 시작 및 활성화
sudo systemctl start docker
sudo systemctl enable docker

# 버전 확인
docker --version
```

#### Ubuntu/Debian

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 버전 확인
docker --version
```

### 2. docker-compose 설치

```bash
# docker-compose 다운로드
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 실행 권한 부여
sudo chmod +x /usr/local/bin/docker-compose

# 버전 확인
docker-compose --version
```

### 3. SSL 인증서 준비

SSL 인증서를 `deploy/docker/ssl/` 디렉토리에 배치합니다:

```bash
# SSL 디렉토리 생성
mkdir -p deploy/docker/ssl

# 인증서 복사 (실제 인증서 파일 경로로 변경)
cp /path/to/your/passkey.crosscert.com.crt deploy/docker/ssl/
cp /path/to/your/passkey.crosscert.com.key deploy/docker/ssl/
```

#### 테스트용 자체 서명 인증서 생성 (선택사항)

```bash
cd deploy/docker/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout passkey.crosscert.com.key \
  -out passkey.crosscert.com.crt \
  -subj "/CN=passkey.crosscert.com"
```

---

## Docker 아키텍처

### 컨테이너 구성

```
┌─────────────────────────────────────────────────┐
│  Internet                                       │
└──────────────────┬──────────────────────────────┘
                   │
           ┌───────▼────────┐
           │  nginx-proxy   │  Port 80/443
           │  (Container)   │  SSL Termination
           └───────┬────────┘
                   │ HTTP (internal)
           ┌───────▼────────┐
           │ passkey-client │  Port 80 (internal)
           │  (Container)   │  Static Files
           └────────────────┘
                   │
         ┌─────────┴─────────┐
         │  passkey-network  │  172.20.0.0/24
         │   (Docker Bridge) │
         └───────────────────┘
```

### 이미지 구조

**passkey-client 이미지** (Multi-stage build):

1. **Stage 1 (Builder)**:
   - Base: `node:18-alpine`
   - npm 의존성 설치
   - QA 환경 빌드 (`npm run build:qa`)

2. **Stage 2 (Runtime)**:
   - Base: `nginx:1.24-alpine`
   - 빌드된 정적 파일만 복사
   - nginx로 서빙
   - 최소 크기 (~50MB)

### 네트워크 구성

- **passkey-network**: 172.20.0.0/24 (Bridge 네트워크)
  - `nginx-proxy`: 자동 할당 IP
  - `passkey-client`: 자동 할당 IP
  - 컨테이너 간 이름으로 통신 (Docker DNS)

---

## 빠른 시작

### 원라인 배포 (권장)

```bash
# 저장소 클론
git clone https://github.com/JHyunJung/Passkey_Client.git
cd Passkey_Client

# SSL 인증서 준비 (위 "SSL 인증서 준비" 섹션 참조)
mkdir -p deploy/docker/ssl
# ... 인증서 복사 ...

# 배포 실행
./deploy/docker/deploy-docker.sh start
```

완료! 애플리케이션이 `https://passkey.crosscert.com/client`에서 실행됩니다.

---

## 상세 배포

### 1. 프로젝트 준비

```bash
# 저장소 클론
git clone https://github.com/JHyunJung/Passkey_Client.git
cd Passkey_Client

# 디렉토리 구조 확인
ls -la deploy/docker/
```

### 2. SSL 인증서 설정

```bash
# SSL 디렉토리 생성
mkdir -p deploy/docker/ssl

# 인증서 복사
cp /path/to/passkey.crosscert.com.crt deploy/docker/ssl/
cp /path/to/passkey.crosscert.com.key deploy/docker/ssl/

# 권한 설정
chmod 644 deploy/docker/ssl/passkey.crosscert.com.crt
chmod 600 deploy/docker/ssl/passkey.crosscert.com.key
```

### 3. Docker 이미지 빌드

```bash
# 이미지 빌드
docker-compose build

# 빌드 확인
docker images | grep passkey
```

### 4. 컨테이너 시작

```bash
# 백그라운드로 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 5. 상태 확인

```bash
# 컨테이너 상태
docker-compose ps

# 헬스 체크
docker inspect passkey-client | grep -A 5 Health

# 애플리케이션 접속 테스트
curl -k https://localhost/client/
```

---

## 설정

### 환경 변수 설정

`docker-compose.yml`에서 환경 변수를 수정할 수 있습니다:

```yaml
services:
  passkey-client:
    environment:
      - TZ=Asia/Seoul                    # 시간대
      - NGINX_WORKER_PROCESSES=auto      # nginx 워커 프로세스 수
```

### 리소스 제한 조정

CPU 및 메모리 제한을 조정하려면:

```yaml
services:
  passkey-client:
    deploy:
      resources:
        limits:
          cpus: '2.0'      # CPU 코어 수
          memory: 1G       # 메모리 제한
```

### 포트 변경

호스트 포트를 변경하려면:

```yaml
services:
  nginx-proxy:
    ports:
      - "8080:80"     # HTTP를 8080으로
      - "8443:443"    # HTTPS를 8443으로
```

### nginx 설정 커스터마이징

- **컨테이너 내부 nginx**: `deploy/docker/default.conf`
- **리버스 프록시 nginx**: `deploy/docker/proxy-default.conf`

설정 변경 후 재시작:

```bash
docker-compose restart
```

---

## 운영

### 컨테이너 관리

#### 시작/중지/재시작

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart passkey-client
```

#### 로그 확인

```bash
# 모든 컨테이너 로그
docker-compose logs -f

# 특정 컨테이너 로그
docker-compose logs -f passkey-client

# 마지막 100줄만
docker-compose logs --tail=100 passkey-client
```

#### 컨테이너 상태 확인

```bash
# 간단한 상태
docker-compose ps

# 상세 상태
docker-compose ps -a

# 리소스 사용량
docker stats
```

### 애플리케이션 업데이트

```bash
# 1. 최신 코드 가져오기
git pull

# 2. 이미지 재빌드
docker-compose build

# 3. 무중단 재시작
docker-compose up -d

# 또는 스크립트 사용
./deploy/docker/deploy-docker.sh restart
```

### 데이터 백업

```bash
# 볼륨 백업 (로그 등)
docker run --rm \
  -v passkey-client_nginx-logs:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/logs-backup-$(date +%Y%m%d).tar.gz /data

# 설정 파일 백업
tar czf config-backup-$(date +%Y%m%d).tar.gz deploy/
```

### 스케일링

여러 개의 passkey-client 인스턴스를 실행하려면:

```bash
# 3개 인스턴스로 확장
docker-compose up -d --scale passkey-client=3

# nginx가 자동으로 로드 밸런싱
```

### 헬스 체크

```bash
# 컨테이너 헬스 상태
docker inspect passkey-client | grep -A 10 Health

# 애플리케이션 헬스 엔드포인트
curl http://localhost/health
curl https://passkey.crosscert.com/health
```

---

## 트러블슈팅

### 컨테이너가 시작되지 않을 때

#### 1. 로그 확인

```bash
docker-compose logs passkey-client
```

#### 2. 이미지 빌드 재시도

```bash
docker-compose build --no-cache
docker-compose up -d
```

#### 3. 포트 충돌 확인

```bash
sudo lsof -i :80
sudo lsof -i :443
```

### 502 Bad Gateway 오류

#### 1. 컨테이너 상태 확인

```bash
docker-compose ps
```

모든 컨테이너가 `Up (healthy)` 상태여야 합니다.

#### 2. 네트워크 연결 확인

```bash
# nginx-proxy에서 passkey-client로 연결 테스트
docker exec nginx-proxy wget -O- http://passkey-client/health
```

#### 3. 헬스 체크 로그 확인

```bash
docker inspect passkey-client | grep -A 20 Health
```

### SSL 인증서 오류

#### 인증서 파일 확인

```bash
ls -l deploy/docker/ssl/
```

두 파일이 모두 존재하고 읽기 권한이 있어야 합니다:
- `passkey.crosscert.com.crt`
- `passkey.crosscert.com.key`

#### 인증서 유효성 검사

```bash
# 인증서 내용 확인
openssl x509 -in deploy/docker/ssl/passkey.crosscert.com.crt -text -noout

# 인증서와 키 매칭 확인
openssl x509 -noout -modulus -in deploy/docker/ssl/passkey.crosscert.com.crt | openssl md5
openssl rsa -noout -modulus -in deploy/docker/ssl/passkey.crosscert.com.key | openssl md5
# 두 해시값이 같아야 함
```

### 이미지 빌드 실패

#### 빌드 캐시 삭제

```bash
docker system prune -a
docker-compose build --no-cache
```

#### Docker 디스크 공간 확인

```bash
docker system df
```

공간이 부족하면 정리:

```bash
docker system prune -a --volumes
```

### 컨테이너 재시작 루프

#### 1. 재시작 로그 확인

```bash
docker-compose logs --tail=50 passkey-client
```

#### 2. 컨테이너 내부 확인

```bash
docker exec -it passkey-client sh
# 내부에서 디버깅
```

#### 3. 헬스 체크 비활성화 (임시)

`docker-compose.yml`에서 `healthcheck` 섹션을 주석 처리하고 재시작

---

## 고급 설정

### Docker Swarm으로 클러스터 구성

```bash
# Swarm 초기화
docker swarm init

# 스택 배포
docker stack deploy -c docker-compose.yml passkey

# 서비스 확인
docker service ls
```

### Kubernetes 배포

Docker 이미지를 기반으로 Kubernetes 배포도 가능합니다:

```bash
# 이미지 빌드 및 레지스트리 푸시
docker build -t your-registry/passkey-client:latest .
docker push your-registry/passkey-client:latest

# Kubernetes 매니페스트 작성 및 배포
kubectl apply -f k8s/deployment.yaml
```

### 모니터링 추가

Prometheus + Grafana를 추가하려면 `docker-compose.yml`에:

```yaml
services:
  prometheus:
    image: prom/prometheus
    # ... 설정 ...

  grafana:
    image: grafana/grafana
    # ... 설정 ...
```

---

## 보안 권장사항

### 1. 최소 권한 원칙

컨테이너는 이미 non-root 사용자로 실행됩니다:

```dockerfile
USER nginx
```

### 2. 읽기 전용 파일 시스템

`docker-compose.yml`에서 설정됨:

```yaml
read_only: true
tmpfs:
  - /tmp
  - /var/cache/nginx
```

### 3. 정기적인 이미지 업데이트

```bash
# 베이스 이미지 업데이트
docker pull nginx:1.24-alpine
docker pull node:18-alpine

# 재빌드
docker-compose build --pull
```

### 4. 비밀 정보 관리

환경 변수 대신 Docker Secrets 사용:

```bash
# 시크릿 생성
echo "secret-value" | docker secret create my-secret -

# docker-compose.yml에서 사용
secrets:
  - my-secret
```

---

## 성능 튜닝

### nginx 워커 프로세스 최적화

CPU 코어 수에 맞춰 자동 조정 (이미 설정됨):

```nginx
worker_processes auto;
```

### 컨테이너 리소스 제한

적절한 리소스 제한으로 안정성 향상:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

### Docker 네트워크 최적화

MTU 설정 조정:

```yaml
networks:
  passkey-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1500
```

---

## 비교: Docker vs 직접 설치

| 항목 | Docker | 직접 설치 |
|------|--------|-----------|
| **설정 복잡도** | 낮음 | 높음 |
| **이식성** | 높음 | 낮음 |
| **리소스 오버헤드** | 약간 있음 | 없음 |
| **격리성** | 높음 | 낮음 |
| **업데이트** | 쉬움 | 복잡함 |
| **롤백** | 쉬움 | 어려움 |
| **디버깅** | 약간 복잡 | 쉬움 |

---

## 추가 리소스

- **Docker 공식 문서**: https://docs.docker.com/
- **docker-compose 문서**: https://docs.docker.com/compose/
- **nginx Docker 이미지**: https://hub.docker.com/_/nginx
- **프로젝트 GitHub**: https://github.com/JHyunJung/Passkey_Client

---

## 문의 및 지원

문제가 발생하면:

1. 로그 수집:
   ```bash
   docker-compose logs > docker-logs.txt
   ```

2. GitHub Issues에 로그와 함께 문의:
   https://github.com/JHyunJung/Passkey_Client/issues

---

**작성일**: 2026-01-30
**버전**: 1.0.0
**작성자**: CROSSCERT
