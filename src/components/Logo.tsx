export default function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd27a" />
            <stop offset="1" stopColor="#ff8a3d" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#logo-g)" />
        <path d="M9 30 L17 10 h6 l8 20" fill="none" stroke="#1a1206" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M20 14v3m0 4v3m0 4v2" stroke="#1a1206" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="logo__text">
        Via <b>Libera</b>
      </span>
    </span>
  )
}
