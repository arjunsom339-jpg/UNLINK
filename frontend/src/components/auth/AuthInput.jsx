import { Mail, AlertCircle } from 'lucide-react';

export default function AuthInput({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon: Icon = Mail,
  autoComplete,
  required = false,
  disabled = false,
}) {
  return (
    <div className="auth-input-group">
      <div className="auth-input-label-row">
        <label htmlFor={id} className="auth-input-label">
          {label}
        </label>
      </div>

      <div className="auth-input-container">
        {Icon && (
          <div className="auth-input-icon">
            <Icon size={16} />
          </div>
        )}

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`auth-input-field ${error ? 'has-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
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
