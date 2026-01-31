#!/bin/bash

################################################################################
# FIDO2 Passkey Client - Production Build Script
#
# 이 스크립트는 프로덕션 빌드를 생성하고 배포 아티팩트를 패키징합니다.
#
# Usage:
#   ./scripts/build-production.sh [--qa|--prod]
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

# Configuration
BUILD_ENV="qa"
BUILD_DIR="dist"
ARTIFACT_DIR="artifacts"
VERSION=$(date +%Y%m%d-%H%M%S)

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  🔨 Production Build - Passkey Client                 ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo ""
    echo -e "${BLUE}═══${NC} $1"
}

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --qa)
                BUILD_ENV="qa"
                shift
                ;;
            --prod)
                BUILD_ENV="prod"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--qa|--prod]"
                echo ""
                echo "Options:"
                echo "  --qa      Build for QA environment (default)"
                echo "  --prod    Build for production environment"
                echo "  --help    Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    print_step "사전 요구사항 확인"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js가 설치되어 있지 않습니다"
        exit 1
    fi
    print_success "Node.js version: $(node -v)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm이 설치되어 있지 않습니다"
        exit 1
    fi
    print_success "npm version: $(npm -v)"

    # Check if in project root
    if [ ! -f "package.json" ]; then
        print_error "프로젝트 루트 디렉토리에서 실행해주세요"
        exit 1
    fi
    print_success "프로젝트 루트 확인"
}

# Install dependencies
install_dependencies() {
    print_step "의존성 설치"

    if [ ! -d "node_modules" ]; then
        print_info "node_modules가 없습니다. 의존성을 설치합니다..."
        npm install
    else
        print_info "의존성 업데이트 확인 중..."
        npm install
    fi

    print_success "의존성 설치 완료"
}

# Run quality checks
run_quality_checks() {
    print_step "코드 품질 검사"

    # ESLint
    print_info "ESLint 실행 중..."
    if npm run lint; then
        print_success "ESLint 통과"
    else
        print_error "ESLint 실패"
        exit 1
    fi

    # TypeScript type check
    print_info "TypeScript 타입 체크 중..."
    if npm run type-check; then
        print_success "타입 체크 통과"
    else
        print_error "타입 체크 실패"
        exit 1
    fi
}

# Clean previous builds
clean_build() {
    print_step "이전 빌드 정리"

    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
        print_success "이전 빌드 디렉토리 삭제"
    fi

    if [ -d "$ARTIFACT_DIR" ]; then
        rm -rf "$ARTIFACT_DIR"
        print_success "이전 아티팩트 디렉토리 삭제"
    fi
}

# Build application
build_application() {
    print_step "애플리케이션 빌드"

    print_info "환경: $BUILD_ENV"

    if [ "$BUILD_ENV" = "qa" ]; then
        npm run build:qa
    else
        npm run build
    fi

    print_success "빌드 완료"

    # Show build output size
    if [ -d "$BUILD_DIR" ]; then
        SIZE=$(du -sh "$BUILD_DIR" | awk '{print $1}')
        print_info "빌드 산출물 크기: $SIZE"
    fi
}

# Create artifact structure
create_artifact() {
    print_step "배포 아티팩트 생성"

    # Create artifact directory
    mkdir -p "$ARTIFACT_DIR"

    # Create release directory
    RELEASE_DIR="$ARTIFACT_DIR/passkey-client-$BUILD_ENV-$VERSION"
    mkdir -p "$RELEASE_DIR"

    # Copy build output
    print_info "빌드 산출물 복사 중..."
    cp -r "$BUILD_DIR" "$RELEASE_DIR/"
    print_success "빌드 산출물 복사 완료"

    # Copy deployment configurations
    print_info "배포 설정 파일 복사 중..."
    mkdir -p "$RELEASE_DIR/deploy"

    # Copy nginx config
    cp -r deploy/nginx "$RELEASE_DIR/deploy/"

    # Copy systemd config
    cp -r deploy/systemd "$RELEASE_DIR/deploy/"

    # Copy deployment scripts
    cp deploy/deploy-rhel.sh "$RELEASE_DIR/deploy/" 2>/dev/null || true

    print_success "배포 설정 파일 복사 완료"

    # Create deployment README
    create_deployment_readme "$RELEASE_DIR"

    # Create version info
    create_version_info "$RELEASE_DIR"

    print_success "아티팩트 구조 생성 완료"
}

