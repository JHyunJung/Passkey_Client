# 배포 파일 디렉토리

이 디렉토리는 RHEL 8.1 환경에서 FIDO2 Passkey Client를 배포하기 위한 설정 파일들을 포함합니다.

## 📁 구조

```
deploy/
├── nginx/
│   └── passkey-client.conf       # nginx 리버스 프록시 설정
├── systemd/
│   └── passkey-client.service    # systemd 서비스 유닛 파일
├── deploy-rhel.sh                # 자동 배포 스크립트
└── README.md                     # 이 파일
```

## 🚀 빠른 시작

### 자동 배포 (권장)

```bash
sudo ./deploy-rhel.sh
```

자동 배포 스크립트는 다음을 수행합니다:
- 시스템 의존성 확인 및 설치
- 애플리케이션 사용자 생성
- 애플리케이션 배포 및 의존성 설치
- nginx 설정 및 재시작
- systemd 서비스 등록 및 시작
- 방화벽 및 SELinux 설정

## 📄 파일 설명

### nginx/passkey-client.conf

nginx 리버스 프록시 설정 파일입니다.

**주요 설정:**
- HTTPS 리다이렉션 (HTTP → HTTPS)
- `/client` 경로를 `localhost:8003`으로 프록시
- SSL/TLS 보안 설정
- WebAuthn을 위한 CSP 헤더
- 정적 파일 캐싱

**배포 위치:** `/etc/nginx/conf.d/passkey-client.conf`

**수정 필수 항목:**
```nginx
ssl_certificate /etc/pki/tls/certs/passkey.crosscert.com.crt;
ssl_certificate_key /etc/pki/tls/private/passkey.crosscert.com.key;
```
실제 SSL 인증서 경로로 변경해야 합니다.

### systemd/passkey-client.service

systemd 서비스 유닛 파일입니다.

**주요 설정:**
- 사용자: `passkey`
- 작업 디렉토리: `/opt/passkey-client`
- 실행 명령: `npm run dev:qa`
- 자동 재시작 활성화
- 보안 강화 설정

**배포 위치:** `/etc/systemd/system/passkey-client.service`

**서비스 관리:**
```bash
sudo systemctl start passkey-client    # 시작
sudo systemctl stop passkey-client     # 중지
sudo systemctl restart passkey-client  # 재시작
sudo systemctl status passkey-client   # 상태 확인
```

### deploy-rhel.sh

RHEL 8.1 자동 배포 스크립트입니다.

**실행 권한:**
```bash
chmod +x deploy-rhel.sh
```

**사용법:**
```bash
sudo ./deploy-rhel.sh
```

## 🔧 수동 배포

자동 배포가 실패하거나 커스터마이징이 필요한 경우:

1. **애플리케이션 사용자 생성**
   ```bash
   sudo useradd -r -s /bin/bash -d /opt/passkey-client -m passkey
   ```

2. **저장소 클론**
   ```bash
   sudo -u passkey git clone https://github.com/JHyunJung/Passkey_Client.git /opt/passkey-client
   cd /opt/passkey-client
   sudo -u passkey npm install
   ```

3. **nginx 설정**
   ```bash
   sudo cp deploy/nginx/passkey-client.conf /etc/nginx/conf.d/
   sudo vi /etc/nginx/conf.d/passkey-client.conf  # SSL 경로 수정
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **systemd 서비스 등록**
   ```bash
   sudo cp deploy/systemd/passkey-client.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl start passkey-client
   sudo systemctl enable passkey-client
   ```

## 📚 상세 문서

전체 배포 가이드는 [DEPLOYMENT.md](../DEPLOYMENT.md)를 참조하세요.

## 🔍 트러블슈팅

### 서비스가 시작되지 않을 때
```bash
sudo journalctl -u passkey-client -n 100
```

### nginx 502 에러
```bash
sudo systemctl status passkey-client
sudo setsebool -P httpd_can_network_connect 1
```

### 포트 충돌 확인
```bash
sudo lsof -i :8003
```

## 📞 지원

문제가 발생하면:
1. [DEPLOYMENT.md](../DEPLOYMENT.md) 트러블슈팅 섹션 확인
2. GitHub Issues에 로그 파일과 함께 문의

---

**작성일**: 2026-01-30
**버전**: 1.0.0
