import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Key, LogOut, Plus, RefreshCw, Settings,
  CheckCircle2, Clock, Fingerprint, Smartphone, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useConfig } from '../context/ConfigContext';
import { getMockCredentials, clearMockData } from '../services/mockServer';

export function DashboardPage() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const credentials = config.useMockServer ? getMockCredentials() : [];

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    navigate('/');
  };

  const handleClearData = () => {
    clearMockData();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0099CC] to-[#0066CC] rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">대시보드</h1>
                <p className="text-sm text-gray-500">안전하게 로그인되었습니다</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 mb-8 text-white shadow-lg"
        >
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Passkey 인증 완료</h2>
              <p className="text-green-100">
                비밀번호 없이 안전하게 로그인되었습니다
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mock Mode Info */}
        {config.useMockServer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8"
          >
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">테스트 모드</p>
                <p className="text-amber-700 text-sm mt-1">
                  Mock 서버를 사용 중입니다. 실제 백엔드 서버에 연결하려면 설정에서 변경하세요.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard
              icon={<Key className="w-6 h-6" />}
              label="등록된 Passkey"
              value={credentials.length.toString()}
              color="blue"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StatCard
              icon={<Fingerprint className="w-6 h-6" />}
              label="인증 방식"
              value="Passkey"
              color="purple"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <StatCard
              icon={<Shield className="w-6 h-6" />}
              label="보안 상태"
              value="안전"
              color="green"
            />
          </motion.div>
        </div>

        {/* Registered Credentials */}
        {credentials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8 shadow-sm"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">등록된 Passkey 목록</h3>
              <span className="text-sm text-gray-500">{credentials.length}개</span>
            </div>
            <div className="divide-y divide-gray-100">
              {credentials.map((cred, index) => (
                <motion.div
                  key={cred.credentialId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {cred.displayName || `Passkey ${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-500">{cred.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(cred.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <ActionCard
            title="새 Passkey 등록"
            description="추가 기기에서 사용할 Passkey를 등록합니다"
            buttonText="Passkey 추가"
            onClick={() => navigate('/signup')}
            icon={<Plus className="w-6 h-6" />}
            variant="primary"
          />
          <ActionCard
            title="테스트 다시하기"
            description="처음부터 다시 Passkey 테스트를 진행합니다"
            buttonText="다시 시작"
            onClick={handleClearData}
            icon={<RefreshCw className="w-6 h-6" />}
            variant="secondary"
          />
        </motion.div>

        {/* Debug Link */}
        <div className="mt-8 text-center">
          <Link
            to="/debug"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm"
          >
            <Settings className="w-4 h-4" />
            개발자 도구
          </Link>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
          >
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">로그아웃</h3>
            <p className="text-gray-500 text-center mb-6">정말 로그아웃 하시겠습니까?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-600',
    green: 'from-green-500/10 to-green-500/5 text-green-600',
    purple: 'from-purple-500/10 to-purple-500/5 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
        colors[color]
      )}>
        {icon}
      </div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

function ActionCard({ title, description, buttonText, onClick, icon, variant = 'primary' }: ActionCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
        variant === 'primary' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
      )}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <button
        onClick={onClick}
        className={cn(
          "w-full py-3 px-4 rounded-xl font-medium transition-all",
          variant === 'primary'
            ? 'bg-[#0066CC] text-white hover:bg-[#0052A3] shadow-lg hover:shadow-xl'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        {buttonText}
      </button>
    </div>
  );
}
