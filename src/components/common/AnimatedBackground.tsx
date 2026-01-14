import { memo } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'blue' | 'green';
}

export const AnimatedBackground = memo(function AnimatedBackground({ variant = 'default' }: AnimatedBackgroundProps) {
  const colors = {
    default: {
      gradient: 'from-blue-500/5 via-white to-purple-500/5',
      blob1: 'bg-blue-500/10',
      blob2: 'bg-purple-500/10',
    },
    blue: {
      gradient: 'from-blue-500/5 via-white to-purple-500/5',
      blob1: 'bg-blue-500/10',
      blob2: 'bg-purple-500/10',
    },
    green: {
      gradient: 'from-green-500/5 via-white to-blue-500/5',
      blob1: 'bg-green-500/10',
      blob2: 'bg-blue-500/10',
    },
  };

  const colorScheme = colors[variant];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.gradient}`} />
      <motion.div
        className={`absolute w-96 h-96 ${colorScheme.blob1} rounded-full blur-3xl`}
        style={{
          top: variant === 'green' ? '25%' : '0',
          left: variant === 'green' ? '25%' : '0',
          right: variant === 'blue' ? '25%' : 'auto',
        }}
        animate={
          variant === 'default'
            ? {
                x: [0, 100, 0],
                y: [0, 50, 0],
              }
            : { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }
        }
        transition={{
          duration: variant === 'default' ? 20 : 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {variant === 'default' && (
        <motion.div
          className={`absolute bottom-0 right-0 w-96 h-96 ${colorScheme.blob2} rounded-full blur-3xl`}
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
});
