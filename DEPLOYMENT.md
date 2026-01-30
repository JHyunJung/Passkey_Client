# FIDO2 Passkey Client - RHEL 8.1 배포 가이드

이 문서는 RHEL 8.1 환경에서 FIDO2 Passkey Client를 배포하는 방법을 설명합니다.

## 📋 목차

- [개요](#개요)
- [사전 요구사항](#사전-요구사항)
- [배포 아키텍처](#배포-아키텍처)
- [자동 배포](#자동-배포)
- [수동 배포](#수동-배포)
- [설정](#설정)
- [운영](#운영)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### 배포 환경 정보

| 항목 | 값 |
|------|-----|
| **OS** | RHEL 8.1 |
| **도메인** | https://passkey.crosscert.com/client |
| **애플리케이션 포트** | 8003 (localhost) |
| **API 서버 포트** | 8005 (localhost) |
| **리버스 프록시** | nginx |
| **프로세스 관리** | systemd |
| **환경** | QA |

### 네트워크 구성

```
Internet
    ↓
[nginx :443]
    ↓ (reverse proxy)
[Passkey Client :8003] → [FIDO2 Server :8005]
```

---

## 사전 요구사항

### 시스템 요구사항

- **OS**: Red Hat Enterprise Linux 8.1 이상
- **CPU**: 2 Core 이상
- **RAM**: 4GB 이상
- **Disk**: 10GB 이상 여유 공간

### 소프트웨어 요구사항

1. **Node.js 18 이상**
   ```bash
   # NodeSource 저장소 추가
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

   # Node.js 설치
   sudo yum install -y nodejs

   # 버전 확인
   node -v  # v18.0.0 이상
   npm -v
   ```

2. **nginx**
   ```bash
   sudo yum install -y nginx
   ```

3. **Git**
   ```bash
   sudo yum install -y git
   ```

4. **SSL 인증서**
   - `passkey.crosscert.com`에 대한 유효한 SSL 인증서 필요
   - 인증서 파일 위치: `/etc/pki/tls/certs/passkey.crosscert.com.crt`
   - 키 파일 위치: `/etc/pki/tls/private/passkey.crosscert.com.key`

### 네트워크 요구사항

- **방화벽 포트**: 80 (HTTP), 443 (HTTPS) 개방 필요
- **DNS 설정**: `passkey.crosscert.com`이 서버 IP로 해석되어야 함

---

## 배포 아키텍처

### 디렉토리 구조

```
/opt/passkey-client/              # 애플리케이션 루트
├── src/                          # 소스 코드
├── public/                       # 정적 파일
├── node_modules/                 # 의존성
├── package.json                  # npm 설정
├── .env.qa                       # QA 환경 변수
└── deploy/                       # 배포 설정
    ├── nginx/
    │   └── passkey-client.conf   # nginx 설정
    ├── systemd/
    │   └── passkey-client.service # systemd 서비스
    └── deploy-rhel.sh            # 자동 배포 스크립트
```

### 서비스 구조

- **애플리케이션 사용자**: `passkey`
- **애플리케이션 그룹**: `passkey`
- **systemd 서비스**: `passkey-client.service`
- **nginx 설정**: `/etc/nginx/conf.d/passkey-client.conf`

---

## 자동 배포

### 빠른 시작 (권장)

자동 배포 스크립트를 사용하면 한 번의 명령으로 전체 배포를 완료할 수 있습니다.

```bash
# 1. 저장소 클론
cd /tmp
git clone https://github.com/JHyunJung/Passkey_Client.git
cd Passkey_Client

# 2. 배포 스크립트 실행
sudo ./deploy/deploy-rhel.sh
```

### 배포 스크립트가 수행하는 작업

1. ✅ 시스템 의존성 확인 및 설치
2. ✅ 애플리케이션 사용자 생성 (`passkey`)
3. ✅ 애플리케이션 배포 (`/opt/passkey-client`)
4. ✅ npm 의존성 설치
5. ✅ nginx 설정 및 재시작
6. ✅ systemd 서비스 설정 및 시작
7. ✅ 방화벽 설정 (포트 80, 443 개방)
8. ✅ SELinux 설정

---

## 수동 배포

자동 배포가 실패하거나 커스터마이징이 필요한 경우 수동으로 배포할 수 있습니다.

### 1. 애플리케이션 사용자 생성

```bash
sudo useradd -r -s /bin/bash -d /opt/passkey-client -m passkey
```

### 2. 애플리케이션 배포

```bash
# 저장소 클론
sudo -u passkey git clone https://github.com/JHyunJung/Passkey_Client.git /opt/passkey-client

# 의존성 설치
cd /opt/passkey-client
sudo -u passkey npm install
```

### 3. nginx 설정

```bash
# nginx 설정 복사
sudo cp /opt/passkey-client/deploy/nginx/passkey-client.conf /etc/nginx/conf.d/

# SSL 인증서 경로 수정 (필수)
sudo vi /etc/nginx/conf.d/passkey-client.conf
# ssl_certificate와 ssl_certificate_key 경로를 실제 인증서 경로로 수정

# nginx 설정 테스트
sudo nginx -t

# nginx 재시작
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4. systemd 서비스 설정

```bash
# 서비스 파일 복사
sudo cp /opt/passkey-client/deploy/systemd/passkey-client.service /etc/systemd/system/

# systemd 리로드
sudo systemctl daemon-reload

# 서비스 시작 및 활성화
sudo systemctl start passkey-client
sudo systemctl enable passkey-client

# 서비스 상태 확인
sudo systemctl status passkey-client
```

### 5. 방화벽 설정

```bash
# HTTP/HTTPS 포트 개방
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 6. SELinux 설정 (선택사항)

```bash
# SELinux 컨텍스트 설정
sudo semanage fcontext -a -t httpd_sys_content_t "/opt/passkey-client(/.*)?"
sudo restorecon -R /opt/passkey-client

# nginx가 네트워크 연결을 할 수 있도록 허용
sudo setsebool -P httpd_can_network_connect 1
```

---

## 설정

### 환경 변수 설정

QA 환경 설정은 `.env.qa` 파일에 정의되어 있습니다.

```bash
# /opt/passkey-client/.env.qa

# Vite 서버 포트
VITE_PORT=8003

# API 서버 URL (QA 환경)
VITE_API_BASE_URL=https://localhost:8005

# 환경 이름
VITE_ENV_NAME=qa
```

필요시 이 파일을 수정하여 설정을 변경할 수 있습니다.

### nginx 설정 커스터마이징

`/etc/nginx/conf.d/passkey-client.conf` 파일에서 다음 항목을 수정할 수 있습니다:

#### SSL 인증서 경로 (필수)

```nginx
ssl_certificate /etc/pki/tls/certs/passkey.crosscert.com.crt;
ssl_certificate_key /etc/pki/tls/private/passkey.crosscert.com.key;
```

#### 보안 헤더 조정

```nginx
# Content Security Policy
add_header Content-Security-Policy "..." always;
```

#### 프록시 타임아웃 조정

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

설정 변경 후 nginx 재시작:

```bash
sudo nginx -t  # 설정 검증
sudo systemctl reload nginx
```

---

## 운영

### 서비스 관리

#### 서비스 상태 확인

```bash
sudo systemctl status passkey-client
```

#### 서비스 시작/중지/재시작

```bash
sudo systemctl start passkey-client
sudo systemctl stop passkey-client
sudo systemctl restart passkey-client
```

#### 서비스 로그 확인

```bash
# 실시간 로그 조회
sudo journalctl -u passkey-client -f

# 최근 100줄 로그 조회
sudo journalctl -u passkey-client -n 100

# 오늘 로그 조회
sudo journalctl -u passkey-client --since today
```

### nginx 관리

#### nginx 상태 확인

```bash
sudo systemctl status nginx
```

#### nginx 재시작 (설정 변경 시)

```bash
sudo systemctl reload nginx  # 무중단 재시작 (권장)
sudo systemctl restart nginx # 완전 재시작
```

#### nginx 로그 확인

```bash
# Access 로그
sudo tail -f /var/log/nginx/passkey-client-access.log

# Error 로그
sudo tail -f /var/log/nginx/passkey-client-error.log
```

### 애플리케이션 업데이트

```bash
# 애플리케이션 디렉토리로 이동
cd /opt/passkey-client

# 최신 코드 가져오기
sudo -u passkey git pull

# 의존성 업데이트 (필요시)
sudo -u passkey npm install

# 서비스 재시작
sudo systemctl restart passkey-client
```

### 헬스 체크

```bash
# 로컬 애플리케이션 확인
curl http://localhost:8003/

# nginx 프록시를 통한 확인
curl https://passkey.crosscert.com/client/

# API 서버 확인
curl https://localhost:8005/health
```

---

## 트러블슈팅

### 서비스가 시작되지 않을 때

#### 1. 서비스 로그 확인

```bash
sudo journalctl -u passkey-client -n 100 --no-pager
```

#### 2. Node.js 버전 확인

```bash
node -v  # 18.0.0 이상이어야 함
```

#### 3. 포트 충돌 확인

```bash
sudo lsof -i :8003
```

포트가 이미 사용 중이면 해당 프로세스를 종료하거나 포트를 변경합니다.

#### 4. 권한 확인

```bash
ls -la /opt/passkey-client
# passkey 사용자가 소유하고 있어야 함
```

### nginx 502 Bad Gateway 오류

#### 1. 애플리케이션 상태 확인

```bash
sudo systemctl status passkey-client
```

#### 2. SELinux 확인

```bash
sudo setsebool -P httpd_can_network_connect 1
```

#### 3. 방화벽 확인

```bash
sudo firewall-cmd --list-all
```

### SSL 인증서 오류

#### 인증서 경로 확인

```bash
ls -l /etc/pki/tls/certs/passkey.crosscert.com.crt
ls -l /etc/pki/tls/private/passkey.crosscert.com.key
```

#### 인증서 권한 확인

```bash
sudo chmod 644 /etc/pki/tls/certs/passkey.crosscert.com.crt
sudo chmod 600 /etc/pki/tls/private/passkey.crosscert.com.key
```

### 연결 타임아웃 문제

#### nginx 타임아웃 증가

`/etc/nginx/conf.d/passkey-client.conf`:

```nginx
proxy_connect_timeout 120s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;
```

### API 서버 연결 실패

#### 1. API 서버 상태 확인

```bash
curl https://localhost:8005/health
```

#### 2. 방화벽 규칙 확인

로컬호스트 간 통신이므로 방화벽 문제는 없지만, SELinux가 차단할 수 있습니다.

```bash
sudo ausearch -m avc -ts recent
```

#### 3. .env.qa 설정 확인

```bash
cat /opt/passkey-client/.env.qa
# VITE_API_BASE_URL이 https://localhost:8005로 설정되어 있는지 확인
```

---

## 성능 튜닝

### systemd 리소스 제한 조정

`/etc/systemd/system/passkey-client.service`:

```ini
[Service]
LimitNOFILE=65536      # 파일 디스크립터 제한
LimitNPROC=4096        # 프로세스 수 제한
```

### nginx 워커 프로세스 조정

`/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;  # CPU 코어 수에 맞춰 자동 설정
worker_connections 1024;
```

---

## 보안 권장사항

1. **정기적인 업데이트**
   ```bash
   sudo yum update -y
   ```

2. **SSL/TLS 설정**
   - TLS 1.2 이상만 허용
   - 강력한 암호화 스위트 사용

3. **방화벽**
   - 필요한 포트만 개방 (80, 443)
   - 내부 포트 (8003, 8005)는 외부 노출 금지

4. **로그 모니터링**
   ```bash
   # 실패한 로그인 시도 확인
   sudo grep "401\|403" /var/log/nginx/passkey-client-access.log
   ```

5. **정기적인 백업**
   ```bash
   # 애플리케이션 백업
   sudo tar -czf /backup/passkey-client-$(date +%Y%m%d).tar.gz /opt/passkey-client
   ```

---

## 추가 리소스

- **GitHub 저장소**: https://github.com/JHyunJung/Passkey_Client
- **프로젝트 문서**: [README.md](./README.md)
- **API 문서**: [API.md](./API.md)
- **아키텍처 문서**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **서버 연동 가이드**: [SERVER_INTEGRATION_GUIDE.md](./SERVER_INTEGRATION_GUIDE.md)

---

## 문의 및 지원

문제가 발생하거나 도움이 필요한 경우:

1. GitHub Issues: https://github.com/JHyunJung/Passkey_Client/issues
2. 로그 파일 첨부:
   - systemd 로그: `sudo journalctl -u passkey-client -n 500 > app.log`
   - nginx 로그: `/var/log/nginx/passkey-client-*.log`

---

**작성일**: 2026-01-30
**버전**: 1.0.0
**작성자**: CROSSCERT
