#!/bin/bash

################################################################################
# Docker 오프라인 배포 준비 스크립트
#
# 이 스크립트는 GitHub 없이 Docker 이미지를 빌드하고
# 서버로 전송할 파일들을 준비합니다.
#
# Usage: ./prepare-offline.sh
#
# Author: CROSSCERT
# Date: 2026-01-30
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  📦 Docker 오프라인 배포 준비                        ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if in project root
if [ ! -f "docker-compose.yml" ]; then
    print_error "프로젝트 루트 디렉토리에서 실행해주세요"
    exit 1
fi

print_header

# Step 1: Build Docker images
print_info "Docker 이미지 빌드 중..."
if docker-compose build; then
    print_success "이미지 빌드 완료"
else
    print_error "이미지 빌드 실패"
    exit 1
fi

echo ""

# Step 2: Save images to tar files
print_info "Docker 이미지를 파일로 저장 중..."

# Get image name from docker-compose
IMAGE_NAME=$(docker-compose config | grep 'image:' | head -1 | awk '{print $2}')
if [ -z "$IMAGE_NAME" ]; then
    # If no image name in compose, use default
    IMAGE_NAME="fido2_client-passkey-client:latest"
fi

# Save passkey-client image
print_info "  - passkey-client 이미지 저장..."
if docker save "$IMAGE_NAME" | gzip > passkey-client-image.tar.gz; then
    SIZE=$(du -h passkey-client-image.tar.gz | awk '{print $1}')
    print_success "  passkey-client-image.tar.gz 생성 완료 ($SIZE)"
else
    print_error "  이미지 저장 실패"
    exit 1
fi

# Save nginx image
print_info "  - nginx 이미지 저장..."
if docker save nginx:1.24-alpine | gzip > nginx-image.tar.gz; then
    SIZE=$(du -h nginx-image.tar.gz | awk '{print $1}')
    print_success "  nginx-image.tar.gz 생성 완료 ($SIZE)"
else
    print_error "  nginx 이미지 저장 실패"
    exit 1
fi

echo ""

# Step 3: Create config archive
print_info "설정 파일 압축 중..."
if tar czf passkey-config.tar.gz \
    docker-compose.yml \
    deploy/docker/ \
    --exclude='deploy/docker/ssl/*' \
    --exclude='*.sh' \
    2>/dev/null; then
    SIZE=$(du -h passkey-config.tar.gz | awk '{print $1}')
    print_success "passkey-config.tar.gz 생성 완료 ($SIZE)"
else
    print_error "설정 파일 압축 실패"
    exit 1
fi

echo ""

# Step 4: Create deployment script
print_info "서버 배포 스크립트 생성 중..."
cat > deploy-server.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
################################################################################
# 서버 배포 스크립트
################################################################################

set -e

DEPLOY_DIR="/opt/passkey-client"

echo "📂 배포 디렉토리 생성 중..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

echo "📥 Docker 이미지 로드 중..."
if [ -f passkey-client-image.tar.gz ]; then
    docker load -i passkey-client-image.tar.gz
    echo "✓ passkey-client 이미지 로드 완료"
else
    echo "✗ passkey-client-image.tar.gz 파일을 찾을 수 없습니다"
    exit 1
fi

if [ -f nginx-image.tar.gz ]; then
    docker load -i nginx-image.tar.gz
    echo "✓ nginx 이미지 로드 완료"
fi

echo "📦 설정 파일 압축 해제 중..."
if [ -f passkey-config.tar.gz ]; then
    tar xzf passkey-config.tar.gz
    echo "✓ 설정 파일 압축 해제 완료"
else
    echo "✗ passkey-config.tar.gz 파일을 찾을 수 없습니다"
    exit 1
fi

echo "🔐 SSL 인증서 확인 중..."
mkdir -p deploy/docker/ssl
if [ ! -f deploy/docker/ssl/passkey.crosscert.com.crt ]; then
    echo "⚠️  SSL 인증서가 없습니다."
    echo "자체 서명 인증서를 생성하시겠습니까? (y/n)"
    read -r REPLY
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
          -keyout deploy/docker/ssl/passkey.crosscert.com.key \
          -out deploy/docker/ssl/passkey.crosscert.com.crt \
          -subj "/C=KR/ST=Seoul/L=Seoul/O=CROSSCERT/CN=passkey.crosscert.com"
        echo "✓ 자체 서명 인증서 생성 완료"
    else
        echo "다음 경로에 인증서를 배치하세요:"
        echo "  $DEPLOY_DIR/deploy/docker/ssl/passkey.crosscert.com.crt"
        echo "  $DEPLOY_DIR/deploy/docker/ssl/passkey.crosscert.com.key"
        exit 1
    fi
fi

echo "🚀 컨테이너 시작 중..."
docker-compose up -d

echo ""
echo "✅ 배포 완료!"
echo ""
echo "상태 확인: docker-compose ps"
echo "로그 확인: docker-compose logs -f"
echo "접속 URL: https://passkey.crosscert.com/client"
DEPLOY_SCRIPT

chmod +x deploy-server.sh
print_success "deploy-server.sh 생성 완료"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}              준비 완료!                                 ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}생성된 파일:${NC}"
ls -lh *.tar.gz deploy-server.sh 2>/dev/null | awk '{printf "  %s (%s)\n", $9, $5}'
echo ""

TOTAL_SIZE=$(du -ch *.tar.gz | tail -1 | awk '{print $1}')
echo -e "${BLUE}전체 크기: ${GREEN}$TOTAL_SIZE${NC}"
echo ""

echo -e "${BLUE}서버로 전송 명령:${NC}"
echo -e "${YELLOW}  scp *.tar.gz deploy-server.sh user@server:/opt/${NC}"
echo ""
echo -e "${BLUE}서버에서 배포 명령:${NC}"
echo -e "${YELLOW}  ssh user@server${NC}"
echo -e "${YELLOW}  cd /opt${NC}"
echo -e "${YELLOW}  sudo ./deploy-server.sh${NC}"
echo ""