# Create deployment README
create_deployment_readme() {
    local release_dir=$1

    cat > "$release_dir/DEPLOY-README.md" << 'EOF'
# Passkey Client - 배포 가이드

## 배포 산출물 구조

```
passkey-client-{env}-{version}/
├── dist/                      # 빌드된 정적 파일
│   ├── index.html
│   ├── assets/
│   └── ...
├── deploy/                    # 배포 설정
│   ├── nginx/                 # nginx 설정
│   └── systemd/               # systemd 서비스
├── DEPLOY-README.md           # 이 파일
└── VERSION.txt                # 버전 정보
```

## 빠른 배포

### 방법 1: nginx로 정적 파일 서빙 (권장)

```bash
# 1. 파일 압축 해제
tar xzf passkey-client-*.tar.gz
cd passkey-client-*

# 2. 정적 파일 복사
sudo mkdir -p /var/www/passkey-client
sudo cp -r dist/* /var/www/passkey-client/

# 3. nginx 설정
sudo cp deploy/nginx/passkey-static.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

### 방법 2: 자동 배포 스크립트

```bash
cd passkey-client-*
sudo ./deploy-static.sh
```

## 접속

- URL: https://passkey.crosscert.com/client
- 로컬 테스트: http://localhost/client

## 문제 해결

### nginx 502 에러
```bash
# 파일 권한 확인
sudo chown -R nginx:nginx /var/www/passkey-client

# SELinux 설정
sudo chcon -R -t httpd_sys_content_t /var/www/passkey-client
```

### 파일을 찾을 수 없음
```bash
# nginx 설정의 root 경로 확인
grep -r "root" /etc/nginx/conf.d/passkey-static.conf
```
EOF

    print_success "배포 README 생성 완료"
}

# Create version info
create_version_info() {
    local release_dir=$1

    cat > "$release_dir/VERSION.txt" << EOF
Build Environment: $BUILD_ENV
Build Version: $VERSION
Build Date: $(date '+%Y-%m-%d %H:%M:%S')
Node Version: $(node -v)
npm Version: $(npm -v)
Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
EOF

    print_success "버전 정보 생성 완료"
}

# Create deployment script for static files
create_deployment_script() {
    print_step "배포 스크립트 생성"

    local release_dir="$ARTIFACT_DIR/passkey-client-$BUILD_ENV-$VERSION"

    cat > "$release_dir/deploy-static.sh" << 'DEPLOY_SCRIPT'
#!/bin/bash
################################################################################
# Static Files Deployment Script
################################################################################

set -e

INSTALL_DIR="/var/www/passkey-client"
NGINX_CONF="/etc/nginx/conf.d/passkey-static.conf"

echo "📂 설치 디렉토리 생성 중..."
mkdir -p $INSTALL_DIR

echo "📦 정적 파일 복사 중..."
cp -r dist/* $INSTALL_DIR/

echo "🔧 권한 설정 중..."
chown -R nginx:nginx $INSTALL_DIR
chmod -R 755 $INSTALL_DIR

echo "⚙️  nginx 설정 중..."
if [ -f "deploy/nginx/passkey-static.conf" ]; then
    cp deploy/nginx/passkey-static.conf $NGINX_CONF

    # nginx 설정 테스트
    if nginx -t; then
        echo "✓ nginx 설정 유효"
    else
        echo "✗ nginx 설정 오류"
        exit 1
    fi

    # nginx 재시작
    systemctl reload nginx
    echo "✓ nginx 재시작 완료"
else
    echo "⚠️  nginx 설정 파일을 찾을 수 없습니다"
fi

echo ""
echo "✅ 배포 완료!"
echo ""
echo "접속 URL: https://passkey.crosscert.com/client"
DEPLOY_SCRIPT

    chmod +x "$release_dir/deploy-static.sh"
    print_success "배포 스크립트 생성 완료"
}

# Package artifact
package_artifact() {
    print_step "아티팩트 패키징"

    local release_dir="passkey-client-$BUILD_ENV-$VERSION"
    local archive_name="$release_dir.tar.gz"

    cd "$ARTIFACT_DIR"

    print_info "압축 중... $archive_name"
    tar czf "$archive_name" "$release_dir"

    cd ..

    # Calculate checksums
    print_info "체크섬 생성 중..."
    cd "$ARTIFACT_DIR"
    sha256sum "$archive_name" > "$archive_name.sha256"
    md5sum "$archive_name" > "$archive_name.md5"
    cd ..

    print_success "패키징 완료: $archive_name"

    # Show file size
    SIZE=$(du -sh "$ARTIFACT_DIR/$archive_name" | awk '{print $1}')
    print_info "아카이브 크기: $SIZE"
}

# Generate build report
generate_build_report() {
    print_step "빌드 리포트 생성"

    local report_file="$ARTIFACT_DIR/BUILD-REPORT.txt"

    cat > "$report_file" << EOF
╔════════════════════════════════════════════════════════════╗
║            FIDO2 Passkey Client - Build Report            ║
╚════════════════════════════════════════════════════════════╝

Build Information
─────────────────────────────────────────────────────────────
Environment:        $BUILD_ENV
Version:            $VERSION
Build Date:         $(date '+%Y-%m-%d %H:%M:%S')
Builder:            $(whoami)
Host:               $(hostname)

Environment Details
─────────────────────────────────────────────────────────────
Node.js Version:    $(node -v)
npm Version:        $(npm -v)
OS:                 $(uname -s) $(uname -r)

Git Information (if available)
─────────────────────────────────────────────────────────────
Commit:             $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
Branch:             $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
Tag:                $(git describe --tags 2>/dev/null || echo "N/A")

Build Artifacts
─────────────────────────────────────────────────────────────
EOF

    # List artifacts
    cd "$ARTIFACT_DIR"
    ls -lh | grep -v "^total" | grep -v "^d" | awk '{printf "%-30s %10s %s %s %s\n", $9, $5, $6, $7, $8}' >> "$report_file"
    cd ..

    echo "" >> "$report_file"
    echo "Build completed successfully at $(date '+%Y-%m-%d %H:%M:%S')" >> "$report_file"
    echo "╚════════════════════════════════════════════════════════════╝" >> "$report_file"

    print_success "빌드 리포트 생성 완료: $report_file"
}

# Display summary
display_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}              빌드 완료!                                 ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}환경:${NC} $BUILD_ENV"
    echo -e "${BLUE}버전:${NC} $VERSION"
    echo ""
    echo -e "${BLUE}생성된 파일:${NC}"
    ls -lh "$ARTIFACT_DIR" | grep -v "^total" | grep -v "^d" | awk '{printf "  %s (%s)\n", $9, $5}'
    echo ""
    echo -e "${BLUE}배포 방법:${NC}"
    echo -e "  1. 아티팩트 서버로 전송:"
    echo -e "     ${YELLOW}scp $ARTIFACT_DIR/passkey-client-*.tar.gz user@server:/opt/${NC}"
    echo ""
    echo -e "  2. 서버에서 압축 해제:"
    echo -e "     ${YELLOW}tar xzf passkey-client-*.tar.gz${NC}"
    echo ""
    echo -e "  3. 배포 실행:"
    echo -e "     ${YELLOW}cd passkey-client-*${NC}"
    echo -e "     ${YELLOW}sudo ./deploy-static.sh${NC}"
    echo ""
    echo -e "${BLUE}체크섬 확인:${NC}"
    echo -e "  ${YELLOW}sha256sum -c passkey-client-*.tar.gz.sha256${NC}"
    echo ""
}

################################################################################
# Main
################################################################################

print_header

# Parse command line arguments
parse_arguments "$@"

# Execute build steps
check_prerequisites
install_dependencies
run_quality_checks
clean_build
build_application
create_artifact
create_deployment_script
package_artifact
generate_build_report

# Display summary
display_summary

exit 0
