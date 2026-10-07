import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

/**
 * RoleGuard:
 * Strict client-side RBAC guard.
 * If user attempts to navigate to a portal outside their authorized role,
 * redirects to /unauthorized.
 */
export default function RoleGuard({ allowedRoles }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" state={{ attemptedRoles: allowedRoles, currentRole: user.role }} replace />;
  }

  return <Outlet />;
}
