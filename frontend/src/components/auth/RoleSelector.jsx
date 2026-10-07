export default function RoleSelector({ selectedRole, onSelectRole }) {
  const roles = [
    { id: 'student', label: 'STUDENT', title: 'Student Portal' },
    { id: 'teacher', label: 'CORE TEAM', title: 'Faculty & Core Team' },
    { id: 'admin', label: 'ADMIN', title: 'Administrative Console' },
  ];

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % roles.length;
      onSelectRole(roles[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + roles.length) % roles.length;
      onSelectRole(roles[prevIndex].id);
    }
  };

  return (
    <div
      className="auth-role-selector"
      role="tablist"
      aria-label="Authentication Domain Role"
    >
      {roles.map((r, idx) => {
        const isActive = selectedRole === r.id;
        return (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`auth-panel-${r.id}`}
            id={`auth-tab-${r.id}`}
            tabIndex={isActive ? 0 : -1}
            title={r.title}
            className={`auth-role-tab ${isActive ? 'active' : ''}`}
            onClick={() => onSelectRole(r.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
