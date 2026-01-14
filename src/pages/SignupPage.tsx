import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, User, ArrowLeft, Fingerprint, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, AnimatedBackground } from '../components/common';
import { useFido2Api } from '../hooks/useFido2Api';
import { useConfig } from '../context/ConfigContext';
import {
  isWebAuthnSupported,
  convertRegistrationOptions,
  createCredential,
  getWebAuthnErrorMessage,
} from '../services/webauthn';

type SignupStep = 'form' | 'creating' | 'success' | 'error';

// Input Field Component
interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
}

const InputField = ({ type, placeholder, value, onChange, icon, disabled, required, hint }: InputFieldProps) => (
  <div className="space-y-1">
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
        required={required}
        className={cn(
          "w-full h-14 pl-12 pr-4 rounded-xl border bg-white/50 backdrop-blur-sm text-gray-800 placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-[#0066CC]/50 focus:border-[#0066CC] transition-all",
          "border-gray-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
    {hint && <p className="text-xs text-gray-400 pl-1">{hint}</p>}
  </div>
);

export function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<SignupStep>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { registerStart, registerFinish, isMockMode } = useFido2Api();
  const { config } = useConfig();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('이메일을 입력해주세요.');
      setStep('error');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('서비스 이용약관에 동의해주세요.');
      setStep('error');
      return;
    }

    if (!isWebAuthnSupported()) {
      setErrorMessage('이 브라우저는 Passkey를 지원하지 않습니다.');
      setStep('error');
      return;
    }

    setStep('creating');

    try {
      const serverOptions = await registerStart({
        username: email.trim(),
        displayName: name.trim() || email.trim(),
      });

      const options = convertRegistrationOptions(serverOptions);
      const credential = await createCredential(options);
      const result = await registerFinish(credential);

      if (result.success) {
        setStep('success');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setErrorMessage(result.message || '회원가입에 실패했습니다.');
        setStep('error');
      }
    } catch (error) {
      setErrorMessage(getWebAuthnErrorMessage(error));
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('form');
    setErrorMessage('');
  };

  // Passkey 생성 중 화면
  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <AnimatedBackground variant="green" />
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
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Passkey 생성 중</h2>
            <p className="text-gray-600 mb-2">기기의 생체 인증을 진행해주세요</p>
            <p className="text-sm text-gray-400">Touch ID, Face ID 또는 PIN으로 Passkey를 생성합니다</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // 회원가입 성공 화면
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <AnimatedBackground variant="green" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-32 h-32 mx-auto mb-8 bg-[#E6F3F8] rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="h-16 w-16 text-[#0066CC]" />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">회원가입 완료!</h2>
            <p className="text-gray-600 mb-6">
              Passkey가 성공적으로 생성되었습니다.
              <br />
              이제 비밀번호 없이 안전하게 로그인할 수 있습니다.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-[#E6F3F8] border border-[#0066CC]/20 rounded-xl mb-6"
            >
              <div className="flex items-center justify-center gap-2 text-[#0066CC]">
                <Mail className="w-5 h-5" />
                <span className="font-medium">{email}</span>
              </div>
            </motion.div>

            <p className="text-sm text-gray-400 mb-4">잠시 후 로그인 페이지로 이동합니다...</p>

            <button
              onClick={() => navigate('/login')}
              className="text-[#0066CC] font-semibold hover:text-[#0052A3]"
            >
              지금 로그인하기
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // 회원가입 폼
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

          {/* Signup Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#0099CC] to-[#0066CC] rounded-2xl flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">회원가입</h1>
              <p className="text-gray-500">Passkey로 안전한 계정을 만드세요</p>
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
                      <p className="text-red-800 font-medium">오류 발생</p>
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

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-5">
              <InputField
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-5 w-5" />}
                required
              />

              <InputField
                type="text"
                placeholder="이름 (선택)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="h-5 w-5" />}
                hint="인증 기기에 표시될 이름입니다"
              />

              {/* Terms Agreement */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#0066CC] focus:ring-[#0066CC] mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  <span className="text-[#0066CC] cursor-pointer hover:underline">서비스 이용약관</span>
                  {' '}및{' '}
                  <span className="text-[#0066CC] cursor-pointer hover:underline">개인정보처리방침</span>
                  에 동의합니다.
                </label>
              </div>

              {/* Passkey Info Card */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#E6F3F8] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#0066CC]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Passkey로 가입합니다</p>
                    <p className="text-xs text-gray-500 mt-1">
                      비밀번호 대신 기기의 생체 인증(지문/얼굴)을 사용합니다.
                      더 안전하고 편리한 로그인이 가능합니다.
                    </p>
                  </div>
                </div>
              </motion.div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!agreedToTerms}
                className="w-full h-14 rounded-xl shadow-lg hover:shadow-xl bg-gradient-to-r from-[#0099CC] to-[#0066CC] hover:from-[#0085B8] hover:to-[#0052A3]"
              >
                <Fingerprint className="h-5 w-5" />
                Passkey로 회원가입
              </Button>
            </form>

            {/* Login Link */}
            <p className="mt-8 text-center text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-[#0066CC] font-semibold hover:text-[#0052A3]">
                로그인
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
