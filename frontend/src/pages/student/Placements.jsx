import { useState, useEffect } from 'react';
import {
  Briefcase, Search, Filter, Bookmark, BookmarkCheck, Calendar,
  Clock, MapPin, Building, CheckCircle2, AlertCircle, X, ChevronRight,
  ExternalLink, FileText, Upload, Download, Check, ShieldCheck,
  Award, TrendingUp, Sparkles, AlertTriangle, Eye, ThumbsUp, Send, CheckSquare
} from 'lucide-react';
import { placementsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const OPPORTUNITY_TYPES = ['All Types', 'INTERNSHIP', 'FULL_TIME', 'CAMPUS_DRIVE', 'PART_TIME'];
const WORK_MODES = ['All Modes', 'ONSITE', 'REMOTE', 'HYBRID'];
const CATEGORIES = [
  'All Categories', 'SOFTWARE', 'AI_ML', 'DATA', 'CLOUD', 'DEVOPS',
  'WEB', 'MOBILE', 'CORE_ENGINEERING', 'PRODUCT', 'FINANCE'
];

export default function Placements() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'applications' | 'interviews' | 'saved' | 'profile'

  // Statistics
  const [stats, setStats] = useState(null);

  // Discover state
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedMode, setSelectedMode] = useState('All Modes');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState('newest');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [applyingOpp, setApplyingOpp] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Applications state
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilter, setAppFilter] = useState('all');

  // Interviews state
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  // Saved state
  const [savedOpps, setSavedOpps] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [cgpa, setCgpa] = useState('');
  const [activeBacklogs, setActiveBacklogs] = useState(0);
  const [totalBacklogs, setTotalBacklogs] = useState(0);
  const [graduationYear, setGraduationYear] = useState('');
  const [preferredRoles, setPreferredRoles] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [preferredWorkMode, setPreferredWorkMode] = useState('FLEXIBLE');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isWillingToRelocate, setIsWillingToRelocate] = useState(true);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Reporting
  const [reportingOpp, setReportingOpp] = useState(null);
  const [reportReason, setReportReason] = useState('suspicious_information');
  const [reportNotes, setReportNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Load stats
  const fetchStats = async () => {
    try {
      const res = await placementsApi.getStats();
      if (res.data?.data) setStats(res.data.data);
    } catch {
      // quiet fail
    }
  };

  // Fetch opportunities
  const fetchOpportunities = async () => {
    setLoadingOpps(true);
    try {
      const params = {
        page,
        limit: 9,
        sortBy,
        eligibleOnly,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedType !== 'All Types') params.type = selectedType;
      if (selectedMode !== 'All Modes') params.workMode = selectedMode;
      if (selectedCategory !== 'All Categories') params.category = selectedCategory;

      const res = await placementsApi.getOpportunities(params);
      if (res.data?.data) {
        setOpportunities(res.data.data);
        setTotalPages(res.data.meta?.totalPages || 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load opportunities');
    } finally {
      setLoadingOpps(false);
    }
  };

  // Fetch applications
  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const params = {};
      if (appFilter !== 'all') params.status = appFilter;
      const res = await placementsApi.getApplications(params);
      if (res.data?.data) setApplications(res.data.data);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch interviews
  const fetchInterviews = async () => {
    setLoadingInterviews(true);
    try {
      const res = await placementsApi.getInterviews();
      if (res.data?.data) setInterviews(res.data.data);
    } catch (err) {
      toast.error('Failed to load scheduled interviews');
    } finally {
      setLoadingInterviews(false);
    }
  };

  // Fetch saved
  const fetchSaved = async () => {
    setLoadingSaved(true);
    try {
      const res = await placementsApi.getSavedOpportunities();
      if (res.data?.data) setSavedOpps(res.data.data);
    } catch (err) {
      toast.error('Failed to load bookmarked opportunities');
    } finally {
      setLoadingSaved(false);
    }
  };

  // Fetch profile
  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await placementsApi.getPlacementProfile();
      if (res.data?.data) {
        const p = res.data.data;
        setProfile(p);
        setCgpa(p.cgpa != null ? String(p.cgpa) : '');
        setActiveBacklogs(p.activeBacklogs || 0);
        setTotalBacklogs(p.totalBacklogs || 0);
        setGraduationYear(p.graduationYear ? String(p.graduationYear) : '');
        setPreferredRoles(Array.isArray(p.preferredRoles) ? p.preferredRoles.join(', ') : '');
        setPreferredLocations(Array.isArray(p.preferredLocations) ? p.preferredLocations.join(', ') : '');
        setPreferredWorkMode(p.preferredWorkMode || 'FLEXIBLE');
        setLinkedinUrl(p.linkedinUrl || '');
        setGithubUrl(p.githubUrl || '');
        setIsWillingToRelocate(p.isWillingToRelocate !== false);
      }
    } catch (err) {
      toast.error('Failed to load placement profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'discover') fetchOpportunities();
    if (activeTab === 'applications') fetchApplications();
    if (activeTab === 'interviews') fetchInterviews();
    if (activeTab === 'saved') fetchSaved();
    if (activeTab === 'profile') fetchProfile();
  }, [activeTab, page, sortBy, selectedType, selectedMode, selectedCategory, eligibleOnly, appFilter]);

  // Handle Apply
  const handleApply = async () => {
    if (!applyingOpp) return;
    setIsSubmittingApp(true);
    try {
      await placementsApi.applyOpportunity(applyingOpp.id, { coverLetter });
      toast.success(`Successfully applied to ${applyingOpp.title}!`);
      setApplyingOpp(null);
      setCoverLetter('');
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Application submission failed';
      toast.error(errMsg);
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Handle Withdraw
  const handleWithdraw = async (applicationId) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be reversed.')) return;
    try {
      await placementsApi.withdrawApplication(applicationId);
      toast.success('Application withdrawn successfully');
      fetchApplications();
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw application');
    }
  };

  // Handle Accept / Decline Offer
  const handleRespondOffer = async (applicationId, status) => {
    const actionLabel = status === 'OFFER_ACCEPTED' ? 'accept' : 'decline';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this placement offer?`)) return;
    try {
      await placementsApi.updateApplicationStage(applicationId, { status });
      toast.success(status === 'OFFER_ACCEPTED' ? 'Congratulations! Offer accepted!' : 'Offer declined.');
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update offer status');
    }
  };

  // Handle Bookmark
  const handleToggleBookmark = async (opp) => {
    try {
      if (opp.isBookmarked) {
        await placementsApi.unbookmarkOpportunity(opp.id);
        toast.success('Removed from saved');
      } else {
        await placementsApi.bookmarkOpportunity(opp.id);
        toast.success('Saved to bookmarks');
      }
      fetchOpportunities();
      if (activeTab === 'saved') fetchSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bookmark');
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        cgpa: cgpa ? parseFloat(cgpa) : null,
        activeBacklogs: parseInt(activeBacklogs, 10) || 0,
        totalBacklogs: parseInt(totalBacklogs, 10) || 0,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        preferredRoles: preferredRoles.split(',').map((s) => s.trim()).filter(Boolean),
        preferredLocations: preferredLocations.split(',').map((s) => s.trim()).filter(Boolean),
        preferredWorkMode,
        linkedinUrl,
        githubUrl,
        isWillingToRelocate,
      };
      await placementsApi.updatePlacementProfile(payload);
      toast.success('Placement profile updated successfully');
      fetchProfile();
      fetchOpportunities();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Resume Upload
  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      toast.error('Please select a resume file (PDF or DOCX)');
      return;
    }
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      await placementsApi.uploadResume(formData);
      toast.success('Resume uploaded successfully');
      setResumeFile(null);
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  // Handle Report
  const handleReportOpportunity = async () => {
    if (!reportingOpp) return;
    setSubmittingReport(true);
    try {
      await placementsApi.reportOpportunity(reportingOpp.id, {
        category: reportReason,
        description: reportNotes || 'Reported for review by placement cell',
      });
      toast.success('Opportunity reported to TPC moderators');
      setReportingOpp(null);
      setReportNotes('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 36px',
        color: '#fff',
        marginBottom: 28,
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              background: 'rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Sparkles size={14} /> Training & Placement Cell (TPC)
            </span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0 0 10px', color: '#fff', letterSpacing: '-0.02em' }}>
            Campus Placements & Internships
          </h1>
          <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Discover campus recruitment drives, verify your academic eligibility with one click, apply to top technology and engineering employers, and track your interview rounds.
          </p>
        </div>

        {/* Quick Stats Pill Header */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            marginTop: 24,
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: 600 }}>My Applications</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{stats.myApplicationsCount || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: 600 }}>Shortlisted</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{stats.myShortlistedCount || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: 600 }}>Interviews Scheduled</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#facc15' }}>{stats.myInterviewsCount || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: 600 }}>Offers / Selected</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>{stats.mySelectedCount || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── TABS NAVIGATION ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--border-color)',
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 2,
      }}>
        {[
          { id: 'discover',     label: 'Discover Opportunities', icon: Search },
          { id: 'applications', label: 'My Applications',        icon: Briefcase, count: stats?.myApplicationsCount },
          { id: 'interviews',   label: 'Interviews & Tests',     icon: Calendar,  count: stats?.myInterviewsCount },
          { id: 'saved',        label: 'Saved Opportunities',    icon: Bookmark,  count: stats?.mySavedCount },
          { id: 'profile',      label: 'Placement Profile & Resume', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <tab.icon size={17} />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span style={{
                background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                padding: '2px 7px',
                borderRadius: 10,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: DISCOVER OPPORTUNITIES ──────────────────────────────────── */}
      {activeTab === 'discover' && (
        <div>
          {/* Search & Filters Bar */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by company, job role, or technology..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchOpportunities()}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              >
                {OPPORTUNITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>

              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              >
                {WORK_MODES.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="deadline">Sort: Deadline Approaching</option>
                <option value="company">Sort: Company (A-Z)</option>
              </select>
            </div>

            {/* Quick Filter: Eligible Only Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={eligibleOnly}
                  onChange={(e) => setEligibleOnly(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                />
                Show Only Opportunities I Am Eligible For
              </label>

              <button
                onClick={fetchOpportunities}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Opportunities Cards Grid */}
          {loadingOpps ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading placement opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
            }}>
              <Briefcase size={44} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No placement opportunities found</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {eligibleOnly
                  ? 'No current listings match your eligibility criteria. Try unchecking the eligibility filter or update your Placement Profile.'
                  : 'Check back soon as your college Training & Placement Cell publishes new recruitment drives.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 20,
            }}>
              {opportunities.map((opp) => {
                const daysLeft = Math.ceil((new Date(opp.applicationDeadline) - new Date()) / (1000 * 60 * 60 * 24));
                const isDeadlinePassed = daysLeft < 0;

                return (
                  <div
                    key={opp.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 22,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Top Row: Company & Badges */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            overflow: 'hidden',
                          }}>
                            {opp.companyLogo ? (
                              <img src={opp.companyLogo} alt={opp.companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              opp.companyName?.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                {opp.companyName}
                              </span>
                              {opp.company?.verificationStatus === 'VERIFIED' && (
                                <ShieldCheck size={15} style={{ color: '#10b981' }} title="Verified Company" />
                              )}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {opp.location || 'Location Flexible'} • {opp.workMode}
                            </span>
                          </div>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          onClick={() => handleToggleBookmark(opp)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: opp.isBookmarked ? '#f59e0b' : 'var(--text-muted)',
                            padding: 4,
                          }}
                          title={opp.isBookmarked ? 'Remove bookmark' : 'Save opportunity'}
                        >
                          {opp.isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                        </button>
                      </div>

                      {/* Job Title */}
                      <h3 style={{ fontSize: '1.12rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                        {opp.title}
                      </h3>

                      {/* Opportunity Type & Category Pill */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}>
                          {opp.opportunityType?.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.74rem',
                          fontWeight: 600,
                        }}>
                          {opp.category?.replace(/_/g, ' ')}
                        </span>
                        {opp.stipend && (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}>
                            {opp.stipend}
                          </span>
                        )}
                      </div>

                      {/* Short Description */}
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        margin: '0 0 16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}>
                        {opp.description}
                      </p>
                    </div>

                    {/* Bottom Section: Eligibility & Application Action */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                      {/* Eligibility Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        {opp.isEligible ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}>
                            <CheckCircle2 size={13} /> ELIGIBLE
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                          title={opp.eligibilityResult?.missingCriteria?.join('; ')}
                          >
                            <AlertCircle size={13} /> NOT ELIGIBLE
                          </span>
                        )}

                        {/* Deadline Status */}
                        <span style={{
                          fontSize: '0.76rem',
                          color: isDeadlinePassed ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}>
                          {isDeadlinePassed ? 'Deadline Passed' : `${daysLeft} days remaining`}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setSelectedOpp(opp)}
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
                        >
                          View Details
                        </button>

                        {opp.hasApplied ? (
                          <button
                            disabled
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '0.84rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: '#10b981',
                              fontWeight: 700,
                            }}
                          >
                            Applied ({opp.applicationStatus})
                          </button>
                        ) : isDeadlinePassed ? (
                          <button
                            disabled
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem', opacity: 0.6 }}
                          >
                            Closed
                          </button>
                        ) : (
                          <button
                            onClick={() => setApplyingOpp(opp)}
                            disabled={!opp.isEligible}
                            className="btn btn-primary"
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '0.84rem',
                              opacity: opp.isEligible ? 1 : 0.5,
                            }}
                          >
                            {opp.isEligible ? 'Apply Now' : 'Ineligible'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY APPLICATIONS ────────────────────────────────────────── */}
      {activeTab === 'applications' && (
        <div>
          {/* Status Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {['all', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'OFFER_ACCEPTED', 'REJECTED', 'WITHDRAWN'].map((st) => (
              <button
                key={st}
                onClick={() => setAppFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '1px solid var(--border-color)',
                  background: appFilter === st ? 'var(--primary)' : 'var(--bg-card)',
                  color: appFilter === st ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {loadingApps ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading your applications...
            </div>
          ) : applications.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
            }}>
              <Briefcase size={44} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No applications submitted yet</h3>
              <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Discover current recruitment drives and submit applications to start your placement pipeline.
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn-primary">
                Browse Open Opportunities
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {applications.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {app.opportunity?.title}
                        </h3>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}>
                          {app.opportunity?.opportunityType?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {app.opportunity?.companyName} • Applied on {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Stage status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background:
                          app.status === 'SELECTED' || app.status === 'OFFER_ACCEPTED'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : app.status === 'SHORTLISTED' || app.status === 'INTERVIEW'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : app.status === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : app.status === 'WITHDRAWN'
                                  ? 'var(--bg-tertiary)'
                                  : 'rgba(99, 102, 241, 0.15)',
                        color:
                          app.status === 'SELECTED' || app.status === 'OFFER_ACCEPTED'
                            ? '#10b981'
                            : app.status === 'SHORTLISTED' || app.status === 'INTERVIEW'
                              ? '#0284c7'
                              : app.status === 'REJECTED'
                                ? '#ef4444'
                                : app.status === 'WITHDRAWN'
                                  ? 'var(--text-muted)'
                                  : 'var(--primary)',
                      }}>
                        {app.currentStage || app.status}
                      </span>
                    </div>
                  </div>

                  {/* Recruitment Progress Stepper */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    overflowX: 'auto',
                    gap: 12,
                  }}>
                    {[
                      { key: 'APPLIED', label: 'Applied' },
                      { key: 'UNDER_REVIEW', label: 'Screening' },
                      { key: 'SHORTLISTED', label: 'Shortlisted' },
                      { key: 'TEST', label: 'Assessment' },
                      { key: 'INTERVIEW', label: 'Interview' },
                      { key: 'SELECTED', label: 'Selected' },
                    ].map((step, idx) => {
                      const stages = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'TEST', 'INTERVIEW', 'SELECTED', 'OFFER_ACCEPTED'];
                      const currentIdx = stages.indexOf(app.status);
                      const isCompleted = currentIdx >= idx;
                      const isCurrent = app.status === step.key;

                      return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: isCompleted ? 1 : 0.4 }}>
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: isCurrent ? 'var(--primary)' : isCompleted ? '#10b981' : 'var(--border-color)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}>
                            {isCompleted && !isCurrent ? <Check size={12} /> : idx + 1}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: isCurrent ? 700 : 500, color: 'var(--text-primary)' }}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Action Controls */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    {/* Offer Decision Actions */}
                    {app.status === 'SELECTED' && (
                      <>
                        <button
                          onClick={() => handleRespondOffer(app.id, 'OFFER_ACCEPTED')}
                          className="btn btn-primary"
                          style={{ background: '#10b981', borderColor: '#10b981' }}
                        >
                          <Check size={16} style={{ marginRight: 6 }} /> Accept Placement Offer
                        </button>
                        <button
                          onClick={() => handleRespondOffer(app.id, 'OFFER_DECLINED')}
                          className="btn btn-secondary"
                          style={{ color: '#ef4444' }}
                        >
                          Decline Offer
                        </button>
                      </>
                    )}

                    {/* Withdraw Allowed for APPLIED / UNDER_REVIEW */}
                    {['APPLIED', 'UNDER_REVIEW'].includes(app.status) && (
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        className="btn btn-secondary"
                        style={{ color: '#ef4444', fontSize: '0.84rem' }}
                      >
                        Withdraw Application
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: INTERVIEWS & TESTS ──────────────────────────────────────── */}
      {activeTab === 'interviews' && (
        <div>
          {loadingInterviews ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading your scheduled interviews...
            </div>
          ) : interviews.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
            }}>
              <Calendar size={44} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No interviews currently scheduled</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                When your application is shortlisted for an assessment or interview round, the TPC schedule will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {interviews.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#0284c7',
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {item.type?.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: item.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                      }}>
                        {item.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                      {item.opportunity?.companyName} • {item.opportunity?.title}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        <span>{new Date(item.scheduledAt).toLocaleString()} ({item.durationMinutes} mins)</span>
                      </div>
                      {item.venue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MapPin size={16} style={{ color: '#ef4444' }} />
                          <span>Venue: {item.venue}</span>
                        </div>
                      )}
                      {item.instructions && (
                        <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                          <strong>Instructions:</strong> {item.instructions}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.meetingLink && (
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <ExternalLink size={16} /> Join Virtual Interview
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SAVED OPPORTUNITIES ────────────────────────────────────── */}
      {activeTab === 'saved' && (
        <div>
          {loadingSaved ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading bookmarked opportunities...
            </div>
          ) : savedOpps.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
            }}>
              <Bookmark size={44} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No saved opportunities</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Bookmark interesting job drives from the Discover tab to review them later.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {savedOpps.map((opp) => (
                <div
                  key={opp.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                      {opp.title}
                    </h3>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {opp.companyName} • {opp.location || 'Onsite'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => setSelectedOpp(opp)} className="btn btn-secondary" style={{ flex: 1 }}>
                      Details
                    </button>
                    <button onClick={() => setApplyingOpp(opp)} className="btn btn-primary" style={{ flex: 1 }}>
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: PLACEMENT PROFILE & RESUME ─────────────────────────────── */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {loadingProfile ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading placement profile...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Placement Status Card */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Recruitment Placement Status
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Your official placement standing with your college Training & Placement Cell.
                  </p>
                </div>
                <span style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  background: profile?.placedStatus === 'PLACED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: profile?.placedStatus === 'PLACED' ? '#10b981' : 'var(--primary)',
                }}>
                  {profile?.placedStatus === 'PLACED' ? 'PLACED / OFFER EXTENDED' : 'ACTIVELY SEEKING PLACEMENT'}
                </span>
              </div>

              {/* Secure Resume Section */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 28px',
              }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Placement Resume (Private & Secure)
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Your resume document is strictly access-controlled and visible only to you and authorized placement officers.
                </p>

                {profile?.resumeFilename ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    marginBottom: 18,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText size={28} style={{ color: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {profile.resumeFilename}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Uploaded on {new Date(profile.resumeUploadedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={placementsApi.getResumeDownloadUrl(profile.resumeFilename)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}
                    >
                      <Download size={15} /> Download
                    </a>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f59e0b',
                    fontSize: '0.88rem',
                    marginBottom: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <AlertTriangle size={18} />
                    <span>No resume uploaded yet. Having a verified resume is required for several job applications.</span>
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleResumeUpload} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="submit"
                    disabled={!resumeFile || uploadingResume}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.86rem' }}
                  >
                    {uploadingResume ? 'Uploading...' : 'Upload New Resume'}
                  </button>
                </form>
              </div>

              {/* Academic Eligibility & Career Preferences Form */}
              <form onSubmit={handleSaveProfile} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Academic Credentials for Eligibility Engine
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  The placement engine checks these verified academic standing metrics when you apply.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Cumulative CGPA (0.0 - 10.0)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="e.g. 8.45"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Active Backlogs (Current)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={activeBacklogs}
                      onChange={(e) => setActiveBacklogs(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Total Backlogs (History)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalBacklogs}
                      onChange={(e) => setTotalBacklogs(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2025"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Preferred Job Roles (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer, Cloud Architect, Data Analyst"
                    value={preferredRoles}
                    onChange={(e) => setPreferredRoles(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Preferred Work Mode
                  </label>
                  <select
                    value={preferredWorkMode}
                    onChange={(e) => setPreferredWorkMode(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="FLEXIBLE">Flexible / Any</option>
                    <option value="ONSITE">Onsite Only</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote Only</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      GitHub Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={isWillingToRelocate}
                    onChange={(e) => setIsWillingToRelocate(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                  />
                  I am willing to relocate for internships and full-time opportunities
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                    {savingProfile ? 'Saving...' : 'Save Placement Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: OPPORTUNITY DETAILS ────────────────────────────────────── */}
      {selectedOpp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 640,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 28,
            position: 'relative',
          }}>
            <button
              onClick={() => setSelectedOpp(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Building size={24} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedOpp.title}
                </h3>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {selectedOpp.companyName} • {selectedOpp.location || 'Flexible'}
                </div>
              </div>
            </div>

            {/* Eligibility Breakdown */}
            <div style={{
              background: selectedOpp.isEligible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${selectedOpp.isEligible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem', color: selectedOpp.isEligible ? '#10b981' : '#f59e0b', marginBottom: 6 }}>
                {selectedOpp.isEligible ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{selectedOpp.isEligible ? 'You Meet All Eligibility Criteria' : 'Eligibility Evaluation Summary'}</span>
              </div>
              {selectedOpp.eligibilityResult?.missingCriteria?.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: '0.84rem', color: '#f59e0b' }}>
                  {selectedOpp.eligibilityResult.missingCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '0.92rem', color: 'var(--text-primary)' }}>Opportunity Details</h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedOpp.description}
              </p>
            </div>

            {/* Specifics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              <div><strong>Stipend / Salary:</strong> {selectedOpp.stipend || 'Competitive'}</div>
              <div><strong>Duration:</strong> {selectedOpp.duration || 'Full Term'}</div>
              <div><strong>Work Mode:</strong> {selectedOpp.workMode}</div>
              <div><strong>Deadline:</strong> {new Date(selectedOpp.applicationDeadline).toLocaleDateString()}</div>
              {selectedOpp.venue && <div><strong>Drive Venue:</strong> {selectedOpp.venue}</div>}
              {selectedOpp.driveDate && <div><strong>Drive Date:</strong> {new Date(selectedOpp.driveDate).toLocaleDateString()}</div>}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <button
                onClick={() => { setSelectedOpp(null); setReportingOpp(selectedOpp); }}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <AlertTriangle size={14} /> Report Opportunity
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setSelectedOpp(null)} className="btn btn-secondary">
                  Close
                </button>
                {!selectedOpp.hasApplied && selectedOpp.isEligible && (
                  <button
                    onClick={() => { const opp = selectedOpp; setSelectedOpp(null); setApplyingOpp(opp); }}
                    className="btn btn-primary"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APPLY TO OPPORTUNITY ───────────────────────────────────── */}
      {applyingOpp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 540,
            padding: 28,
            position: 'relative',
          }}>
            <button
              onClick={() => setApplyingOpp(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Apply to {applyingOpp.title}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Confirm your application to {applyingOpp.companyName}. Your placement profile snapshot and resume will be submitted to the recruitment team.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Cover Letter / Pitch (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Describe your passion for this role, key projects, and why you're a great fit..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setApplyingOpp(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={isSubmittingApp}
                className="btn btn-primary"
              >
                {isSubmittingApp ? 'Submitting Application...' : 'Confirm Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT OPPORTUNITY ─────────────────────────────────────── */}
      {reportingOpp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 500,
            padding: 28,
            position: 'relative',
          }}>
            <button
              onClick={() => setReportingOpp(null)}
              style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Report Opportunity to Placement Cell
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Flag suspicious listings, fake companies, or inaccurate requirements for administrative review.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Reason for report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="fake_opportunity">Fake Opportunity / Scam</option>
                <option value="misleading_salary">Misleading Stipend / Salary</option>
                <option value="suspicious_link">Suspicious External Link</option>
                <option value="incorrect_information">Inaccurate Academic Criteria</option>
                <option value="other">Other Concern</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Additional Details
              </label>
              <textarea
                rows={3}
                placeholder="Provide specific details to help TPC administrators evaluate this report..."
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setReportingOpp(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleReportOpportunity}
                disabled={submittingReport}
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                {submittingReport ? 'Submitting Report...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
