import { useState, useEffect } from 'react';
import {
  Briefcase, Plus, Search, Filter, CheckCircle2, XCircle, AlertCircle,
  Building, Calendar, Clock, MapPin, FileText, Download, Users,
  Award, TrendingUp, Check, X, Shield, ShieldCheck, RefreshCw, ChevronRight
} from 'lucide-react';
import { placementsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { id: 'opportunities', label: 'Opportunities & Drives', icon: Briefcase },
  { id: 'applicants',    label: 'Applicants Pipeline',    icon: Users },
  { id: 'companies',     label: 'Company Registry',       icon: Building },
  { id: 'interviews',    label: 'Interview Schedule',     icon: Calendar },
  { id: 'analytics',     label: 'Placement Analytics',    icon: TrendingUp },
];

export default function AdminPlacements() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('opportunities');

  // Stats
  const [stats, setStats] = useState(null);

  // Opportunities state
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOpp, setNewOpp] = useState({
    companyName: '',
    title: '',
    description: '',
    opportunityType: 'INTERNSHIP',
    category: 'SOFTWARE',
    workMode: 'ONSITE',
    location: '',
    stipend: '',
    applicationDeadline: '',
    driveDate: '',
    venue: '',
    eligibleDepartments: 'Computer Science & Engineering, Information Science',
    eligibleSemesters: '7, 8',
    eligibleGraduationYears: '2025',
    minimumCgpa: '7.0',
    maxActiveBacklogs: '0',
    requiredSkills: 'Java, Python, SQL',
  });
  const [creatingOpp, setCreatingOpp] = useState(false);

  // Applicants state
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appOpportunityId, setAppOpportunityId] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('');

  // Schedule Interview Modal
  const [interviewModalApp, setInterviewModalApp] = useState(null);
  const [interviewType, setInterviewType] = useState('TECHNICAL_INTERVIEW');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('45');
  const [interviewVenue, setInterviewVenue] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [interviewInstructions, setInterviewInstructions] = useState('');
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  // Companies state
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', industry: 'Technology', website: '', headquarters: '' });
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Interviews state
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);

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
      const res = await placementsApi.getOpportunities({ limit: 50 });
      if (res.data?.data) setOpportunities(res.data.data);
    } catch (err) {
      toast.error('Failed to load opportunities');
    } finally {
      setLoadingOpps(false);
    }
  };

  // Fetch applications
  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const params = { limit: 50 };
      if (appOpportunityId) params.opportunityId = appOpportunityId;
      if (appStatusFilter) params.status = appStatusFilter;
      const res = await placementsApi.getApplications(params);
      if (res.data?.data) setApplications(res.data.data);
    } catch (err) {
      toast.error('Failed to load applicants list');
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch companies
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await placementsApi.getCompanies({ limit: 50 });
      if (res.data?.data) setCompanies(res.data.data);
    } catch (err) {
      toast.error('Failed to load companies registry');
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch interviews
  const fetchInterviews = async () => {
    setLoadingInterviews(true);
    try {
      const res = await placementsApi.getInterviews({ limit: 50 });
      if (res.data?.data) setInterviews(res.data.data);
    } catch (err) {
      toast.error('Failed to load interview schedule');
    } finally {
      setLoadingInterviews(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'opportunities') fetchOpportunities();
    if (activeTab === 'applicants') { fetchApplications(); fetchOpportunities(); }
    if (activeTab === 'companies') fetchCompanies();
    if (activeTab === 'interviews') fetchInterviews();
    if (activeTab === 'analytics') fetchStats();
  }, [activeTab, appOpportunityId, appStatusFilter]);

  // Create Opportunity
  const handleCreateOpportunity = async (e) => {
    e.preventDefault();
    if (!newOpp.companyName || !newOpp.title || !newOpp.applicationDeadline) {
      toast.error('Company name, title, and deadline are required');
      return;
    }
    setCreatingOpp(true);
    try {
      const payload = {
        companyName: newOpp.companyName.trim(),
        title: newOpp.title.trim(),
        description: newOpp.description.trim() || 'Recruitment drive for engineering students.',
        opportunityType: newOpp.opportunityType,
        category: newOpp.category,
        workMode: newOpp.workMode,
        location: newOpp.location || null,
        stipend: newOpp.stipend || null,
        applicationDeadline: newOpp.applicationDeadline,
        driveDate: newOpp.driveDate || null,
        venue: newOpp.venue || null,
        eligibility: {
          eligibleDepartments: newOpp.eligibleDepartments.split(',').map((s) => s.trim()).filter(Boolean),
          eligibleSemesters: newOpp.eligibleSemesters.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean),
          eligibleGraduationYears: newOpp.eligibleGraduationYears.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean),
          minimumCgpa: newOpp.minimumCgpa ? parseFloat(newOpp.minimumCgpa) : null,
          maxActiveBacklogs: newOpp.maxActiveBacklogs ? parseInt(newOpp.maxActiveBacklogs, 10) : 0,
          requiredSkills: newOpp.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        },
      };

      await placementsApi.createOpportunity(payload);
      toast.success('Opportunity created as DRAFT');
      setShowCreateModal(false);
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create opportunity');
    } finally {
      setCreatingOpp(false);
    }
  };

  // Publish Opportunity
  const handlePublishOpp = async (id) => {
    try {
      await placementsApi.publishOpportunity(id);
      toast.success('Opportunity published to students!');
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publishing failed');
    }
  };

  // Close Opportunity
  const handleCloseOpp = async (id) => {
    try {
      await placementsApi.closeOpportunity(id);
      toast.success('Applications closed');
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close opportunity');
    }
  };

  // Cancel Opportunity
  const handleCancelOpp = async (id) => {
    const reason = window.prompt('Enter reason for cancelling this recruitment drive:');
    if (reason === null) return;
    try {
      await placementsApi.cancelOpportunity(id, { reason });
      toast.success('Opportunity cancelled');
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel opportunity');
    }
  };

  // Shortlist Candidate
  const handleShortlistCandidate = async (appId) => {
    try {
      await placementsApi.shortlistApplication(appId, { notes: 'Approved by TPC' });
      toast.success('Candidate shortlisted');
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to shortlist candidate');
    }
  };

  // Reject Candidate
  const handleRejectCandidate = async (appId) => {
    try {
      await placementsApi.rejectApplication(appId, { notes: 'Application not selected' });
      toast.success('Application marked rejected');
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject application');
    }
  };

  // Select Candidate
  const handleSelectCandidate = async (appId) => {
    if (!window.confirm('Mark this student as SELECTED for placement and extend job offer?')) return;
    try {
      await placementsApi.selectApplication(appId, { notes: 'Selected for placement offer' });
      toast.success('Candidate selected for placement!');
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark candidate selected');
    }
  };

  // Schedule Interview
  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!interviewModalApp || !interviewTime) {
      toast.error('Scheduled date and time is required');
      return;
    }
    setSchedulingInterview(true);
    try {
      await placementsApi.scheduleInterview({
        applicationId: interviewModalApp.id,
        type: interviewType,
        scheduledAt: interviewTime,
        durationMinutes: parseInt(interviewDuration, 10) || 45,
        venue: interviewVenue || null,
        meetingLink: interviewLink || null,
        instructions: interviewInstructions || null,
      });
      toast.success('Interview scheduled and candidate notified!');
      setInterviewModalApp(null);
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule interview');
    } finally {
      setSchedulingInterview(false);
    }
  };

  // Create Company
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompany.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setCreatingCompany(true);
    try {
      await placementsApi.createCompany({
        name: newCompany.name.trim(),
        industry: newCompany.industry.trim(),
        website: newCompany.website.trim() || null,
        headquarters: newCompany.headquarters.trim() || null,
      });
      toast.success('Company added to registry');
      setShowCompanyModal(false);
      setNewCompany({ name: '', industry: 'Technology', website: '', headquarters: '' });
      fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create company');
    } finally {
      setCreatingCompany(false);
    }
  };

  // Verify Company
  const handleVerifyCompany = async (id, status) => {
    try {
      await placementsApi.verifyCompany(id, { status, notes: `Status updated by Admin ${user.email}` });
      toast.success(`Company marked as ${status}`);
      fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification update failed');
    }
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
            Training & Placement Cell (TPC) Management
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Coordinate campus drives, manage applicant pipelines, enforce eligibility rules, and track college placement outcomes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
        >
          <Plus size={18} /> Create Opportunity / Drive
        </button>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 26 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Opportunities</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {stats.totalOpportunities || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 2 }}>
              {stats.publishedOpportunities || 0} Active / Published
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Applicants</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
              {stats.totalApplications || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {stats.uniqueApplicantsCount || 0} Unique Students
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Shortlisted Candidates</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
              {stats.shortlistedCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {stats.interviewCount || 0} In Assessment / Interview
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Placed / Selected</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
              {stats.selectedCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 2 }}>
              {stats.acceptedCount || 0} Offers Accepted
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Placement Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
              {stats.placementRate || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Across participating students
            </div>
          </div>
        </div>
      )}

      {/* ── NAVIGATION TABS ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', marginBottom: 24, overflowX: 'auto' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
              whiteSpace: 'nowrap',
            }}
          >
            <tab.icon size={17} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: OPPORTUNITIES & DRIVES ─────────────────────────────────── */}
      {activeTab === 'opportunities' && (
        <div>
          {loadingOpps ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading opportunities...</div>
          ) : opportunities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <Briefcase size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No opportunities listed yet</h3>
              <p style={{ margin: '6px 0 16px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Create your first campus recruitment drive or internship.</p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">Create Opportunity</button>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Title & Company</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Work Mode</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Deadline</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Applicants</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp) => (
                    <tr key={opp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{opp.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{opp.companyName}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{opp.opportunityType}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{opp.workMode}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{new Date(opp.applicationDeadline).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: opp.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.1)' : opp.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-tertiary)',
                          color: opp.status === 'PUBLISHED' ? '#10b981' : opp.status === 'DRAFT' ? '#f59e0b' : 'var(--text-secondary)',
                        }}>
                          {opp.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>{opp.applicationsCount || 0}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {opp.status === 'DRAFT' && (
                            <button onClick={() => handlePublishOpp(opp.id)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                              Publish
                            </button>
                          )}
                          {opp.status === 'PUBLISHED' && (
                            <button onClick={() => handleCloseOpp(opp.id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                              Close
                            </button>
                          )}
                          {['DRAFT', 'PUBLISHED'].includes(opp.status) && (
                            <button onClick={() => handleCancelOpp(opp.id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}>
                              Cancel
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
      )}

      {/* ── TAB 2: APPLICANTS PIPELINE ────────────────────────────────────── */}
      {activeTab === 'applicants' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <select
              value={appOpportunityId}
              onChange={(e) => setAppOpportunityId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="">All Opportunities</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>{o.companyName} - {o.title}</option>
              ))}
            </select>

            <select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="">All Stages</option>
              {['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'TEST', 'INTERVIEW', 'SELECTED', 'OFFER_ACCEPTED', 'REJECTED', 'WITHDRAWN'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {loadingApps ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading applicants...</div>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No applicants found</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Applications submitted by students will appear in this pipeline.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Candidate</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Opportunity</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Department</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>CGPA & Backlogs</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Current Stage</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Resume</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Recruitment Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {app.student?.studentProfile?.fullName || app.student?.email}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          USN: {app.student?.studentProfile?.usn || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: 'var(--text-primary)' }}>{app.opportunity?.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{app.opportunity?.companyName}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {app.student?.studentProfile?.department || 'N/A'} (Sem {app.student?.studentProfile?.semester || '?'})
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        <div>CGPA: <strong>{app.student?.placementProfile?.cgpa ?? 'N/A'}</strong></div>
                        <div style={{ fontSize: '0.76rem', color: app.student?.placementProfile?.activeBacklogs > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          Active: {app.student?.placementProfile?.activeBacklogs || 0}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: app.status === 'SELECTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                          color: app.status === 'SELECTED' ? '#10b981' : 'var(--primary)',
                        }}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {app.resumeFilename || app.student?.placementProfile?.resumeFilename ? (
                          <a
                            href={placementsApi.getResumeDownloadUrl(app.resumeFilename || app.student?.placementProfile?.resumeFilename)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}
                          >
                            <Download size={14} /> Resume
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {['APPLIED', 'UNDER_REVIEW'].includes(app.status) && (
                            <button onClick={() => handleShortlistCandidate(app.id)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.76rem' }}>
                              Shortlist
                            </button>
                          )}
                          {['SHORTLISTED', 'TEST'].includes(app.status) && (
                            <button onClick={() => setInterviewModalApp(app)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.76rem' }}>
                              Schedule Round
                            </button>
                          )}
                          {['SHORTLISTED', 'TEST', 'INTERVIEW'].includes(app.status) && (
                            <button onClick={() => handleSelectCandidate(app.id)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.76rem', background: '#10b981', borderColor: '#10b981' }}>
                              Select Candidate
                            </button>
                          )}
                          {!['REJECTED', 'WITHDRAWN', 'SELECTED', 'OFFER_ACCEPTED'].includes(app.status) && (
                            <button onClick={() => handleRejectCandidate(app.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.76rem', color: '#ef4444' }}>
                              Reject
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
      )}

      {/* ── TAB 3: COMPANIES REGISTRY ─────────────────────────────────────── */}
      {activeTab === 'companies' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowCompanyModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Partner Company
            </button>
          </div>

          {loadingCompanies ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading companies...</div>
          ) : companies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <Building size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No companies registered</h3>
              <p style={{ margin: '6px 0 16px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Add recruiting partners to link them with opportunities.</p>
              <button onClick={() => setShowCompanyModal(true)} className="btn btn-primary">Add Company</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {companies.map((comp) => (
                <div key={comp.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{comp.name}</h3>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: comp.verificationStatus === 'VERIFIED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: comp.verificationStatus === 'VERIFIED' ? '#10b981' : '#ef4444',
                    }}>
                      {comp.verificationStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {comp.industry} • {comp.headquarters || 'India'}
                  </div>

                  <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                    {comp.verificationStatus !== 'VERIFIED' && (
                      <button onClick={() => handleVerifyCompany(comp.id, 'VERIFIED')} className="btn btn-primary" style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem' }}>
                        Verify
                      </button>
                    )}
                    {comp.verificationStatus !== 'REJECTED' && (
                      <button onClick={() => handleVerifyCompany(comp.id, 'REJECTED')} className="btn btn-secondary" style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', color: '#ef4444' }}>
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: INTERVIEWS SCHEDULE ────────────────────────────────────── */}
      {activeTab === 'interviews' && (
        <div>
          {loadingInterviews ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading schedule...</div>
          ) : interviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <Calendar size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No interviews scheduled</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>When you schedule rounds for shortlisted candidates, they appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {interviews.map((int) => (
                <div key={int.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{int.type?.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: int.status === 'COMPLETED' ? '#10b981' : '#f59e0b' }}>{int.status}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{int.title}</h4>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Candidate: {int.student?.studentProfile?.fullName || int.student?.email}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(int.scheduledAt).toLocaleString()} ({int.durationMinutes} mins)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: ANALYTICS ──────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Department Breakdown */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Department-Wise Recruitment Pipeline
              </h3>
              {stats?.deptBreakdown && Object.keys(stats.deptBreakdown).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(stats.deptBreakdown).map(([dept, data]) => (
                    <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dept}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {data.applications} applied • <strong style={{ color: '#10b981' }}>{data.selections} selected</strong>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No department data collected yet.</p>
              )}
            </div>

            {/* Company Breakdown */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Company Selection Distribution
              </h3>
              {stats?.companySelections && Object.keys(stats.companySelections).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(stats.companySelections).map(([comp, count]) => (
                    <div key={comp} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{comp}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{count} students selected</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No offers recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE OPPORTUNITY MODAL ──────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: 28, position: 'relative' }}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Create Placement Drive / Internship</h2>

            <form onSubmit={handleCreateOpportunity} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Company Name *</label>
                  <input type="text" required placeholder="e.g. Google India" value={newOpp.companyName} onChange={(e) => setNewOpp({ ...newOpp, companyName: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Job / Role Title *</label>
                  <input type="text" required placeholder="e.g. Software Engineer Intern" value={newOpp.title} onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Job Description</label>
                <textarea rows={3} placeholder="Role overview, responsibilities..." value={newOpp.description} onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Type</label>
                  <select value={newOpp.opportunityType} onChange={(e) => setNewOpp({ ...newOpp, opportunityType: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="CAMPUS_DRIVE">Campus Drive</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Work Mode</label>
                  <select value={newOpp.workMode} onChange={(e) => setNewOpp({ ...newOpp, workMode: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="ONSITE">Onsite</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Stipend / CTC</label>
                  <input type="text" placeholder="e.g. 50,000 / mo" value={newOpp.stipend} onChange={(e) => setNewOpp({ ...newOpp, stipend: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Application Deadline *</label>
                  <input type="date" required value={newOpp.applicationDeadline} onChange={(e) => setNewOpp({ ...newOpp, applicationDeadline: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Min CGPA</label>
                  <input type="number" step="0.1" placeholder="e.g. 7.5" value={newOpp.minimumCgpa} onChange={(e) => setNewOpp({ ...newOpp, minimumCgpa: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.86rem', color: 'var(--text-primary)' }}>Eligibility Constraints</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input type="text" placeholder="Eligible Departments (e.g. Computer Science, ISE)" value={newOpp.eligibleDepartments} onChange={(e) => setNewOpp({ ...newOpp, eligibleDepartments: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                  <input type="text" placeholder="Required Skills (e.g. Java, Spring Boot)" value={newOpp.requiredSkills} onChange={(e) => setNewOpp({ ...newOpp, requiredSkills: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={creatingOpp} className="btn btn-primary">{creatingOpp ? 'Creating...' : 'Create Draft'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCHEDULE INTERVIEW MODAL ─────────────────────────────────────── */}
      {interviewModalApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 520, padding: 26, position: 'relative' }}>
            <button onClick={() => setInterviewModalApp(null)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Schedule Round for {interviewModalApp.student?.studentProfile?.fullName || interviewModalApp.student?.email}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {interviewModalApp.opportunity?.companyName} • {interviewModalApp.opportunity?.title}
            </p>

            <form onSubmit={handleScheduleInterview} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Assessment / Interview Type</label>
                <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="ONLINE_TEST">Online Coding Test</option>
                  <option value="OFFLINE_TEST">Written Aptitude Test</option>
                  <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                  <option value="HR_INTERVIEW">HR Interview</option>
                  <option value="GROUP_DISCUSSION">Group Discussion</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Date & Time *</label>
                <input type="datetime-local" required value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Meeting Link or Campus Venue</label>
                <input type="text" placeholder="https://meet.google.com/xyz or Seminar Hall B" value={interviewLink || interviewVenue} onChange={(e) => { setInterviewLink(e.target.value); setInterviewVenue(e.target.value); }} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Candidate Instructions</label>
                <textarea rows={2} placeholder="Requirements, platform details..." value={interviewInstructions} onChange={(e) => setInterviewInstructions(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setInterviewModalApp(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={schedulingInterview} className="btn btn-primary">{schedulingInterview ? 'Scheduling...' : 'Notify Candidate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD COMPANY MODAL ────────────────────────────────────────────── */}
      {showCompanyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 480, padding: 26, position: 'relative' }}>
            <button onClick={() => setShowCompanyModal(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Add Partner Company</h3>
            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" required placeholder="Company Name *" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Industry (e.g. Cloud, Automotive)" value={newCompany.industry} onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <input type="url" placeholder="Careers / Official Website" value={newCompany.website} onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Headquarters Location" value={newCompany.headquarters} onChange={(e) => setNewCompany({ ...newCompany, headquarters: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setShowCompanyModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={creatingCompany} className="btn btn-primary">{creatingCompany ? 'Adding...' : 'Add Company'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
