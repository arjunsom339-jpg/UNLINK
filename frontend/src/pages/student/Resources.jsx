import { useState, useEffect } from 'react';
import {
  FileText, Search, Filter, Bookmark, BookmarkCheck, Download,
  Eye, FolderOpen, BookOpen, Layers, Award, Tag, CheckCircle2,
  AlertCircle, X, ChevronRight, ExternalLink, RefreshCw, Flag,
  Building, GraduationCap, Clock, FileCode, Check
} from 'lucide-react';
import { resourcesApi } from '../../api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'all', label: 'All Resources', icon: '📚' },
  { id: 'NOTES', label: 'Notes', icon: '📝' },
  { id: 'PYQ', label: 'PYQs', icon: '📋' },
  { id: 'LAB_MANUAL', label: 'Lab Manuals', icon: '🧪' },
  { id: 'LAB_PROGRAM', label: 'Lab Programs', icon: '💻' },
  { id: 'ASSIGNMENT', label: 'Assignments', icon: '📄' },
  { id: 'QUESTION_BANK', label: 'Question Banks', icon: '❓' },
  { id: 'SYLLABUS', label: 'Syllabus', icon: '📑' },
  { id: 'STUDY_MATERIAL', label: 'Study Material', icon: '📖' },
  { id: 'PRESENTATION', label: 'Presentations', icon: '📊' },
  { id: 'EBOOK', label: 'E-Books', icon: '📕' },
];

const REPORT_REASONS = [
  'Incorrect content',
  'Copyright concern',
  'Wrong subject',
  'Duplicate',
  'Inappropriate',
  'Broken file',
  'Misleading information',
  'Other',
];

