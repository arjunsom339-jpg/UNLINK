import { Link } from 'react-router-dom';

export default function AuthBrand() {
  return (
    <Link to="/" className="auth-brand-badge" aria-label="UniLink Campus Network - Return to Home">
      <div className="auth-brand-icon-box">
        {/* Futuristic geometric network node core icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Diamond outer circuit */}
          <polygon
            points="12,2 22,12 12,22 2,12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.85"
          />
          {/* Inner core node */}
          <circle cx="12" cy="12" r="3" fill="#f97316" />
          {/* Cross interconnect lines */}
          <line x1="12" y1="5" x2="12" y2="9" stroke="#ffad42" strokeWidth="1.2" />
          <line x1="12" y1="15" x2="12" y2="19" stroke="#ffad42" strokeWidth="1.2" />
          <line x1="5" y1="12" x2="9" y2="12" stroke="#ffad42" strokeWidth="1.2" />
          <line x1="15" y1="12" x2="19" y2="12" stroke="#ffad42" strokeWidth="1.2" />
        </svg>
      </div>

      <div className="auth-brand-title">UNILINK</div>
      <div className="auth-brand-subtitle">
        <span className="auth-brand-dot" />
        CAMPUS NETWORK
      </div>
    </Link>
  );
}
