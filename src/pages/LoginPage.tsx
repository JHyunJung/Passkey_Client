import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Mail, ArrowLeft, Fingerprint, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, AnimatedBackground } from '../components/common';
import { useFido2Api } from '../hooks/useFido2Api';
import { useConfig } from '../context/ConfigContext';
import {
  isWebAuthnSupported,
  convertAuthenticationOptions,
  getCredential,
  getWebAuthnErrorMessage,
} from '../services/webauthn';

type LoginStep = 'initial' | 'authenticating' | 'success' | 'error';

// Input Field Component
interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  disabled?: boolean;
}

const InputField = ({ type, placeholder, value, onChange, icon, disabled }: InputFieldProps) => (
  <div className="relative">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </div>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "w-full h-14 pl-12 pr-4 rounded-xl border bg-white/50 backdrop-blur-sm text-gray-800 placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-[#0066CC]/50 focus:border-[#0066CC] transition-all",
        "border-gray-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  </div>
);

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<LoginStep>('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState('');

  const { authStart, authFinish, isMockMode } = useFido2Api();
  const { config } = useConfig();

  // Passkey로 바로 로그인 (Discoverable Credential)
  const handlePasskeyLogin = async () => {
    if (!isWebAuthnSupported()) {
      setErrorMessage('이 브라우저는 Passkey를 지원하지 않습니다.');
      setStep('error');
      return;
    }

    setStep('authenticating');

    try {
      const serverOptions = await authStart({});
      const options = convertAuthenticationOptions(serverOptions);
      const credential = await getCredential(options);
      const result = await authFinish(credential);

      if (result.success) {
        setAuthenticatedUser(result.username || email);
        setStep('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setErrorMessage(result.message || '인증에 실패했습니다.');
        setStep('error');
      }
    } catch (error) {
      setErrorMessage(getWebAuthnErrorMessage(error));
      setStep('error');
    }
  };

  // 이메일로 로그인 (특정 사용자의 Passkey)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('이메일을 입력해주세요.');
      setStep('error');
      return;
    }

    if (!isWebAuthnSupported()) {
      setErrorMessage('이 브라우저는 Passkey를 지원하지 않습니다.');
      setStep('error');
      return;
    }

    setStep('authenticating');

    try {
      const serverOptions = await authStart({ username: email.trim() });
      const options = convertAuthenticationOptions(serverOptions);
      const credential = await getCredential(options);
      const result = await authFinish(credential);

      if (result.success) {
        setAuthenticatedUser(result.username || email);
        setStep('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setErrorMessage(result.message || '인증에 실패했습니다.');
        setStep('error');
      }
    } catch (error) {
      setErrorMessage(getWebAuthnErrorMessage(error));
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('initial');
    setErrorMessage('');
  };

  // 인증 중 화면
  if (step === 'authenticating') {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <AnimatedBackground variant="blue" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              className="w-32 h-32 mx-auto mb-8 relative"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="absolute inset-0 bg-[#0066CC]/20 rounded-full animate-ping" />
              <div className="relative w-32 h-32 bg-gradient-to-br from-[#0099CC] to-[#0066CC] rounded-full flex items-center justify-center">
                <Fingerprint className="h-16 w-16 text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">인증 대기 중</h2>
            <p className="text-gray-600 mb-2">기기의 생체 인증을 진행해주세요</p>
            <p className="text-sm text-gray-400">Touch ID, Face ID 또는 PIN을 사용합니다</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // 로그인 성공 화면
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <AnimatedBackground variant="blue" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-32 h-32 mx-auto mb-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">로그인 성공!</h2>
            <p className="text-gray-600 mb-2">
              환영합니다, <span className="font-semibold text-[#0066CC]">{authenticatedUser}</span>
            </p>
            <p className="text-sm text-gray-400">잠시 후 대시보드로 이동합니다...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // 기본 로그인 화면
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              to="/"
              className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-8 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              돌아가기
            </Link>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#0099CC] to-[#0066CC] rounded-2xl flex items-center justify-center">
                <Key className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">로그인</h1>
              <p className="text-gray-500">Passkey로 안전하게 로그인하세요</p>
            </div>

            {/* Mode Badge */}
            {isMockMode && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-amber-700 text-sm font-medium">테스트 모드 (Mock)</span>
              </div>
            )}

            {/* Server URL */}
            {!isMockMode && (
              <div className="mb-6 text-center">
                <span className="text-xs text-gray-400">서버: {config.serverUrl}</span>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {step === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 font-medium">로그인 실패</p>
                      <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="mt-3 text-red-600 text-sm font-medium hover:text-red-700"
                  >
                    다시 시도
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary CTA - Passkey Login */}
            <Button
              onClick={handlePasskeyLogin}
              variant="primary"
              size="lg"
              className="mb-4 w-full h-14 rounded-xl shadow-lg hover:shadow-xl bg-[#0066CC] hover:bg-[#0052A3]"
            >
              <Fingerprint className="h-5 w-5" />
              Passkey로 로그인
              <ArrowRight className="h-5 w-5" />
            </Button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-gray-400 text-sm">또는</span>
              </div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <InputField
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-5 w-5" />}
              />
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="w-full h-14 rounded-xl"
              >
                이메일로 계속하기
              </Button>
            </form>

            {/* Sign Up Link */}
            <p className="mt-8 text-center text-gray-500">
              계정이 없으신가요?{' '}
              <Link to="/signup" className="text-[#0066CC] font-semibold hover:text-[#0052A3]">
                회원가입
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
