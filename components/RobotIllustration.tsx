'use client';

export default function RobotIllustration() {
  return (
    <div className="w-72 h-72 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
            }
            @keyframes blink {
              0%, 90%, 100% { transform: scaleY(1); }
              95% { transform: scaleY(0.1); }
            }
            @keyframes wave {
              0%, 100% { transform: rotate(-15deg); }
              50% { transform: rotate(10deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.05); }
            }
            @keyframes glowPulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.8; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes earWiggle {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(5deg); }
              75% { transform: rotate(-5deg); }
            }
            .robot-group { animation: float 3s ease-in-out infinite; transform-origin: center; }
            .eye { animation: blink 4s ease-in-out infinite; transform-origin: center; }
            .arm-wave { animation: wave 2s ease-in-out infinite; transform-origin: 140px 80px; }
            .arm-rest { animation: wave 2.5s ease-in-out infinite; transform-origin: 60px 80px; }
            .heart { animation: pulse 1.5s ease-in-out infinite; transform-origin: 100px 115px; }
            .glow { animation: glowPulse 2s ease-in-out infinite; }
            .ear { animation: earWiggle 3s ease-in-out infinite; transform-origin: center; }
          `}
        </style>

        <g className="robot-group">
          {/* Ear fins */}
          <ellipse className="ear" cx="56" cy="70" rx="8" ry="14" fill="#a78bfa" opacity="0.7" />
          <ellipse className="ear" cx="144" cy="70" rx="8" ry="14" fill="#a78bfa" opacity="0.7" />

          {/* Body */}
          <rect x="62" y="85" width="76" height="70" rx="18" fill="url(#bodyGrad)" />

          {/* Body panel line */}
          <line x1="62" y1="102" x2="138" y2="102" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />

          {/* Chest light */}
          <circle className="heart" cx="100" cy="115" r="6" fill="#f472b6" filter="url(#glow)" />

          {/* Chest accent */}
          <rect x="82" y="130" width="36" height="10" rx="5" fill="#7c3aed" opacity="0.4" />

          {/* Left arm */}
          <g className="arm-rest">
            <rect x="40" y="90" width="22" height="12" rx="6" fill="#7c3aed" />
            <circle cx="42" cy="96" r="8" fill="#a78bfa" />
          </g>

          {/* Right arm - waving */}
          <g className="arm-wave">
            <rect x="138" y="80" width="22" height="12" rx="6" fill="#7c3aed" />
            <circle cx="158" cy="76" r="8" fill="#a78bfa" />
          </g>

          {/* Feet */}
          <rect x="70" y="155" width="22" height="10" rx="5" fill="#7c3aed" opacity="0.8" />
          <rect x="108" y="155" width="22" height="10" rx="5" fill="#7c3aed" opacity="0.8" />

          {/* Head */}
          <rect x="60" y="38" width="80" height="52" rx="16" fill="url(#bodyGrad)" />

          {/* Antenna */}
          <line x1="100" y1="38" x2="100" y2="24" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="22" r="4" fill="#f472b6" filter="url(#glow)" />

          {/* Visor */}
          <rect x="70" y="48" width="60" height="30" rx="10" fill="url(#visorGrad)" stroke="#4f46e5" strokeWidth="1.5" />

          {/* Visor glow line */}
          <line className="glow" x1="75" y1="52" x2="125" y2="52" stroke="#6366f1" strokeWidth="1" opacity="0.6" />

          {/* Eyes */}
          <circle className="eye" cx="85" cy="63" r="4.5" fill="#e0e7ff" filter="url(#glow)" />
          <circle className="eye" cx="115" cy="63" r="4.5" fill="#e0e7ff" filter="url(#glow)" />

          {/* Eye pupils */}
          <circle cx="85" cy="63" r="2" fill="#1e1b4b" />
          <circle cx="115" cy="63" r="2" fill="#1e1b4b" />

          {/* Eye highlights */}
          <circle cx="86.5" cy="61.5" r="1" fill="#fff" />
          <circle cx="116.5" cy="61.5" r="1" fill="#fff" />

          {/* Smile */}
          <path d="M 88 73 Q 100 80 112 73" fill="none" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

          {/* Floating glow ring */}
          <ellipse cx="100" cy="172" rx="32" ry="4" fill="#a78bfa" opacity="0.25" filter="url(#softGlow)" />
          <ellipse cx="100" cy="172" rx="22" ry="2.5" fill="#8b5cf6" opacity="0.3" filter="url(#softGlow)" />
        </g>
      </svg>
    </div>
  );
}
