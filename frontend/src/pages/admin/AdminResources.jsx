import { useState, useEffect } from 'react';
import {
  BookOpen, Search, Filter, Shield, AlertTriangle, CheckCircle,
  XCircle, Trash2, RefreshCw, Eye, Download, X, Archive, Check
} from 'lucide-react';
import { adminApi, resourcesApi } from '../../api';
import toast from 'react-hot-toast';

export default function AdminResources() {
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('all');
  const [status, setStatus] = useState('all');

  // Reject modal state
  const [rejectingResource, setRejectingResource] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchResources();
    fetchStats();
  }, [resourceType, status]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getResources({
        resourceType: resourceType !== 'all' ? resourceType : undefined,
        status: status !== 'all' ? status : undefined,
        search: search.trim() || undefined,
      });
      setResources(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load campus resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminApi.getResourceStats();
      setStats(res.data?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleModerate = async (resourceId, action, reason = '') => {
    try {
      await adminApi.moderateResource(resourceId, { action, reason });
      toast.success(`Resource successfully ${action}d!`);
      fetchResources();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} resource`);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setSubmittingAction(true);
    try {
      await handleModerate(rejectingResource.id, 'reject', rejectionReason);
      setRejectingResource(null);
      setRejectionReason('');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDelete = async (resourceId, title) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteResource(resourceId);
      toast.success('Resource deleted from system.');
      fetchResources();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const getStatusBadge = (resStatus) => {
    switch (resStatus) {
      case 'PUBLISHED':
        return <span className="status-pill status-pub">Published</span>;
      case 'PENDING_REVIEW':
        return <span className="status-pill status-pen">Pending Review</span>;
      case 'REJECTED':
        return <span className="status-pill status-rej">Rejected</span>;
      case 'DRAFT':
        return <span className="status-pill status-dra">Draft</span>;
      case 'ARCHIVED':
        return <span className="status-pill status-arc">Archived</span>;
      default:
        return <span className="status-pill">{resStatus}</span>;
    }
  };

  return (
    <div className="admin-resources-page">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="admin-page-header">
        <div>
          <div className="admin-tag">
            <Shield size={14} />
            <span>Campus Content Moderation</span>
          </div>
          <h1 className="admin-title">Academic Resource Repository</h1>
          <p className="admin-subtitle">Moderate, audit, and approve faculty documents and student course materials.</p>
        </div>

        <button onClick={() => { fetchResources(); fetchStats(); }} className="btn-refresh">
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Metrics Cards ─────────────────────────────────────── */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Total Resources</span>
            <span className="metric-val">{stats.total || 0}</span>
          </div>
          <div className="metric-card highlight-warning">
            <span className="metric-label">Pending Approval</span>
            <span className="metric-val text-warning">{stats.pending || 0}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Live Published</span>
            <span className="metric-val text-success">{stats.published || 0}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Total Downloads</span>
            <span className="metric-val">{stats.totalDownloads || 0}</span>
          </div>
        </div>
      )}

      {/* ── Filters Bar ───────────────────────────────────────── */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, subject, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchResources()}
            className="search-input"
          />
        </div>

        <div className="filters-group">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="NOTES">Notes</option>
            <option value="PYQ">PYQ</option>
            <option value="LAB_MANUAL">Lab Manual</option>
            <option value="QUESTION_BANK">Question Bank</option>
            <option value="STUDY_MATERIAL">Study Material</option>
            <option value="SYLLABUS">Syllabus</option>
          </select>
        </div>
      </div>

      {/* ── Resources Table ───────────────────────────────────── */}
      {loading ? (
        <div className="admin-loading">
          <RefreshCw className="animate-spin" size={28} />
          <p>Loading academic resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="admin-empty-state">
          <BookOpen size={48} className="empty-icon" />
          <h3>No Academic Resources Found</h3>
          <p>No resources match the selected moderation filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Type</th>
                <th>Uploader</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res) => (
                <tr key={res.id}>
                  <td className="col-resource">
                    <div className="res-title">{res.title}</div>
                    <div className="res-meta">
                      <span className="code-pill">{res.subjectCode}</span>
                      <span>{res.subject}</span>
                      {res.semester && <span>• Sem {res.semester}</span>}
                    </div>
                    {res.moderationReason && res.status === 'REJECTED' && (
                      <div className="rejection-note">
                        <strong>Reason:</strong> {res.moderationReason}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="type-badge">{res.resourceType.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <div className="uploader-meta">
                      <span className="u-name">{res.uploader?.teacherProfile?.fullName || 'Faculty'}</span>
                      <span className="u-email">{res.uploader?.email}</span>
                    </div>
                  </td>
                  <td>{getStatusBadge(res.status)}</td>
                  <td>
                    <div className="usage-meta">
                      <span><Eye size={12} /> {res.viewCount || 0}</span>
                      <span><Download size={12} /> {res.downloadCount || 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      {res.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            className="btn-approve"
                            onClick={() => handleModerate(res.id, 'approve')}
                            title="Approve & Publish"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => setRejectingResource(res)}
                            title="Reject"
                          >
                            <X size={14} /> Reject
                          </button>
                        </>
                      )}

                      {res.status === 'PUBLISHED' && (
                        <button
                          className="btn-archive"
                          onClick={() => handleModerate(res.id, 'archive')}
                          title="Archive"
                        >
                          <Archive size={14} /> Archive
                        </button>
                      )}

                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(res.id, res.title)}
                        title="Delete Resource"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Rejection Modal ────────────────────────────────────── */}
      {rejectingResource && (
        <div className="modal-backdrop" onClick={() => setRejectingResource(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <AlertTriangle size={20} className="text-warning" />
                <h3>Reject Academic Resource</h3>
              </div>
              <button onClick={() => setRejectingResource(null)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <p className="modal-desc">
              Please enter an explicit moderation reason explaining why <strong>"{rejectingResource.title}"</strong> was rejected. This reason will be logged in the AuditLog and sent to the faculty member.
            </p>

            <form onSubmit={handleConfirmReject} className="modal-form">
              <div className="form-group">
                <label className="form-label">Moderation Reason *</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Incomplete question paper, wrong syllabus year, copyrighted material..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-textarea"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setRejectingResource(null)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="btn-confirm-reject"
                >
                  {submittingAction ? 'Rejecting...' : 'Reject Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin-resources-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .admin-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }

        .admin-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .admin-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .admin-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .highlight-warning {
          border-left: 4px solid #f59e0b;
        }

        .metric-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .metric-val {
          font-size: 1.7rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .text-warning { color: #d97706; }
        .text-success { color: #059669; }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          padding: 8px 14px;
          flex: 1;
          max-width: 380px;
        }

        .search-icon {
          color: var(--text-muted);
          margin-right: 8px;
        }

        .search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.88rem;
          width: 100%;
        }

        .filters-group {
          display: flex;
          gap: 10px;
        }

        .filter-select {
          padding: 8px 14px;
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          background: var(--bg-surface, #ffffff);
          font-size: 0.85rem;
          color: var(--text-primary);
          outline: none;
        }

        .table-wrapper {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .admin-table th {
          background: var(--bg-surface-2, #f8fafc);
          padding: 14px 18px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border-default, #e2e8f0);
        }

        .admin-table td {
          padding: 16px 18px;
          border-bottom: 1px solid var(--border-subtle, #f1f5f9);
          vertical-align: middle;
        }

        .col-resource { max-width: 320px; }

        .res-title {
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 3px;
        }

        .res-meta {
          font-size: 0.78rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .code-pill {
          font-weight: 700;
          color: #d97706;
          background: rgba(245, 158, 11, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .rejection-note {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #b91c1c;
          background: #fef2f2;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .type-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          background: var(--bg-surface-2, #f1f5f9);
          border-radius: 6px;
          color: var(--text-secondary);
        }

        .uploader-meta {
          display: flex;
          flex-direction: column;
        }

        .u-name { font-weight: 600; color: var(--text-primary); }
        .u-email { font-size: 0.72rem; color: var(--text-muted); }

        .status-pill {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .status-pub { background: #d1fae5; color: #047857; }
        .status-pen { background: #fef3c7; color: #b45309; }
        .status-rej { background: #fee2e2; color: #b91c1c; }
        .status-dra { background: #f3f4f6; color: #4b5563; }
        .status-arc { background: #e2e8f0; color: #475569; }

        .usage-meta {
          display: flex;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .usage-meta span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .table-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-approve {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-reject {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: #fee2e2;
          color: #b91c1c;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-archive {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: var(--bg-surface-2, #f1f5f9);
          color: var(--text-secondary);
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-delete {
          padding: 6px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-delete:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        /* ── Modal ─────────────────────────────────────────────── */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-card {
          background: var(--bg-surface, #ffffff);
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-close {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .form-textarea {
          padding: 10px;
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          outline: none;
          font-size: 0.88rem;
          background: var(--bg-surface, #ffffff);
          color: var(--text-primary);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .btn-cancel {
          padding: 8px 16px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-confirm-reject {
          padding: 8px 16px;
          background: #ef4444;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-loading, .admin-empty-state {
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
