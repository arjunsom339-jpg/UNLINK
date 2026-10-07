import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

/**
 * Enhanced ProtectedRoute:
 * 1. Blocks unauthenticated users and redirects to login
 * 2. Intercepts Banned accounts -> /banned
 * 3. Intercepts Suspended accounts -> /suspended
 * 4. Intercepts Pending Verification accounts -> /pending-verification (unless on status page)
 */
export default function ProtectedRoute() {
  const user        = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const location    = useLocation();

  if (!user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Account State Guards (allow access to status notice routes)
  if (user.accountStatus === 'banned') {
    return <Navigate to="/banned" replace />;
  }

  if (user.accountStatus === 'suspended') {
    return <Navigate to="/suspended" replace />;
  }

  if (user.role !== 'admin' && (user.accountStatus === 'pending' || user.accountStatus === 'pending_verification' || !user.isAdminVerified)) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <Outlet />;
}
