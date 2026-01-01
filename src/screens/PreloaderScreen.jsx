import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
// Using Owner Dashboard color theme
const COLORS = {
  darkBg: "#0f172a", // Dark blue-gray background
  darkCard: "#1e293b", // Card background
  mediumTeal: "#14b8a6", // Teal accent
  darkTeal: "#0d9488", // Darker teal
  yellowGold: "#fbbf24", // Gold accent
  orange: "#f97316", // Orange accent
  red: "#ef4444", // Red accent
  textPrimary: "#f1f5f9", // Light text
  textSecondary: "#94a3b8", // Muted text
  borderColor: "#334155" // Border color
};

const PreloaderScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          // Delay before calling onComplete to show completion animation
          setTimeout(() => {
            onComplete();
          }, 800);
          return 100;
        }
        // Random increment for more natural feel
        return prev + Math.random() * 15 + 5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-1000 ${
        isComplete ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${COLORS.darkCard} 0%, ${COLORS.darkBg} 40%, #020617 100%)`
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl animate-float"
          style={{
            background: `radial-gradient(circle, ${COLORS.mediumTeal}15, transparent)`
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-2xl animate-float-reverse"
          style={{
            background: `radial-gradient(circle, ${COLORS.yellowGold}12, transparent)`
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{
            background: `radial-gradient(circle, ${COLORS.darkTeal}10, transparent)`
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo container with complex animations */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div
            className="absolute -inset-8 rounded-full animate-spin-slow"
            style={{
              border: `1px solid ${COLORS.mediumTeal}40`
            }}
          />

          {/* Middle pulsing ring */}
          <div
            className="absolute -inset-6 rounded-full animate-pulse"
            style={{
              boxShadow: `0 0 0 1px ${COLORS.yellowGold}25`
            }}
          />

          {/* Glow effect */}
          <div
            className="absolute -inset-12 rounded-full blur-2xl animate-pulse"
            style={{
              background: `radial-gradient(circle, ${COLORS.mediumTeal}25, ${COLORS.yellowGold}15, transparent)`
            }}
          />

          {/* Logo Placeholder - Replace with actual logo */}
          <div
            className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center animate-float"
            style={{
              background: "White",
              boxShadow: `0 12px 24px ${COLORS.mediumTeal}40`,
              transform: `scale(${0.8 + (progress / 100) * 0.2})`
            }}
          >
            {/* Glow effect */}
            <div className="absolute -inset-12 bg-gradient-to-r from-[#B08B57]/20 via-[#E7DFD6]/10 to-[#6B7785]/15 rounded-full blur-2xl animate-pulse" />

            {/* Logo */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
              <img
                src={logo}
                alt="Loading..."
                className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(176,139,87,0.4)] animate-float"
                style={{
                  transform: `scale(${0.8 + (progress / 100) * 0.2})`
                }}
              />
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-wider">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${COLORS.mediumTeal}, ${COLORS.yellowGold}, ${COLORS.mediumTeal})`
              }}
            >
              Loading Ride Link Plus +
            </span>
          </h2>

          {/* Progress bar */}
          <div className="w-64 sm:w-80 mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                Progress
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: COLORS.mediumTeal }}
              >
                {Math.round(progress)}%
              </span>
            </div>

            {/* Progress bar container */}
            <div
              className="relative h-1 rounded-full overflow-hidden backdrop-blur-sm"
              style={{
                backgroundColor: `${COLORS.borderColor}40`
              }}
            >
              {/* Progress fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${COLORS.mediumTeal}, ${COLORS.yellowGold}, ${COLORS.mediumTeal})`
                }}
              >
                {/* Animated shine effect */}
                <div
                  className="absolute inset-0 animate-shine"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
                  }}
                />
              </div>

              {/* Glow effect */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 h-3 blur-sm rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  left: 0,
                  backgroundColor: `${COLORS.mediumTeal}40`
                }}
              />
            </div>
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex space-x-2">
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: COLORS.mediumTeal,
              animationDelay: "0ms"
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: COLORS.yellowGold,
              animationDelay: "150ms"
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: COLORS.orange,
              animationDelay: "300ms"
            }}
          />
        </div>
      </div>

      {/* Completion animation overlay */}
      {isComplete && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${COLORS.mediumTeal}20, ${COLORS.yellowGold}20)`
          }}
        />
      )}

      {/* Custom styles */}
      <style>{`
        @keyframes float { 
          0%, 100% { transform: translateY(0) scale(1); } 
          50% { transform: translateY(-12px) scale(1.02); } 
        }
        @keyframes float-reverse { 
          0%, 100% { transform: translateY(0) scale(1); } 
          50% { transform: translateY(12px) scale(0.98); } 
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 7s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-shine { animation: shine 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default PreloaderScreen;
