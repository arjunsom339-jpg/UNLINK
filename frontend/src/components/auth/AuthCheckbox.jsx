import { Check } from 'lucide-react';

export default function AuthCheckbox({
  id = 'remember-session',
  checked,
  onChange,
  label = 'Remember session',
  disabled = false,
}) {
  return (
    <label htmlFor={id} className="auth-checkbox-wrapper">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="auth-checkbox-hidden"
      />
      <span className="auth-checkbox-custom" aria-hidden="true">
        {checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
      </span>
      <span className="auth-checkbox-label">{label}</span>
    </label>
  );
}
