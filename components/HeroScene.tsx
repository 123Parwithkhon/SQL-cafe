// Иллюстрация для главной: арка-пиштак с изразцами, дастархан, лепёшка (нон),
// чайник с узором «пахта» (хлопок — знаменитый среднеазиатский фарфор) и пиала с паром.
// Чистый SVG, без картинок — весит пару килобайт и чёткий на любом экране.

function CottonBoll({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 4 C-5 4 -6 -2 -2 -3 C-2 -7 4 -7 4 -3 C8 -2 7 4 2 4 Z" fill="#fff" stroke="#1d5fa8" strokeWidth="1.1" />
      <path d="M-3 5 L-6 9 M3 5 L6 9 M0 5 V10" stroke="#1d5fa8" strokeWidth="1.1" />
    </g>
  );
}

export function HeroScene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 250" className={className} role="img" aria-label="Чайхана: чайник, пиала и лепёшка под аркой">
      <defs>
        <linearGradient id="hs-arch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24456f" />
          <stop offset="1" stopColor="#142640" />
        </linearGradient>
        <radialGradient id="hs-lamp" cx="0.5" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#d4a24c" stopOpacity="0.45" />
          <stop offset="1" stopColor="#d4a24c" stopOpacity="0" />
        </radialGradient>
        <pattern id="hs-tiles" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z" fill="none" stroke="#2f8f9d" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="1.4" fill="#d4a24c" />
          <circle cx="0" cy="0" r="1" fill="#2f8f9d" />
          <circle cx="24" cy="24" r="1" fill="#2f8f9d" />
        </pattern>
      </defs>

      {/* Арка с изразцами и тёплым светом лампы */}
      <path id="hs-arch-shape" d="M44 232 V112 C44 74 92 54 122 42 C140 34 148 26 160 12 C172 26 180 34 198 42 C228 54 276 74 276 112 V232 Z" fill="url(#hs-arch)" />
      <path d="M44 232 V112 C44 74 92 54 122 42 C140 34 148 26 160 12 C172 26 180 34 198 42 C228 54 276 74 276 112 V232 Z" fill="url(#hs-tiles)" opacity="0.4" />
      <path d="M44 232 V112 C44 74 92 54 122 42 C140 34 148 26 160 12 C172 26 180 34 198 42 C228 54 276 74 276 112 V232 Z" fill="url(#hs-lamp)" />
      <path d="M44 232 V112 C44 74 92 54 122 42 C140 34 148 26 160 12 C172 26 180 34 198 42 C228 54 276 74 276 112 V232" fill="none" stroke="#d4a24c" strokeWidth="2" />
      <path d="M58 232 V116 C58 84 100 66 126 55 C142 48 150 41 160 29 C170 41 178 48 194 55 C220 66 262 84 262 116 V232" fill="none" stroke="#d4a24c" strokeWidth="0.8" opacity="0.6" />

      {/* Подвесная лампа */}
      <line x1="160" y1="30" x2="160" y2="58" stroke="#d4a24c" strokeWidth="1" />
      <path d="M150 58 H170 L166 72 H154 Z" fill="#c8552c" stroke="#d4a24c" strokeWidth="1" />
      <circle cx="160" cy="76" r="3" fill="#f5d38a" />

      {/* Дастархан */}
      <rect x="18" y="200" width="284" height="34" rx="6" fill="#c8552c" />
      <rect x="18" y="200" width="284" height="34" rx="6" fill="none" stroke="#a8441f" />
      <path d="M26 206 H294 M26 228 H294" stroke="#d4a24c" strokeWidth="1" strokeDasharray="6 4" />

      {/* Лепёшка — нон с узором из наколов */}
      <ellipse cx="74" cy="203" rx="34" ry="11" fill="#c98a3d" />
      <ellipse cx="74" cy="200" rx="34" ry="11" fill="#e0a85a" />
      <ellipse cx="74" cy="200" rx="18" ry="5.5" fill="#efc98b" />
      <g fill="#b9772f">
        {[-10, -5, 0, 5, 10].map((dx) => <circle key={dx} cx={74 + dx} cy={200} r="0.9" />)}
        {[-7, 0, 7].map((dx) => <circle key={`u${dx}`} cx={74 + dx} cy={197.5} r="0.8" />)}
        {[-7, 0, 7].map((dx) => <circle key={`d${dx}`} cx={74 + dx} cy={202.5} r="0.8" />)}
      </g>

      {/* Чайник с узором «пахта» */}
      <path d="M190 160 C206 152 214 140 222 128 L227 132 C221 146 211 166 194 176" fill="#fff" stroke="#1d3557" strokeWidth="1.5" />
      <path d="M116 150 C92 148 92 182 116 184" fill="none" stroke="#1d3557" strokeWidth="6" strokeLinecap="round" />
      <path d="M116 150 C92 148 92 182 116 184" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 196 C104 168 114 140 154 138 C194 140 204 168 196 196 Z" fill="#fff" stroke="#1d3557" strokeWidth="1.5" />
      <path d="M113 186 H195" stroke="#1d5fa8" strokeWidth="2" />
      <path d="M118 148 H190" stroke="#1d5fa8" strokeWidth="1.5" />
      <CottonBoll x={136} y={164} />
      <CottonBoll x={160} y={170} />
      <CottonBoll x={180} y={160} />
      <ellipse cx="154" cy="137" rx="23" ry="6" fill="#fff" stroke="#1d3557" strokeWidth="1.5" />
      <circle cx="154" cy="128" r="5" fill="#fff" stroke="#1d3557" strokeWidth="1.5" />
      <circle cx="154" cy="128" r="1.8" fill="#1d5fa8" />

      {/* Пиала с чаем и паром */}
      <g className="steam">
        <path d="M236 172 C232 164 240 160 236 152" fill="none" stroke="#f5ede0" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </g>
      <g className="steam steam-2">
        <path d="M246 172 C242 164 250 160 246 150" fill="none" stroke="#f5ede0" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </g>
      <g className="steam steam-3">
        <path d="M256 172 C252 164 260 160 256 152" fill="none" stroke="#f5ede0" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </g>
      <path d="M222 178 H270 C268 194 260 204 246 204 C232 204 224 194 222 178 Z" fill="#fff" stroke="#1d3557" strokeWidth="1.5" />
      <path d="M223.5 184 H268.5" stroke="#2f8f9d" strokeWidth="2.5" />
      <ellipse cx="246" cy="178" rx="24" ry="4.5" fill="#b8742a" stroke="#1d3557" strokeWidth="1.2" />
      <ellipse cx="240" cy="177" rx="7" ry="1.3" fill="#e0a85a" opacity="0.7" />
    </svg>
  );
}
