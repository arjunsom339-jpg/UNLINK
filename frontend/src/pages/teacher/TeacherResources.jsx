import { useState, useEffect } from 'react';
import {
  BookOpen, Plus, FileText, Upload, CheckCircle2, Clock,
  AlertCircle, XCircle, Archive, Trash2, Edit, Eye, Download,
  Filter, Search, RefreshCw, X, ChevronRight, Check, AlertTriangle
} from 'lucide-react';
import { teacherApi, resourcesApi } from '../../api';
import toast from 'react-hot-toast';

const RESOURCE_TYPES = [
  { id: 'NOTES', label: 'Notes' },
  { id: 'PYQ', label: 'Previous Year Questions (PYQ)' },
  { id: 'LAB_MANUAL', label: 'Lab Manual' },
  { id: 'LAB_PROGRAM', label: 'Lab Program Code' },
  { id: 'ASSIGNMENT', label: 'Assignment / Solution' },
  { id: 'QUESTION_BANK', label: 'Question Bank' },
  { id: 'SYLLABUS', label: 'Syllabus Copy' },
  { id: 'STUDY_MATERIAL', label: 'Comprehensive Study Material' },
  { id: 'PRESENTATION', label: 'Lecture Slides / PPT' },
  { id: 'EBOOK', label: 'E-Book / Reference' },
  { id: 'OTHER', label: 'Other Document' },
];

