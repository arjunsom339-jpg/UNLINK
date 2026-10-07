import { ArrowRight } from 'lucide-react';

export default function AuthButton({
  type = 'submit',
  loading = false,
  disabled = false,
  label = 'AUTHENTICATE',
  loadingLabel = 'AUTHENTICATING',
  onClick,
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="auth-primary-btn"
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span>{loadingLabel}</span>
          <span className="auth-spinner" aria-hidden="true" />
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
        </>
      )}
    </button>
  );
}