export default function Resources() {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'saved'
  const [resources, setResources] = useState([]);
  const [savedResources, setSavedResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [semester, setSemester] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedResource, setSelectedResource] = useState(null);
  const [reportingResource, setReportingResource] = useState(null);
  const [reportCategory, setReportCategory] = useState(REPORT_REASONS[0]);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchResources();
    } else {
      fetchSavedResources();
    }
  }, [activeTab, selectedCategory, semester, sortBy, page]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        resourceType: selectedCategory !== 'all' ? selectedCategory : undefined,
        semester: semester !== 'all' ? semester : undefined,
        sortBy,
        search: search.trim() || undefined,
      };
      const res = await resourcesApi.getResources(params);
      setResources(res.data?.data || []);
      setTotalPages(res.data?.meta?.totalPages || 1);
      setTotalCount(res.data?.meta?.total || 0);
    } catch (err) {
      toast.error('Failed to load academic resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedResources = async () => {
    setLoading(true);
    try {
      const res = await resourcesApi.getSavedResources();
      setSavedResources(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load saved bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResources();
  };

  const handleToggleBookmark = async (resource, e) => {
    if (e) e.stopPropagation();
    try {
      const isSaved = resource.isSaved;
      if (isSaved) {
        await resourcesApi.unbookmarkResource(resource.id);
        toast.success('Removed from bookmarks');
      } else {
        await resourcesApi.bookmarkResource(resource.id);
        toast.success('Resource bookmarked');
      }

      // Optimistic state updates
      const updatedList = (list) =>
        list.map((r) => (r.id === resource.id ? { ...r, isSaved: !isSaved } : r));

      setResources(updatedList);
      if (selectedResource?.id === resource.id) {
        setSelectedResource({ ...selectedResource, isSaved: !isSaved });
      }

      if (isSaved) {
        setSavedResources((prev) => prev.filter((r) => r.id !== resource.id));
      } else {
        setSavedResources((prev) => [{ ...resource, isSaved: true }, ...prev]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bookmark action failed');
    }
  };

  const handleOpenDetails = async (resource) => {
    setSelectedResource(resource);
    // Debounced view count increment
    try {
      await resourcesApi.recordView(resource.id);
      setSelectedResource((prev) => prev ? { ...prev, viewCount: (prev.viewCount || 0) + 1 } : prev);
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, viewCount: (r.viewCount || 0) + 1 } : r))
      );
    } catch (err) {
      // non-blocking
    }
  };

  const handleDownload = async (resource, e) => {
    if (e) e.stopPropagation();
    try {
      toast.loading('Preparing download...', { id: 'download' });
      const downloadUrl = resourcesApi.getDownloadUrl(resource.id);
      window.open(downloadUrl, '_blank');
      toast.success('Download started', { id: 'download' });

      // Increment local count
      setSelectedResource((prev) => prev && prev.id === resource.id ? { ...prev, downloadCount: (prev.downloadCount || 0) + 1 } : prev);
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r))
      );
    } catch (err) {
      toast.error('Download failed', { id: 'download' });
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportingResource) return;
    setIsSubmittingReport(true);
    try {
      await resourcesApi.reportResource(reportingResource.id, {
        category: reportCategory,
        description: reportDescription,
      });
      toast.success('Report submitted. Our moderation team will review this file.');
      setReportingResource(null);
      setReportDescription('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'PDF';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const getCategoryBadgeClass = (type) => {
    switch (type) {
      case 'PYQ': return 'badge-pyq';
      case 'NOTES': return 'badge-notes';
      case 'LAB_MANUAL':
      case 'LAB_PROGRAM': return 'badge-lab';
      case 'QUESTION_BANK': return 'badge-qb';
      case 'SYLLABUS': return 'badge-syllabus';
      case 'STUDY_MATERIAL': return 'badge-material';
      default: return 'badge-default';
    }
  };

  return (
    <div className="resources-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="resources-header">
        <div>
          <div className="resources-badge">
            <BookOpen size={14} />
            <span>Academic Repository & Vault</span>
          </div>
          <h1 className="resources-title">Campus Resource Vault</h1>
          <p className="resources-subtitle">
            Faculty-curated study material, syllabus archives, previous year questions (PYQs), and laboratory manuals.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="resources-tabs">
          <button
            className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => { setActiveTab('discover'); setPage(1); }}
          >
            <FolderOpen size={16} />
            <span>Discover Resources</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <Bookmark size={16} />
            <span>Saved Resources</span>
            {savedResources.length > 0 && (
              <span className="tab-count">{savedResources.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Quick Access Categories ────────────────────────────── */}
      {activeTab === 'discover' && (
        <div className="category-scroll-container">
          <div className="category-scroll">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Search & Filter Bar ───────────────────────────────── */}
      {activeTab === 'discover' && (
        <div className="filter-bar">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, subject, code (e.g. BCS501, DBMS)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); fetchResources(); }}
                className="search-clear-btn"
              >
                <X size={16} />
              </button>
            )}
          </form>

          <div className="filter-controls">
            {/* Semester Filter */}
            <div className="filter-select-wrapper">
              <GraduationCap size={16} className="filter-icon" />
              <select
                value={semester}
                onChange={(e) => { setSemester(e.target.value); setPage(1); }}
                className="filter-select"
              >
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="filter-select-wrapper">
              <Filter size={16} className="filter-icon" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="most_downloaded">Most Downloaded</option>
                <option value="most_viewed">Most Viewed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Content Section ─────────────────────────────── */}
      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="resource-skeleton"></div>
          ))}
        </div>
      ) : activeTab === 'discover' ? (
        resources.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <BookOpen size={36} />
            </div>
            <h3>No Academic Resources Found</h3>
            <p>Try adjusting your search query, selecting different categories, or removing filters.</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('all'); setSemester('all'); fetchResources(); }}
              className="btn btn-secondary"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="results-info">
              <span>Showing <strong>{resources.length}</strong> of <strong>{totalCount}</strong> resources</span>
            </div>

            <div className="resources-grid">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="resource-card"
                  onClick={() => handleOpenDetails(resource)}
                >
                  <div className="card-top">
                    <span className={`category-tag ${getCategoryBadgeClass(resource.resourceType)}`}>
                      {resource.resourceType.replace('_', ' ')}
                    </span>
                    <button
                      className={`bookmark-btn ${resource.isSaved ? 'bookmarked' : ''}`}
                      onClick={(e) => handleToggleBookmark(resource, e)}
                      title={resource.isSaved ? 'Remove bookmark' : 'Save resource'}
                    >
                      {resource.isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>
                  </div>

                  <h3 className="resource-card-title">{resource.title}</h3>

                  <div className="subject-meta">
                    <span className="subject-code">{resource.subjectCode}</span>
                    <span className="subject-dot">•</span>
                    <span className="subject-name">{resource.subject}</span>
                  </div>

                  <div className="academic-badges">
                    {resource.semester && (
                      <span className="meta-badge">Sem {resource.semester}</span>
                    )}
                    {resource.department && (
                      <span className="meta-badge">{resource.department.code || resource.department.name}</span>
                    )}
                    <span className="meta-badge file-badge">
                      {formatFileSize(resource.fileSize)}
                    </span>
                  </div>

                  {resource.description && (
                    <p className="resource-card-desc">{resource.description}</p>
                  )}

                  <div className="card-footer">
                    <div className="uploader-info">
                      <div className="uploader-avatar">
                        {(resource.uploader?.teacherProfile?.fullName?.[0] || 'T').toUpperCase()}
                      </div>
                      <div className="uploader-details">
                        <span className="uploader-name">
                          {resource.uploader?.teacherProfile?.fullName || 'Faculty Member'}
                        </span>
                        <span className="verified-badge">
                          <Check size={10} /> Verified Faculty
                        </span>
                      </div>
                    </div>

                    <div className="stats-box">
                      <span className="stat-item" title="Views">
                        <Eye size={13} /> {resource.viewCount || 0}
                      </span>
                      <span className="stat-item" title="Downloads">
                        <Download size={13} /> {resource.downloadCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-download"
                      onClick={(e) => handleDownload(resource, e)}
                    >
                      <Download size={15} />
                      <span>Download</span>
                    </button>
                    <button
                      className="btn-view"
                      onClick={() => handleOpenDetails(resource)}
                    >
                      <span>Details</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="page-btn"
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )
      ) : (
        /* Saved Resources Tab */
        savedResources.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <Bookmark size={36} />
            </div>
            <h3>No Saved Resources Yet</h3>
            <p>Save notes, question papers, and manuals for quick offline reference before exams.</p>
            <button onClick={() => setActiveTab('discover')} className="btn btn-primary">
              Explore Resource Vault
            </button>
          </div>
        ) : (
          <div className="resources-grid">
            {savedResources.map((resource) => (
              <div
                key={resource.id}
                className="resource-card"
                onClick={() => handleOpenDetails(resource)}
              >
                <div className="card-top">
                  <span className={`category-tag ${getCategoryBadgeClass(resource.resourceType)}`}>
                    {resource.resourceType.replace('_', ' ')}
                  </span>
                  <button
                    className="bookmark-btn bookmarked"
                    onClick={(e) => handleToggleBookmark(resource, e)}
                    title="Remove from bookmarks"
                  >
                    <BookmarkCheck size={18} />
                  </button>
                </div>

                <h3 className="resource-card-title">{resource.title}</h3>

                <div className="subject-meta">
                  <span className="subject-code">{resource.subjectCode}</span>
                  <span className="subject-dot">•</span>
                  <span className="subject-name">{resource.subject}</span>
                </div>

                <div className="academic-badges">
                  {resource.semester && (
                    <span className="meta-badge">Sem {resource.semester}</span>
                  )}
                  {resource.department && (
                    <span className="meta-badge">{resource.department.code || resource.department.name}</span>
                  )}
                  <span className="meta-badge file-badge">
                    {formatFileSize(resource.fileSize)}
                  </span>
                </div>

                <div className="card-actions">
                  <button
                    className="btn-download"
                    onClick={(e) => handleDownload(resource, e)}
                  >
                    <Download size={15} />
                    <span>Download</span>
                  </button>
                  <button
                    className="btn-view"
                    onClick={() => handleOpenDetails(resource)}
                  >
                    <span>Details</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Resource Details Modal ─────────────────────────────── */}
      {selectedResource && (
        <div className="modal-backdrop" onClick={() => setSelectedResource(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-tag">
                <span className={`category-tag ${getCategoryBadgeClass(selectedResource.resourceType)}`}>
                  {selectedResource.resourceType.replace('_', ' ')}
                </span>
                <span className="format-tag">{selectedResource.fileName?.split('.').pop()?.toUpperCase() || 'PDF'}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedResource(null)}>
                <X size={20} />
              </button>
            </div>

            <h2 className="modal-title">{selectedResource.title}</h2>

            <div className="modal-subject-strip">
              <span className="modal-subject-code">{selectedResource.subjectCode}</span>
              <span className="modal-subject-name">{selectedResource.subject}</span>
            </div>

            {selectedResource.description && (
              <div className="modal-section">
                <h4 className="section-title">Description & Scope</h4>
                <p className="modal-description">{selectedResource.description}</p>
              </div>
            )}

            <div className="modal-grid-details">
              <div className="detail-item">
                <span className="detail-label">Semester</span>
                <span className="detail-value">{selectedResource.semester ? `Semester ${selectedResource.semester}` : 'All Semesters'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Department</span>
                <span className="detail-value">{selectedResource.department?.name || 'College-wide'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Academic Year</span>
                <span className="detail-value">{selectedResource.academicYear || 'Current'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">File Size</span>
                <span className="detail-value">{formatFileSize(selectedResource.fileSize)}</span>
              </div>
            </div>

            {selectedResource.tags && selectedResource.tags.length > 0 && (
              <div className="modal-tags">
                {selectedResource.tags.map((t, idx) => (
                  <span key={idx} className="tag-chip">#{t}</span>
                ))}
              </div>
            )}

            {/* Uploader Card */}
            <div className="modal-uploader-card">
              <div className="uploader-icon">
                <GraduationCap size={24} />
              </div>
              <div>
                <h4 className="uploader-title">
                  {selectedResource.uploader?.teacherProfile?.fullName || 'Verified Faculty'}
                </h4>
                <p className="uploader-subtitle">
                  {selectedResource.uploader?.teacherProfile?.designation || 'Faculty'} • {selectedResource.uploader?.teacherProfile?.department || 'Engineering'}
                </p>
              </div>
              <span className="verified-pill">
                <CheckCircle2 size={12} /> Verified
              </span>
            </div>

            {/* Metrics */}
            <div className="modal-metrics">
              <div className="metric">
                <Eye size={16} />
                <span>{selectedResource.viewCount || 0} views</span>
              </div>
              <div className="metric">
                <Download size={16} />
                <span>{selectedResource.downloadCount || 0} downloads</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-footer">
              <button
                className={`btn-save ${selectedResource.isSaved ? 'saved' : ''}`}
                onClick={() => handleToggleBookmark(selectedResource)}
              >
                {selectedResource.isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                <span>{selectedResource.isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button
                className="btn-report-flag"
                onClick={() => {
                  setReportingResource(selectedResource);
                }}
                title="Report resource"
              >
                <Flag size={16} />
                <span>Report</span>
              </button>

              <button
                className="btn-modal-download"
                onClick={(e) => handleDownload(selectedResource, e)}
              >
                <Download size={18} />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Modal ────────────────────────────────────────── */}
      {reportingResource && (
        <div className="modal-backdrop" onClick={() => setReportingResource(null)}>
          <div className="modal-card report-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-tag">
                <Flag size={18} className="text-danger" />
                <span className="text-danger font-bold">Report Academic Resource</span>
              </div>
              <button className="modal-close-btn" onClick={() => setReportingResource(null)}>
                <X size={20} />
              </button>
            </div>

            <p className="report-modal-desc">
              Help keep the UniLink Resource Vault safe and accurate. Please specify why you are reporting <strong>"{reportingResource.title}"</strong>.
            </p>

            <form onSubmit={handleReportSubmit} className="report-form">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="form-select"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Details (Optional)</label>
                <textarea
                  placeholder="Provide context, page numbers, or specifics..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="form-textarea"
                  rows={4}
                />
              </div>

              <div className="report-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReportingResource(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="btn btn-danger"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .resources-page {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .resources-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }

        .resources-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--color-primary-600, #4f46e5);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .resources-title {
          font-size: 1.85rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .resources-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 680px;
          line-height: 1.5;
        }

        .resources-tabs {
          display: flex;
          background: var(--bg-surface-2, #f1f5f9);
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: var(--bg-surface, #ffffff);
          color: var(--color-primary-600, #4f46e5);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .tab-count {
          padding: 1px 6px;
          font-size: 0.7rem;
          border-radius: 9999px;
          background: var(--color-primary-100, #e0e7ff);
          color: var(--color-primary-700, #4338ca);
        }

        .category-scroll-container {
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .category-scroll {
          display: flex;
          gap: 8px;
          min-width: max-content;
        }

        .category-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .category-chip:hover {
          border-color: var(--color-primary-300, #a5b4fc);
          color: var(--text-primary);
        }

        .category-chip.active {
          background: var(--color-primary-600, #4f46e5);
          color: #ffffff;
          border-color: var(--color-primary-600, #4f46e5);
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
        }

        .filter-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-form {
          flex: 1;
          min-width: 260px;
          display: flex;
          align-items: center;
          position: relative;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          padding: 8px 14px;
        }

        .search-icon {
          color: var(--text-muted);
          margin-right: 8px;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .search-clear-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .filter-controls {
          display: flex;
          gap: 10px;
        }

        .filter-select-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 10px;
          padding: 8px 12px;
        }

        .filter-icon {
          color: var(--text-muted);
        }

        .filter-select {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
        }

        .results-info {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .resource-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .resource-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -10px rgba(0,0,0,0.08);
          border-color: var(--color-primary-300, #a5b4fc);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .category-tag {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 6px;
        }

        .badge-pyq { background: #fef3c7; color: #b45309; }
        .badge-notes { background: #e0e7ff; color: #4338ca; }
        .badge-lab { background: #d1fae5; color: #047857; }
        .badge-qb { background: #fae8ff; color: #86198f; }
        .badge-syllabus { background: #e0f2fe; color: #0369a1; }
        .badge-material { background: #fce7f3; color: #be185d; }
        .badge-default { background: #f3f4f6; color: #4b5563; }

        .bookmark-btn {
          border: none;
          background: var(--bg-surface-2, #f8fafc);
          color: var(--text-muted);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bookmark-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .bookmark-btn.bookmarked {
          background: #eff6ff;
          color: #2563eb;
        }

        .resource-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .subject-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .subject-code {
          font-weight: 700;
          color: var(--color-primary-600, #4f46e5);
        }

        .subject-dot {
          color: var(--text-muted);
        }

        .academic-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .meta-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          background: var(--bg-surface-2, #f1f5f9);
          color: var(--text-secondary);
        }

        .file-badge {
          background: #f8fafc;
          border: 1px solid var(--border-default, #e2e8f0);
        }

        .resource-card-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle, #f1f5f9);
        }

        .uploader-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .uploader-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .uploader-details {
          display: flex;
          flex-direction: column;
        }

        .uploader-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .verified-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: #059669;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .stats-box {
          display: flex;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }

        .btn-download {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--color-primary-600, #4f46e5);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-download:hover {
          background: var(--color-primary-700, #4338ca);
        }

        .btn-view {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          background: var(--bg-surface-2, #f1f5f9);
          color: var(--text-primary);
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-view:hover {
          background: var(--border-default, #e2e8f0);
        }

        /* ── Modal ─────────────────────────────────────────────── */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.65);
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
          max-width: 600px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header-tag {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .format-tag {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          background: #f1f5f9;
          border-radius: 6px;
          color: #475569;
        }

        .modal-close-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.3;
          margin: 0;
        }

        .modal-subject-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(99, 102, 241, 0.05);
          border-radius: 8px;
        }

        .modal-subject-code {
          font-weight: 800;
          color: var(--color-primary-600, #4f46e5);
          font-size: 0.85rem;
        }

        .modal-subject-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .modal-description {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-grid-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: var(--bg-surface-2, #f8fafc);
          padding: 14px;
          border-radius: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .detail-value {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .modal-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tag-chip {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-primary-600, #4f46e5);
          background: var(--color-primary-50, #eef2ff);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .modal-uploader-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 12px;
        }

        .uploader-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(14, 165, 233, 0.1);
          color: #0ea5e9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .uploader-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .uploader-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }

        .verified-pill {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .modal-metrics {
          display: flex;
          gap: 20px;
          padding: 8px 0;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .modal-footer {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-save.saved {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }

        .btn-report-flag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: transparent;
          border-radius: 10px;
          color: var(--text-muted);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-report-flag:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        .btn-modal-download {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--color-primary-600, #4f46e5), var(--color-accent-600, #06b6d4));
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.95rem;
        }

        /* ── Report Modal ─────────────────────────────────────── */
        .report-modal-card {
          max-width: 480px;
        }

        .report-modal-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .form-select, .form-textarea {
          padding: 10px;
          border: 1px solid var(--border-default, #e2e8f0);
          border-radius: 8px;
          outline: none;
          font-size: 0.88rem;
          background: var(--bg-surface, #ffffff);
          color: var(--text-primary);
        }

        .report-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-danger {
          background: #ef4444;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-weight: 600;
          cursor: pointer;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          background: var(--bg-surface, #ffffff);
          border: 1px dashed var(--border-default, #e2e8f0);
          border-radius: 20px;
        }

        .empty-icon-box {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: var(--bg-surface-2, #f1f5f9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .resource-skeleton {
          height: 240px;
          background: var(--bg-surface-2, #e2e8f0);
          border-radius: 16px;
          animation: pulse 1.5s infinite;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }

        .page-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-default, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          font-weight: 600;
          cursor: pointer;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-indicator {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
