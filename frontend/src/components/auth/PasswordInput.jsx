import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function PasswordInput({
  id = 'password',
  name = 'password',
  label = 'SECURITY PASSWORD',
  placeholder = 'Enter your password',
  value,
  onChange,
  error,
  autoComplete = 'current-password',
  showForgot = true,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-input-group">
      <div className="auth-input-label-row">
        <label htmlFor={id} className="auth-input-label">
          {label}
        </label>
        {showForgot && (
          <Link to="/forgot-password" className="auth-forgot-link">
            Forgot password?
          </Link>
        )}
      </div>

      <div className="auth-input-container">
        <div className="auth-input-icon">
          <Lock size={16} />
        </div>

        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`auth-input-field ${error ? 'has-error' : ''}`}
          style={{ paddingRight: 42 }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="auth-input-addon-btn"
          aria-label={showPassword ? 'Hide security password' : 'Show security password'}
          title={showPassword ? 'Hide security password' : 'Show security password'}
          tabIndex={0}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error && (
        <div id={`${id}-error`} className="auth-field-error-msg" role="alert">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