export default function TeacherResources() {
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'upload'
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit modal
  const [editingResource, setEditingResource] = useState(null);

  // Upload Form state
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resourceType: 'NOTES',
    subject: '',
    subjectCode: '',
    semester: '5',
    academicYear: '2025-26',
    tags: '',
    visibility: 'COLLEGE',
    isDraft: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchResources();
    fetchStats();
  }, [statusFilter]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await teacherApi.getResources({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setResources(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load your resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await teacherApi.getResourceStats();
      setStats(res.data?.data || null);
    } catch (err) {
      // non-blocking
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 25 * 1024 * 1024) {
        toast.error('File exceeds 25MB limit.');
        return;
      }
      setFile(selected);
    }
  };

  const handleUploadSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || !formData.subjectCode) {
      toast.error('Title, Subject, and Subject Code are required.');
      return;
    }
    if (!file) {
      toast.error('Please attach a resource document (PDF, DOCX, PPT, etc.)');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      data.append('description', formData.description || '');
      data.append('resourceType', formData.resourceType);
      data.append('subject', formData.subject);
      data.append('subjectCode', formData.subjectCode);
      data.append('semester', formData.semester);
      data.append('academicYear', formData.academicYear);
      data.append('tags', formData.tags);
      data.append('visibility', formData.visibility);
      data.append('isDraft', saveAsDraft ? 'true' : 'false');
      if (!saveAsDraft) {
        data.append('status', 'PENDING_REVIEW');
      }

      await resourcesApi.createResource(data);
      toast.success(saveAsDraft ? 'Resource saved as draft!' : 'Resource submitted for review!');

      // Reset form
      setFile(null);
      setFormData({
        title: '',
        description: '',
        resourceType: 'NOTES',
        subject: '',
        subjectCode: '',
        semester: '5',
        academicYear: '2025-26',
        tags: '',
        visibility: 'COLLEGE',
        isDraft: false,
      });

      setActiveTab('resources');
      fetchResources();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (resource) => {
    if (!window.confirm(`Are you sure you want to archive "${resource.title}"?`)) return;
    try {
      await resourcesApi.archiveResource(resource.id);
      toast.success('Resource archived.');
      fetchResources();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed');
    }
  };

  const handleSubmitForReview = async (resource) => {
    try {
      await resourcesApi.submitForReview(resource.id);
      toast.success('Submitted for administrative review!');
      fetchResources();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingResource) return;
    try {
      await resourcesApi.updateResource(editingResource.id, {
        title: editingResource.title,
        description: editingResource.description,
        subject: editingResource.subject,
        subjectCode: editingResource.subjectCode,
        resourceType: editingResource.resourceType,
        semester: editingResource.semester,
        academicYear: editingResource.academicYear,
        visibility: editingResource.visibility,
        resubmit: editingResource.status === 'REJECTED',
      });
      toast.success('Resource updated successfully');
      setEditingResource(null);
      fetchResources();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="status-pill status-pub"><CheckCircle2 size={13} /> Published</span>;
      case 'PENDING_REVIEW':
        return <span className="status-pill status-pen"><Clock size={13} /> Pending Review</span>;
      case 'REJECTED':
        return <span className="status-pill status-rej"><XCircle size={13} /> Rejected</span>;
      case 'DRAFT':
        return <span className="status-pill status-dra"><Edit size={13} /> Draft</span>;
      case 'ARCHIVED':
        return <span className="status-pill status-arc"><Archive size={13} /> Archived</span>;
      default:
        return <span className="status-pill">{status}</span>;
    }
  };

  return (
    <div className="teacher-resources-page">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Resource Management</h1>
          <p className="page-subtitle">Upload and curate academic notes, question papers, and manuals for students.</p>
        </div>

        <div className="header-actions">
          <button
            className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            <BookOpen size={16} />
            <span>My Uploads</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Plus size={16} />
            <span>Upload Resource</span>
          </button>
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      {stats && (
        <div className="stats-strip">
          <div className="stat-card">
            <span className="stat-label">Total Shared</span>
            <span className="stat-value">{stats.total || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Live Published</span>
            <span className="stat-value text-success">{stats.published || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending Review</span>
            <span className="stat-value text-warning">{stats.pending || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Views</span>
            <span className="stat-value">{stats.totalViews || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Downloads</span>
            <span className="stat-value">{stats.totalDownloads || 0}</span>
          </div>
        </div>
      )}

      {/* ── Main Content Area ──────────────────────────────────── */}
      {activeTab === 'resources' ? (
        <div className="resources-list-section">
          {/* Status Filter Chips */}
          <div className="filter-chips">
            {['all', 'PUBLISHED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                className={`filter-chip ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All Uploads' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-state">
              <RefreshCw className="animate-spin" size={28} />
              <p>Loading your resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} className="empty-icon" />
              <h3>No Resources In This Category</h3>
              <p>Upload lecture notes, laboratory programs, or question papers for your courses.</p>
              <button onClick={() => setActiveTab('upload')} className="btn-primary">
                <Plus size={16} /> Upload Now
              </button>
            </div>
          ) : (
            <div className="resources-table-container">
              <table className="resources-table">
                <thead>
                  <tr>
                    <th>Title & Subject</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Engagement</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((res) => (
                    <tr key={res.id}>
                      <td className="cell-primary">
                        <div className="res-title">{res.title}</div>
                        <div className="res-sub">
                          <span className="code-badge">{res.subjectCode}</span> {res.subject}
                        </div>
                        {res.status === 'REJECTED' && res.moderationReason && (
                          <div className="rejection-box">
                            <AlertTriangle size={13} />
                            <span><strong>Reason:</strong> {res.moderationReason}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="type-badge">{res.resourceType.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <div className="target-info">
                          <span>Sem {res.semester || 'All'}</span>
                          <span className="sub-target">{res.visibility}</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(res.status)}</td>
                      <td>
                        <div className="engagement-info">
                          <span><Eye size={13} /> {res.viewCount || 0}</span>
                          <span><Download size={13} /> {res.downloadCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon"
                            onClick={() => setEditingResource(res)}
                            title="Edit metadata"
                          >
                            <Edit size={16} />
                          </button>

                          {(res.status === 'DRAFT' || res.status === 'REJECTED') && (
                            <button
                              className="btn-text-action"
                              onClick={() => handleSubmitForReview(res)}
                              title="Submit for review"
                            >
                              Submit
                            </button>
                          )}

                          {res.status === 'PUBLISHED' && (
                            <button
                              className="btn-icon text-muted"
                              onClick={() => handleArchive(res)}
                              title="Archive resource"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Upload Form */
        <div className="upload-form-card">
          <h2 className="form-heading">Upload Academic Document</h2>
          <p className="form-subheading">Publish verified materials to the college repository.</p>

          <form onSubmit={(e) => handleUploadSubmit(e, false)}>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Resource Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Database Systems Module 1 Notes (BCS501)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Resource Type *</label>
                <select
                  value={formData.resourceType}
                  onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                  className="form-input"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Database Management Systems"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject Code *</label>
                <input
                  type="text"
                  placeholder="e.g. BCS501"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="form-input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2025-26"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="form-input"
                >
                  <option value="COLLEGE">All College Students</option>
                  <option value="DEPARTMENT">My Department Only</option>
                  <option value="SEMESTER">Target Semester Only</option>
                  <option value="PRIVATE">Private Draft</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. DBMS, SQL, VTU, Module 1, Midterm"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Description / Syllabus Coverage</label>
                <textarea
                  rows={3}
                  placeholder="Summarize the topics covered in this document..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                />
              </div>

              {/* File Dropzone */}
              <div className="form-group full-width">
                <label className="form-label">Attach File *</label>
                <div className="file-dropzone">
                  <Upload size={32} className="upload-icon" />
                  {file ? (
                    <div className="file-selected">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      <button type="button" onClick={() => setFile(null)} className="file-remove-btn">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="dropzone-text">Click to choose document or drag and drop</p>
                      <p className="dropzone-hint">PDF, DOCX, PPTX, XLSX, TXT (Max 25MB)</p>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                        className="file-hidden-input"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={isSubmitting}
                onClick={(e) => handleUploadSubmit(e, true)}
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      {editingResource && (
        <div className="modal-backdrop" onClick={() => setEditingResource(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Resource Metadata</h3>
              <button onClick={() => setEditingResource(null)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  value={editingResource.subject}
                  onChange={(e) => setEditingResource({ ...editingResource, subject: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  value={editingResource.subjectCode}
                  onChange={(e) => setEditingResource({ ...editingResource, subjectCode: e.target.value.toUpperCase() })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setEditingResource(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes {editingResource.status === 'REJECTED' ? '& Resubmit' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .teacher-resources-page {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .page-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          gap: 8px;
          background: var(--bg-surface-2, #f1f5f9);
          padding: 4px;
          border-radius: 12px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.88rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: var(--bg-surface, #ffffff);
          color: #0ea5e9;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px;
        }

        .stat-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .text-success { color: #059669; }
        .text-warning { color: #d97706; }

        .filter-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
        }

        .filter-chip {
          padding: 6px 14px;
          border-radius: 9999px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          text-transform: capitalize;
        }

        .filter-chip.active {
          background: #0ea5e9;
          color: #ffffff;
          border-color: #0ea5e9;
        }

        .resources-table-container {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .resources-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
          text-align: left;
        }

        .resources-table th {
          background: var(--bg-surface-2, #f8fafc);
          padding: 14px 18px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-default, #e2e8f0);
        }

        .resources-table td {
          padding: 16px 18px;
          border-bottom: 1px solid var(--border-subtle, #f1f5f9);
          vertical-align: middle;
        }

        .cell-primary {
          max-width: 340px;
        }

        .res-title {
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .res-sub {
          font-size: 0.78rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .code-badge {
          font-weight: 700;
          color: #0ea5e9;
          background: rgba(14, 165, 233, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .rejection-box {
          margin-top: 8px;
          padding: 6px 10px;
          background: #fef2f2;
          border-left: 3px solid #ef4444;
          border-radius: 4px;
          color: #b91c1c;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .type-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          background: var(--bg-surface-2, #f1f5f9);
          border-radius: 6px;
          color: var(--text-secondary);
        }

        .target-info {
          display: flex;
          flex-direction: column;
          font-size: 0.8rem;
        }

        .sub-target {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .status-pub { background: #d1fae5; color: #047857; }
        .status-pen { background: #fef3c7; color: #b45309; }
        .status-rej { background: #fee2e2; color: #b91c1c; }
        .status-dra { background: #f3f4f6; color: #4b5563; }
        .status-arc { background: #e2e8f0; color: #475569; }

        .engagement-info {
          display: flex;
          gap: 12px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .engagement-info span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .row-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-icon {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }

        .btn-icon:hover {
          background: var(--bg-surface-2, #f1f5f9);
          color: var(--text-primary);
        }

        .btn-text-action {
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 700;
          background: #0ea5e9;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        /* ── Upload Form ────────────────────────────────────────── */
        .upload-form-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 20px;
          padding: 32px;
        }

        .form-heading {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .form-subheading {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .form-input {
          padding: 10px 14px;
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          outline: none;
          font-size: 0.9rem;
          background: var(--bg-surface, #ffffff);
          color: var(--text-primary);
        }

        .form-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .file-dropzone {
          border: 2px dashed var(--border-default, #cbd5e1);
          border-radius: 14px;
          padding: 32px 20px;
          text-align: center;
          position: relative;
          background: var(--bg-surface-2, #f8fafc);
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .file-dropzone:hover {
          border-color: #0ea5e9;
        }

        .file-hidden-input {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .upload-icon {
          color: #0ea5e9;
          margin-bottom: 8px;
        }

        .dropzone-text {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .dropzone-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .file-selected {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #ffffff;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
        }

        .file-name {
          font-weight: 700;
          color: #0ea5e9;
        }

        .file-size {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .file-remove-btn {
          border: none;
          background: transparent;
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-primary {
          background: #0ea5e9;
          color: #ffffff;
          padding: 10px 24px;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-secondary {
          background: var(--bg-surface-2, #f1f5f9);
          color: var(--text-primary);
          padding: 10px 20px;
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        /* ── Edit Modal ─────────────────────────────────────────── */
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
          max-width: 500px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .btn-close {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          color: var(--text-muted);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: var(--text-muted);
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
