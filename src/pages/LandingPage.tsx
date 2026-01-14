import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Fingerprint, Key, Sparkles, Check, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useConfig } from '../context/ConfigContext';
import { Button, AnimatedBackground } from '../components/common';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from '../services/webauthn';

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon, title, description, delay = 0 }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex items-start gap-4 p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-gray-200/50 hover:border-[#0066CC]/50 transition-all hover:shadow-lg"
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#0066CC]/10 flex items-center justify-center text-[#0066CC]">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </motion.div>
);

export function LandingPage() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    async function checkSupport() {
      const supported = isWebAuthnSupported();
      const platform = await isPlatformAuthenticatorAvailable();
      setIsSupported(supported && platform);
    }
    checkSupport();
  }, []);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <AnimatedBackground variant="default" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto min-h-[80vh]">
          {/* Left Side - Hero Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                FIDO2 Passkey Authentication
                {config.useMockServer && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    Test Mode
                  </span>
                )}
              </div>

              {/* Headline */}
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                비밀번호 없는
                <br />
                <span className="bg-gradient-to-r from-[#0099CC] to-[#0066CC] bg-clip-text text-transparent">
                  안전한 인증
                </span>
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-600 max-w-lg">
                FIDO2 Passkey로 더 빠르고 안전하게 로그인하세요.
                생체 인증으로 번거로운 비밀번호 입력이 필요 없습니다.
              </p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  size="lg"
                  className="h-14 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  로그인
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  variant="secondary"
                  size="lg"
                  className="h-14 px-8 rounded-xl border-2 border-[#0066CC] hover:bg-[#0066CC]/5"
                >
                  회원가입
                </Button>
              </motion.div>

              {/* WebAuthn Warning */}
              {!isSupported && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <p className="text-red-800 font-medium text-sm">
                    이 기기에서는 Passkey를 사용할 수 없습니다.
                    Chrome, Safari, Edge 최신 버전을 사용해주세요.
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Feature Cards */}
            <div className="space-y-4 pt-4">
              <FeatureCard
                icon={<Fingerprint className="h-6 w-6" />}
                title="생체 인증"
                description="지문 또는 얼굴 인식으로 즉시 안전하게 접근"
                delay={0.3}
              />
              <FeatureCard
                icon={<Shield className="h-6 w-6" />}
                title="피싱 방지"
                description="FIDO2 인증으로 피싱 공격을 원천 차단"
                delay={0.4}
              />
              <FeatureCard
                icon={<Key className="h-6 w-6" />}
                title="비밀번호 불필요"
                description="비밀번호를 기억하거나 입력할 필요 없음"
                delay={0.5}
              />
            </div>
          </div>

          {/* Right Side - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              {/* Main Card */}
              <div className="w-80 h-96 bg-gradient-to-br from-[#0099CC] to-[#0066CC] rounded-3xl shadow-2xl p-8 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">CROSSCERT</h3>
                <p className="text-white/80 mb-8">
                  차세대 인증 시스템으로 더 안전하게
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Fingerprint className="h-4 w-4" />
                    </div>
                    <span>생체 인증 지원</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Key className="h-4 w-4" />
                    </div>
                    <span>Passkey 기반</span>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-4 -right-4 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium shadow-lg"
              >
                FIDO2 Certified
              </motion.div>

              {/* Floating Card */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-6 -left-6 p-4 bg-white rounded-xl shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0066CC]/10 rounded-lg flex items-center justify-center">
                    <Check className="h-5 w-5 text-[#0066CC]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">인증 성공</p>
                    <p className="text-xs text-gray-500">0.3초 소요</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-8 py-8 border-t border-gray-100 mt-8"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Check className="h-4 w-4 text-green-500" />
            <span>FIDO2 표준</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Check className="h-4 w-4 text-green-500" />
            <span>WebAuthn API</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Check className="h-4 w-4 text-green-500" />
            <span>End-to-End 암호화</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
