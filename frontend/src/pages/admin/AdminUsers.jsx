import { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Shield, UserCheck, ShieldAlert,
  MoreVertical, Check, Ban, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api';

const MOCK_USERS = [
  {
    id: 'u-1',
    name: 'Aakash Verma',
    email: 'aakash.v@college.edu',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    department: 'Computer Science',
    joinedAt: 'Aug 14, 2024'
  },
  {
    id: 'u-2',
    name: 'Dr. Ramesh Kumar',
    email: 'ramesh.k@college.edu',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    department: 'Computer Science',
    joinedAt: 'Jul 20, 2023'
  },
  {
    id: 'u-3',
    name: 'Dr. Suresh Varma',
    email: 'suresh.varma@college.edu',
    role: 'teacher',
    accountStatus: 'pending',
    isAdminVerified: false,
    department: 'Electronics & Comm.',
    joinedAt: 'Oct 6, 2026'
  },
  {
    id: 'u-4',
    name: 'Rohan Deshpande',
    email: 'rohan.d@college.edu',
    role: 'student',
    accountStatus: 'suspended',
    isAdminVerified: true,
    department: 'Mechanical',
    joinedAt: 'Jan 10, 2025'
  },
  {
    id: 'u-5',
    name: 'Meera Nambiar',
    email: 'meera.n@college.edu',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    department: 'AI & Data Science',
    joinedAt: 'Aug 22, 2024'
  },
  {
    id: 'u-6',
    name: 'System Admin Root',
    email: 'admin@unilink.internal',
    role: 'admin',
    accountStatus: 'active',
    isAdminVerified: true,
    department: 'Administration',
    joinedAt: 'Jan 1, 2023'
  }
];

export default function AdminUsers() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = () => {
    setIsLoading(true);
    const params = {
      page: currentPage,
      limit: 10,
      ...(roleFilter !== 'all' && { role: roleFilter }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
    };

    adminApi.getUsers(params)
      .then((res) => {
        if (res.data?.data && res.data.data.length > 0) {
          setUsers(res.data.data);
        }
      })
      .catch(() => {
        // Fallback to local mock data
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, currentPage]);

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await adminApi.updateStatus(userId, newStatus);
      toast.success(`User status changed to "${newStatus}"`);
    } catch {
      toast.success(`User status changed locally to "${newStatus}"`);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, accountStatus: newStatus } : u))
    );
  };

  const handleVerifyTeacher = async (userId, name) => {
    try {
      await adminApi.verifyTeacher(userId);
      toast.success(`${name} verified as Faculty`);
    } catch {
      toast.success(`${name} verified locally!`);
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, isAdminVerified: true, accountStatus: 'active' } : u
      )
    );
  };

  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (u.name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.department || '').toLowerCase().includes(s);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.accountStatus === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending Approval</span>;
      case 'suspended':
        return <span className="badge badge-danger">Suspended</span>;
      case 'banned':
        return <span className="badge badge-danger" style={{ background: '#7f1d1d', color: '#fecaca' }}>Banned</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-warning" style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>Admin</span>;
      case 'teacher':
        return <span className="badge badge-primary" style={{ background: 'rgba(14,165,233,0.15)', color: '#0284c7' }}>Faculty</span>;
      default:
        return <span className="badge badge-primary">Student</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Campus User Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Inspect student & faculty accounts, verify teacher credentials, and enforce campus moderation.
          </p>
        </div>

        <span className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          Total Accounts: {users.length}
        </span>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 38, height: 40 }}
            placeholder="Search by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            className="input"
            style={{ width: 'auto', height: 40 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Students Only</option>
            <option value="teacher">Faculty Only</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            className="input"
            style={{ width: 'auto', height: 40 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Approval</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* ── Users Table ────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '14px 20px' }}>User</th>
                <th style={{ padding: '14px 16px' }}>Role</th>
                <th style={{ padding: '14px 16px' }}>Department</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Joined</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Moderation Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  {/* User info */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        background: u.role === 'admin' ? '#f59e0b' : u.role === 'teacher' ? '#0ea5e9' : 'var(--color-primary-500)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '14px 16px' }}>
                    {getRoleBadge(u.role)}
                  </td>

                  {/* Department */}
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {u.department}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(u.accountStatus)}
                  </td>

                  {/* Joined Date */}
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {u.joinedAt}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      {u.role === 'teacher' && !u.isAdminVerified && (
                        <button
                          onClick={() => handleVerifyTeacher(u.id, u.name)}
                          className="btn btn-sm btn-primary"
                          style={{ background: '#10b981', borderColor: '#10b981', fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          Verify Faculty
                        </button>
                      )}

                      {u.accountStatus === 'active' && u.role !== 'admin' && (
                        <button
                          onClick={() => handleUpdateStatus(u.id, 'suspended')}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--color-danger-500)', fontSize: '0.75rem', padding: '4px 8px' }}
                          title="Suspend account"
                        >
                          Suspend
                        </button>
                      )}

                      {u.accountStatus === 'suspended' && (
                        <button
                          onClick={() => handleUpdateStatus(u.id, 'active')}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--color-accent-600)' }}
                        >
                          Reactivate
                        </button>
                      )}

                      {u.accountStatus !== 'banned' && u.role !== 'admin' && (
                        <button
                          onClick={() => handleUpdateStatus(u.id, 'banned')}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '4px 8px' }}
                          title="Ban account permanently"
                        >
                          Ban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filteredUsers.length} users
          </span>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
