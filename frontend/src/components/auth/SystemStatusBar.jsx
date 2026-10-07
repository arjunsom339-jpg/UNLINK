export default function SystemStatusBar() {
  return (
    <div className="auth-status-bar" aria-label="Campus network security status">
      <div className="auth-status-dot-wrap">
        <span className="auth-status-pulsing-dot" aria-hidden="true" />
        <span>SYSTEM: UNILINK ACTIVE</span>
      </div>
      <span className="auth-status-sep" aria-hidden="true">•</span>
      <span>SECURE ENCLAVE</span>
      <span className="auth-status-sep" aria-hidden="true">•</span>
      <span>STATUS: ONLINE</span>
    </div>
  );
}
