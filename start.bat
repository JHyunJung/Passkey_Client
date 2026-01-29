@echo off
REM ############################################################################
REM FIDO2/Passkey Client - Development Server Startup Script (Windows)
REM
REM This script starts the development server with proper environment setup
REM and health checks.
REM
REM Usage:
REM   start.bat           # Start development server (default)
REM   start.bat qa        # Start QA environment
REM   start.bat prod      # Build and preview production
REM
REM Author: CROSSCERT
REM Date: 2026-01-30
REM ############################################################################

setlocal enabledelayedexpansion

REM Parse arguments
set MODE=dev
set SKIP_CHECKS=false

if "%~1"=="qa" set MODE=qa
if "%~1"=="prod" set MODE=prod
if "%~1"=="--skip-checks" set SKIP_CHECKS=true
if "%~2"=="--skip-checks" set SKIP_CHECKS=true
if "%~1"=="--help" goto :usage
if "%~1"=="-h" goto :usage

REM Print header
echo.
echo ================================================================
echo   FIDO2/Passkey Client - Startup Script (Windows)
echo ================================================================
echo.

REM Check Node.js
echo [INFO] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)
node -v
echo [OK] Node.js found

REM Check npm
echo [INFO] Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed.
    exit /b 1
)
npm -v
echo [OK] npm found
echo.

REM Check dependencies
echo [INFO] Checking dependencies...
if not exist "node_modules" (
    echo [WARN] node_modules not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies found
)
echo.

REM Run quality checks unless skipped
if "%SKIP_CHECKS%"=="false" (
    echo [INFO] Running ESLint...
    call npm run lint
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] ESLint found issues. Run 'npm run lint:fix' to auto-fix.
        exit /b 1
    )
    echo [OK] Code quality check passed
    echo.

    echo [INFO] Running TypeScript type check...
    call npm run type-check
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] TypeScript type check failed
        exit /b 1
    )
    echo [OK] Type check passed
    echo.
) else (
    echo [WARN] Skipping code quality checks
    echo.
)

REM Start server based on mode
if "%MODE%"=="dev" goto :start_dev
if "%MODE%"=="qa" goto :start_qa
if "%MODE%"=="prod" goto :start_prod

:start_dev
echo [INFO] Starting development server...
echo.
echo [OK] Server will be available at: http://localhost:5173
echo [INFO] Press Ctrl+C to stop the server
echo.
call npm run dev
goto :end

:start_qa
echo [INFO] Starting QA environment...
echo.
echo [OK] Server will be available at: http://localhost:8003
echo [INFO] Press Ctrl+C to stop the server
echo.
call npm run dev:qa
goto :end

:start_prod
echo [INFO] Building production version...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [OK] Build completed
echo.
echo [INFO] Starting preview server...
echo [OK] Server will be available at: http://localhost:4173
echo [INFO] Press Ctrl+C to stop the server
echo.
call npm run preview
goto :end

:usage
echo Usage: %~nx0 [mode] [options]
echo.
echo Modes:
echo   (none)      Start development server (default)
echo   qa          Start QA environment
echo   prod        Build and preview production version
echo.
echo Options:
echo   --skip-checks    Skip lint and type checking
echo   --help           Show this help message
echo.
echo Examples:
echo   %~nx0                    # Start dev server
echo   %~nx0 qa                 # Start QA server
echo   %~nx0 prod               # Build and preview prod
echo   %~nx0 --skip-checks      # Start without checks
goto :end

:end
endlocal
