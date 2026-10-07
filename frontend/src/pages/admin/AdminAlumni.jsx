import { useState, useEffect } from 'react';
import {
  Award, Search, Filter, Shield, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, X, Check, Ban, Eye, Star, Briefcase, GraduationCap
} from 'lucide-react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

export default function AdminAlumni() {
  const [alumniList, setAlumniList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'all'

  // Reject Modal State
  const [rejectingAlumnus, setRejectingAlumnus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchAlumni();
    fetchStats();
  }, [status, activeTab]);

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim() || undefined,
      };
      if (activeTab === 'queue') {
        params.status = 'PENDING';
      } else if (status !== 'all') {
        params.status = status;
      }

      const res = await adminApi.getAlumni(params);
      setAlumniList(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load alumni records');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminApi.getAlumniStats();
      setStats(res.data?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async (alumniId) => {
    try {
      await adminApi.verifyAlumni(alumniId, { status: 'VERIFIED' });
      toast.success('Alumni verified successfully! Now visible in mentorship discovery.');
      fetchAlumni();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }
    setSubmittingAction(true);
    try {
      await adminApi.verifyAlumni(rejectingAlumnus.id, {
        status: 'REJECTED',
        reason: rejectionReason.trim(),
      });
      toast.success('Alumni verification request rejected');
      setRejectingAlumnus(null);
      setRejectionReason('');
      fetchAlumni();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject verification');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSuspend = async (alumniId) => {
    const reason = window.prompt('Reason for suspending alumni account:', 'Administrative review');
    if (reason === null) return;
    try {
      await adminApi.suspendAlumni(alumniId, { reason });
      toast.success('Alumni account suspended');
      fetchAlumni();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to suspend alumni');
    }
  };

  const handleReactivate = async (alumniId) => {
    try {
      await adminApi.verifyAlumni(alumniId, { status: 'VERIFIED' });
      toast.success('Alumni privileges reactivated');
      fetchAlumni();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reactivate alumni');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', fontFamily: 'var(--font-display)' }}>
            Alumni & Mentorship Moderation
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
            Verify alumni credentials, review evidence, and oversee student mentorship relationships across your institution.
          </p>
        </div>

        <button
          onClick={() => { fetchAlumni(); fetchStats(); }}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>TOTAL ALUMNI</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>{stats.totalAlumni || 0}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>VERIFIED MENTORS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>{stats.verifiedAlumni || 0}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>PENDING QUEUE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>{stats.pendingVerification || 0}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>ACTIVE MENTORSHIPS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#60a5fa' }}>{stats.activeMentorships || 0}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600 }}>COMPLETED</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#a78bfa' }}>{stats.completedMentorships || 0}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>AVG RATING</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#fbbf24' }}>
              {stats.averageRating ? `${stats.averageRating} ★` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'queue' ? 'rgba(245,158,11,0.2)' : 'transparent',
            color: activeTab === 'queue' ? '#f59e0b' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'queue' ? '2px solid #f59e0b' : '2px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Shield size={16} /> Verification Queue
          {stats?.pendingVerification > 0 && (
            <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>
              {stats.pendingVerification}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'all' ? 'rgba(59,130,246,0.2)' : 'transparent',
            color: activeTab === 'all' ? '#60a5fa' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'all' ? '2px solid #60a5fa' : '2px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Award size={16} /> All Alumni Directory
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '20px',
        background: '#1e293b',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="var(--color-text-secondary)" />
          <input
            type="text"
            placeholder="Search by company, job title, industry, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAlumni()}
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
          />
        </div>

        {activeTab === 'all' && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
          >
            <option value="all">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        )}

        <button onClick={fetchAlumni} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          Search
        </button>
      </div>

      {/* Table / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '12px' }} />
          <p>Loading alumni records...</p>
        </div>
      ) : alumniList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Shield size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }} />
          <h3>No Alumni Records Found</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {activeTab === 'queue' ? 'The verification queue is currently clear.' : 'No alumni match your search query.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '14px 16px' }}>ALUMNUS</th>
                <th style={{ padding: '14px 16px' }}>COMPANY & ROLE</th>
                <th style={{ padding: '14px 16px' }}>CLASS / DEGREE</th>
                <th style={{ padding: '14px 16px' }}>STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {alumniList.map((alumnus) => {
                const name = alumnus.user?.studentProfile?.fullName || alumnus.user?.email || 'Alumnus';
                const statusColor = {
                  VERIFIED: '#10b981',
                  PENDING: '#f59e0b',
                  REJECTED: '#ef4444',
                  SUSPENDED: '#64748b',
                }[alumnus.verificationStatus] || '#64748b';

                return (
                  <tr key={alumnus.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{alumnus.user?.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{alumnus.currentJobTitle}</div>
                      <div style={{ fontSize: '0.8rem', color: '#10b981' }}>{alumnus.currentCompany} ({alumnus.experienceYears}+ yrs)</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div>Class of {alumnus.graduationYear}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{alumnus.degree}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                        {alumnus.verificationStatus}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {alumnus.verificationStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleVerify(alumnus.id)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => { setRejectingAlumnus(alumnus); setRejectionReason(''); }}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}

                        {alumnus.verificationStatus === 'VERIFIED' && (
                          <button
                            onClick={() => handleSuspend(alumnus.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Ban size={14} /> Suspend
                          </button>
                        )}

                        {alumnus.verificationStatus === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReactivate(alumnus.id)}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckCircle size={14} /> Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingAlumnus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 800 }}>Reject Alumni Verification</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
              Please specify the audit reason for rejecting this alumni record (e.g., student record not found, invalid email).
            </p>

            <form onSubmit={handleRejectSubmit}>
              <textarea
                required
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason is required for administrative audit..."
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', marginBottom: '16px' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingAlumnus(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', background: '#ef4444', borderColor: '#ef4444' }}
                >
                  {submittingAction ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
