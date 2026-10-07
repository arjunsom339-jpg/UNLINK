import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Public & Landing
import LandingPage             from './pages/LandingPage';
import CampusAIChat            from './components/ai/CampusAIChat';

// Dedicated Auth Pages
import LoginPage              from './pages/auth/LoginPage';
import StudentLogin            from './pages/auth/StudentLogin';
import TeacherLogin            from './pages/auth/TeacherLogin';
import AdminLogin              from './pages/auth/AdminLogin';
import StudentRegister         from './pages/auth/StudentRegister';
import TeacherRegister         from './pages/auth/TeacherRegister';
import ForgotPassword          from './pages/auth/ForgotPassword';
import ResetPassword           from './pages/auth/ResetPassword';
import EmailVerificationPage   from './pages/auth/EmailVerificationPage';

// Account State & Notice Pages
import PendingVerificationPage from './pages/auth/PendingVerificationPage';
import SuspendedPage           from './pages/auth/SuspendedPage';
import BannedPage              from './pages/auth/BannedPage';
import UnauthorizedPage        from './pages/auth/UnauthorizedPage';

// Student Portal
import StudentLayout      from './components/layout/StudentLayout';
import StudentDashboard   from './pages/student/StudentDashboard';
import StudentProfile     from './pages/student/StudentProfile';
import LearnConnect       from './pages/student/LearnConnect';
import Community          from './pages/student/Community';
import HelpEmergency      from './pages/student/HelpEmergency';
import Messages           from './pages/student/Messages';
import Events             from './pages/student/Events';
import Resources          from './pages/student/Resources';
import Mentorship         from './pages/student/Mentorship';
import Placements         from './pages/student/Placements';
import Clubs              from './pages/student/Clubs';
import ClubProfile        from './pages/student/ClubProfile';
import ClubManagement     from './pages/student/ClubManagement';
import ClubElectionView   from './pages/student/ClubElectionView';
import CampusExchange     from './pages/student/CampusExchange';
import MarketplaceDetail  from './pages/student/MarketplaceDetail';
import LostFoundDetail    from './pages/student/LostFoundDetail';

// Teacher Portal

import TeacherLayout      from './components/layout/TeacherLayout';
import TeacherDashboard   from './pages/teacher/TeacherDashboard';
import TeacherProfile     from './pages/teacher/TeacherProfile';
import TeacherEvents      from './pages/teacher/TeacherEvents';
import TeacherResources   from './pages/teacher/TeacherResources';

// Admin Portal
import AdminLayout        from './components/layout/AdminLayout';
import AdminDashboard     from './pages/admin/AdminDashboard';
import AdminUsers         from './pages/admin/AdminUsers';
import AdminClubs         from './pages/admin/AdminClubs';
import AdminEvents        from './pages/admin/AdminEvents';
import AdminResources     from './pages/admin/AdminResources';
import AdminAlumni        from './pages/admin/AdminAlumni';
import AdminPlacements    from './pages/admin/AdminPlacements';
import AdminMarketplace   from './pages/admin/AdminMarketplace';

// Guards
import ProtectedRoute     from './components/layout/ProtectedRoute';
import RoleGuard          from './components/layout/RoleGuard';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
          },
        }}
      />
      <Routes>
        {/* ── Public Landing & Auth ────────────────────────────── */}
        <Route path="/"                   element={<LandingPage />} />
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/login/student"      element={<StudentLogin />} />
        <Route path="/login/teacher"      element={<TeacherLogin />} />
        <Route path="/login/admin"        element={<AdminLogin />} />
        <Route path="/register/student"   element={<StudentRegister />} />
        <Route path="/register/teacher"   element={<TeacherRegister />} />
        <Route path="/forgot-password"    element={<ForgotPassword />} />
        <Route path="/reset-password"     element={<ResetPassword />} />
        <Route path="/verify-email"       element={<EmailVerificationPage />} />

        {/* ── Account Status Screens ──────────────────────────── */}
        <Route path="/pending-verification" element={<PendingVerificationPage />} />
        <Route path="/suspended"            element={<SuspendedPage />} />
        <Route path="/banned"               element={<BannedPage />} />
        <Route path="/unauthorized"         element={<UnauthorizedPage />} />

        {/* ── Protected Student Portal ─────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRoles={['student', 'alumni']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/student"            element={<StudentDashboard />} />
              <Route path="/student/profile"    element={<StudentProfile />} />
              <Route path="/student/learn"      element={<LearnConnect />} />
              <Route path="/student/placements" element={<Placements />} />
              <Route path="/student/mentorship" element={<Mentorship />} />
              <Route path="/student/alumni"     element={<Mentorship />} />
              <Route path="/student/community"  element={<Community />} />
              <Route path="/student/clubs"      element={<Clubs />} />
              <Route path="/student/clubs/:id"  element={<ClubProfile />} />
              <Route path="/student/clubs/:id/manage" element={<ClubManagement />} />
              <Route path="/student/clubs/:id/elections/:electionId" element={<ClubElectionView />} />
              <Route path="/student/events"     element={<Events />} />
              <Route path="/student/resources"  element={<Resources />} />
              <Route path="/student/help"       element={<HelpEmergency />} />
              <Route path="/student/messages"   element={<Messages />} />
              <Route path="/student/campus-exchange" element={<CampusExchange />} />
              <Route path="/student/campus-exchange/marketplace/:id" element={<MarketplaceDetail />} />
              <Route path="/student/campus-exchange/lost-found/:id" element={<LostFoundDetail />} />
              <Route path="/student/campus-exchange/my-listings" element={<CampusExchange />} />
              <Route path="/student/campus-exchange/my-reports" element={<CampusExchange />} />
            </Route>
          </Route>
        </Route>

        {/* ── Protected Teacher Portal ─────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRoles={['teacher']} />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher"                element={<TeacherDashboard />} />
              <Route path="/teacher/events"         element={<TeacherEvents />} />
              <Route path="/teacher/resources"      element={<TeacherResources />} />
              <Route path="/teacher/announcements"  element={<TeacherDashboard />} />
              <Route path="/teacher/profile"        element={<TeacherProfile />} />
            </Route>
          </Route>
        </Route>

        {/* ── Protected Admin Portal ───────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin"          element={<AdminDashboard />} />
              <Route path="/admin/users"    element={<AdminUsers />} />
              <Route path="/admin/clubs"    element={<AdminClubs />} />
              <Route path="/admin/placements" element={<AdminPlacements />} />
              <Route path="/admin/alumni"   element={<AdminAlumni />} />
              <Route path="/admin/events"   element={<AdminEvents />} />
              <Route path="/admin/resources"element={<AdminResources />} />
              <Route path="/admin/campus-exchange" element={<AdminMarketplace />} />
            </Route>
          </Route>
        </Route>


        {/* ── Fallback ────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ── Global UniLink Campus AI Assistant ────────────────── */}
      <CampusAIChat />
    </BrowserRouter>
  );
}

export default App;
