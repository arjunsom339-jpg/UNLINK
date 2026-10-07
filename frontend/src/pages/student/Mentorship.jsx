import { useState, useEffect } from 'react';
import {
  Award, Search, Filter, Bookmark, BookmarkCheck, Calendar,
  MessageSquare, User, CheckCircle2, AlertCircle, X, ChevronRight,
  ExternalLink, Send, Star, Clock, Briefcase, MapPin, Sparkles,
  Check, Shield, Plus, RefreshCw, FileText
} from 'lucide-react';
import { alumniApi, mentorshipApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const MENTORSHIP_TOPICS = [
  'All Topics',
  'Software Engineering',
  'Backend Development',
  'Full Stack',
  'AI / ML & Data Science',
  'Cloud & DevOps',
  'System Design',
  'Interview Preparation',
  'Resume & Career Guidance',
  'Higher Studies Guidance',
  'Competitive Programming',
  'Cybersecurity',
  'Product Management',
];

export default function Mentorship() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'my_mentorships' | 'saved' | 'portal'
  
  // Discover State
  const [alumniList, setAlumniList] = useState([]);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // My Mentorships State
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Saved Alumni State
  const [savedAlumni, setSavedAlumni] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Modals & Drawers
  const [requestModalMentor, setRequestModalMentor] = useState(null);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestGoals, setRequestGoals] = useState('');
  const [requestMode, setRequestMode] = useState('FLEXIBLE');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [sessionModalRequest, setSessionModalRequest] = useState(null);
  const [sessionDateTime, setSessionDateTime] = useState('');
  const [sessionDuration, setSessionDuration] = useState(45);
  const [sessionMode, setSessionMode] = useState('CHAT');
  const [sessionLink, setSessionLink] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  const [feedbackModalRequest, setFeedbackModalRequest] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackHelpfulness, setFeedbackHelpfulness] = useState(5);
  const [feedbackCommunication, setFeedbackCommunication] = useState(5);
  const [feedbackReview, setFeedbackReview] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [profileDrawerAlumnus, setProfileDrawerAlumnus] = useState(null);

  // Alumni Portal Profile State
  const [myAlumniProfile, setMyAlumniProfile] = useState(null);
  const [loadingMyProfile, setLoadingMyProfile] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [profileForm, setProfileForm] = useState({
    graduationYear: 2023,
    degree: 'Bachelor of Engineering',
    currentJobTitle: '',
    currentCompany: '',
    industry: 'Technology',
    experienceYears: 1,
    location: '',
    bio: '',
    skills: '',
    mentorshipTopics: '',
    availabilityStatus: 'AVAILABLE',
    mentorshipMode: 'FLEXIBLE',
    linkedinUrl: '',
    portfolioUrl: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchAlumni();
    } else if (activeTab === 'my_mentorships') {
      fetchMyMentorships();
    } else if (activeTab === 'saved') {
      fetchSavedAlumni();
    } else if (activeTab === 'portal') {
      fetchMyAlumniData();
    }
  }, [activeTab, page, selectedTopic, availabilityFilter]);

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchAlumni = async () => {
    setLoadingAlumni(true);
    try {
      const params = { page, limit: 12 };
      if (search.trim()) params.search = search.trim();
      if (selectedTopic !== 'All Topics') params.topic = selectedTopic;
      if (availabilityFilter !== 'all') params.availabilityStatus = availabilityFilter;

      const res = await alumniApi.discoverAlumni(params);
      if (res.data?.success) {
        setAlumniList(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error('Failed to load alumni directory');
    } finally {
      setLoadingAlumni(false);
    }
  };

  const fetchMyMentorships = async () => {
    setLoadingRequests(true);
    try {
      const res = await mentorshipApi.getRequests({ role: 'student' });
      if (res.data?.success) {
        setMyRequests(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load mentorship requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSavedAlumni = async () => {
    setLoadingSaved(true);
    try {
      const res = await alumniApi.getSavedAlumni();
      if (res.data?.success) {
        setSavedAlumni(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load saved alumni');
    } finally {
      setLoadingSaved(false);
    }
  };

  const fetchMyAlumniData = async () => {
    setLoadingMyProfile(true);
    try {
      const [profileRes, requestsRes] = await Promise.all([
        alumniApi.getMyProfile(),
        mentorshipApi.getRequests({ role: 'alumni' }),
      ]);
      if (profileRes.data?.success && profileRes.data.data) {
        const p = profileRes.data.data;
        setMyAlumniProfile(p);
        setProfileForm({
          graduationYear: p.graduationYear || 2023,
          degree: p.degree || 'Bachelor of Engineering',
          currentJobTitle: p.currentJobTitle || '',
          currentCompany: p.currentCompany || '',
          industry: p.industry || 'Technology',
          experienceYears: p.experienceYears || 1,
          location: p.location || '',
          bio: p.bio || '',
          skills: Array.isArray(p.skills) ? p.skills.join(', ') : '',
          mentorshipTopics: Array.isArray(p.mentorshipTopics) ? p.mentorshipTopics.join(', ') : '',
          availabilityStatus: p.availabilityStatus || 'AVAILABLE',
          mentorshipMode: p.mentorshipMode || 'FLEXIBLE',
          linkedinUrl: p.linkedinUrl || '',
          portfolioUrl: p.portfolioUrl || '',
        });
      }
      if (requestsRes.data?.success) {
        setReceivedRequests(requestsRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyProfile(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggleBookmark = async (alumnus) => {
    try {
      if (alumnus.isBookmarked) {
        await alumniApi.unbookmarkAlumni(alumnus.id);
        toast.success(`Removed ${alumnus.user?.studentProfile?.fullName || 'mentor'} from bookmarks`);
      } else {
        await alumniApi.bookmarkAlumni(alumnus.id);
        toast.success(`Saved ${alumnus.user?.studentProfile?.fullName || 'mentor'} to bookmarks`);
      }
      // Refresh current view
      if (activeTab === 'discover') fetchAlumni();
      if (activeTab === 'saved') fetchSavedAlumni();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bookmark action failed');
    }
  };

  const handleOpenRequestModal = (mentor) => {
    setRequestModalMentor(mentor);
    setRequestTopic(mentor.mentorshipTopics?.[0] || 'Software Engineering Guidance');
    setRequestMessage(`Hi ${mentor.user?.studentProfile?.fullName || 'Mentor'}, I'd love your guidance on career growth and technical preparation.`);
    setRequestGoals('Build industry knowledge and prepare for interviews.');
    setRequestMode(mentor.mentorshipMode || 'FLEXIBLE');
  };

  const handleSubmitMentorshipRequest = async (e) => {
    e.preventDefault();
    if (!requestTopic.trim() || !requestMessage.trim()) {
      toast.error('Topic and message are required');
      return;
    }
    setIsSubmittingRequest(true);
    try {
      await mentorshipApi.createRequest({
        alumniProfileId: requestModalMentor.id,
        topic: requestTopic.trim(),
        message: requestMessage.trim(),
        goals: requestGoals.trim(),
        preferredMode: requestMode,
      });
      toast.success('Mentorship request sent successfully!');
      setRequestModalMentor(null);
      if (activeTab === 'my_mentorships') fetchMyMentorships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send mentorship request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) return;
    try {
      await mentorshipApi.cancelRequest(requestId, { reason: 'Cancelled by student' });
      toast.success('Mentorship request cancelled');
      fetchMyMentorships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const handleCompleteMentorship = async (requestId) => {
    if (!window.confirm('Mark this mentorship as completed? Both you and your mentor can now share feedback.')) return;
    try {
      await mentorshipApi.completeMentorship(requestId);
      toast.success('Mentorship marked as completed!');
      fetchMyMentorships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete mentorship');
    }
  };

  // Chat Actions
  const handleOpenChat = async (req) => {
    setActiveChatRequest(req);
    setLoadingMessages(true);
    try {
      const res = await mentorshipApi.getMessages(req.id);
      if (res.data?.success) {
        setChatMessages(res.data.data || []);
      }
    } catch (err) {
      toast.error('Could not load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatRequest) return;
    try {
      const res = await mentorshipApi.sendMessage(activeChatRequest.id, { message: newMessage.trim() });
      if (res.data?.success) {
        setChatMessages((prev) => [...prev, res.data.data]);
        setNewMessage('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Session Actions
  const handleOpenSessionModal = (req) => {
    setSessionModalRequest(req);
    const defaultDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    setSessionDateTime(defaultDate);
    setSessionDuration(45);
    setSessionMode('VIDEO');
    setSessionLink('');
    setSessionNotes('');
  };

  const handleSubmitSession = async (e) => {
    e.preventDefault();
    if (!sessionDateTime) {
      toast.error('Please choose a date and time for the session');
      return;
    }
    setIsSubmittingSession(true);
    try {
      await mentorshipApi.scheduleSession(sessionModalRequest.id, {
        scheduledAt: new Date(sessionDateTime).toISOString(),
        durationMinutes: sessionDuration,
        mode: sessionMode,
        meetingLink: sessionLink.trim(),
        notes: sessionNotes.trim(),
      });
      toast.success('Mentorship session scheduled successfully!');
      setSessionModalRequest(null);
      fetchMyMentorships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule session');
    } finally {
      setIsSubmittingSession(false);
    }
  };

  // Feedback Actions
  const handleOpenFeedbackModal = (req) => {
    setFeedbackModalRequest(req);
    setFeedbackRating(5);
    setFeedbackHelpfulness(5);
    setFeedbackCommunication(5);
    setFeedbackReview('');
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await mentorshipApi.submitFeedback(feedbackModalRequest.id, {
        rating: feedbackRating,
        helpfulness: feedbackHelpfulness,
        communication: feedbackCommunication,
        review: feedbackReview.trim(),
      });
      toast.success('Feedback submitted! 15 Reputation Karma awarded.');
      setFeedbackModalRequest(null);
      fetchMyMentorships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Alumni Portal Profile Form Submit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const payload = {
        ...profileForm,
        graduationYear: parseInt(profileForm.graduationYear, 10),
        experienceYears: parseInt(profileForm.experienceYears, 10),
        skills: profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        mentorshipTopics: profileForm.mentorshipTopics.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await alumniApi.createProfile(payload);
      if (res.data?.success) {
        toast.success('Alumni profile updated successfully!');
        setMyAlumniProfile(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save alumni profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAcceptReceivedRequest = async (requestId) => {
    try {
      await mentorshipApi.acceptRequest(requestId);
      toast.success('Request accepted! You can now communicate with your mentee.');
      fetchMyAlumniData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    }
  };

  const handleDeclineReceivedRequest = async (requestId) => {
    const reason = window.prompt('Reason for declining (optional):', 'Schedule full');
    if (reason === null) return;
    try {
      await mentorshipApi.declineRequest(requestId, { reason });
      toast.success('Request declined');
      fetchMyAlumniData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline request');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mentorship-page" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 'var(--radius-xl, 16px)',
        padding: '28px 32px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: '#10b981', marginBottom: '12px' }}>
            <Award size={16} /> Verified Alumni Mentorship Engine
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 10px 0', fontFamily: 'var(--font-display)' }}>
            Connect with College Alumni & Industry Mentors
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
            Discover verified former students from your college. Request dedicated 1-on-1 mentorship for career paths, backend development, system design, and placement interview prep.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('portal')}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontWeight: 600 }}
        >
          <Award size={18} />
          {myAlumniProfile ? 'My Mentor Portal' : 'Register as Mentor'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => { setActiveTab('discover'); setPage(1); }}
          className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            background: activeTab === 'discover' ? 'var(--color-primary, #10b981)' : 'transparent',
            color: activeTab === 'discover' ? '#fff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Search size={18} /> Discover Mentors
        </button>

        <button
          onClick={() => setActiveTab('my_mentorships')}
          className={`tab-btn ${activeTab === 'my_mentorships' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            background: activeTab === 'my_mentorships' ? 'var(--color-primary, #10b981)' : 'transparent',
            color: activeTab === 'my_mentorships' ? '#fff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={18} /> My Mentorships
          {myRequests.filter((r) => r.status === 'ACTIVE' || r.status === 'ACCEPTED').length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px' }}>
              {myRequests.filter((r) => r.status === 'ACTIVE' || r.status === 'ACCEPTED').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            background: activeTab === 'saved' ? 'var(--color-primary, #10b981)' : 'transparent',
            color: activeTab === 'saved' ? '#fff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bookmark size={18} /> Saved Mentors
        </button>

        <button
          onClick={() => setActiveTab('portal')}
          className={`tab-btn ${activeTab === 'portal' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            background: activeTab === 'portal' ? 'var(--color-primary, #10b981)' : 'transparent',
            color: activeTab === 'portal' ? '#fff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <User size={18} /> Mentor Portal & Profile
        </button>
      </div>

      {/* ── TAB 1: DISCOVER MENTORS ────────────────────────────────────────── */}
      {activeTab === 'discover' && (
        <div>
          {/* Search & Filter Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '24px',
            background: 'var(--card-bg, #1e293b)',
            padding: '16px',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md, 8px)', padding: '0 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search by company (e.g. Google), job title, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAlumni()}
                style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
              />
            </div>

            <select
              value={selectedTopic}
              onChange={(e) => { setSelectedTopic(e.target.value); setPage(1); }}
              style={{
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                minWidth: '180px',
              }}
            >
              {MENTORSHIP_TOPICS.map((top) => (
                <option key={top} value={top} style={{ background: '#1e293b' }}>{top}</option>
              ))}
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setPage(1); }}
              style={{
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#1e293b' }}>All Availability</option>
              <option value="AVAILABLE" style={{ background: '#1e293b' }}>Available</option>
              <option value="LIMITED" style={{ background: '#1e293b' }}>Limited Availability</option>
            </select>

            <button
              onClick={() => { setPage(1); fetchAlumni(); }}
              className="btn btn-primary"
              style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={16} /> Filter
            </button>
          </div>

          {/* Alumni Grid */}
          {loadingAlumni ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
              <RefreshCw size={32} className="spin" style={{ marginBottom: '12px' }} />
              <p>Discovering verified alumni mentors...</p>
            </div>
          ) : alumniList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card-bg, #1e293b)', borderRadius: 'var(--radius-lg, 12px)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <User size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }} />
              <h3>No Verified Alumni Found</h3>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
                No alumni mentors currently match your filters. Try clearing your search query or topic filter.
              </p>
              <button onClick={() => { setSearch(''); setSelectedTopic('All Topics'); setAvailabilityFilter('all'); }} className="btn btn-secondary">
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {alumniList.map((alumnus) => {
                const name = alumnus.user?.studentProfile?.fullName || 'Alumnus Mentor';
                const photo = alumnus.user?.studentProfile?.profilePhoto;
                return (
                  <div
                    key={alumnus.id}
                    style={{
                      background: 'var(--card-bg, #1e293b)',
                      borderRadius: 'var(--radius-lg, 12px)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    }}
                  >
                    {/* Header */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '1.2rem',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}>
                            {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{name}</h3>
                              <CheckCircle2 size={16} color="#10b981" title="Verified Alumni" />
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                              {alumnus.currentJobTitle} @ {alumnus.currentCompany}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleBookmark(alumnus)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: alumnus.isBookmarked ? '#f59e0b' : 'var(--color-text-secondary)' }}
                          title={alumnus.isBookmarked ? 'Remove Bookmark' : 'Save Mentor'}
                        >
                          {alumnus.isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                        </button>
                      </div>

                      {/* Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderRadius: '4px', fontWeight: 600 }}>
                          Class of {alumnus.graduationYear}
                        </span>
                        {alumnus.departmentRef?.name && (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                            {alumnus.departmentRef.name}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '4px', fontWeight: 600 }}>
                          {alumnus.experienceYears}+ yrs exp
                        </span>
                        {alumnus.matchScore !== undefined && (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.2))', color: '#fbbf24', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={12} /> {alumnus.matchScore}% Match
                          </span>
                        )}
                      </div>

                      {/* Bio */}
                      {alumnus.bio && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {alumnus.bio}
                        </p>
                      )}

                      {/* Mentorship Topics */}
                      {Array.isArray(alumnus.mentorshipTopics) && alumnus.mentorshipTopics.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>OFFERS MENTORSHIP IN:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {alumnus.mentorshipTopics.slice(0, 3).map((top, idx) => (
                              <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                                {top}
                              </span>
                            ))}
                            {alumnus.mentorshipTopics.length > 3 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', alignSelf: 'center' }}>
                                +{alumnus.mentorshipTopics.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenRequestModal(alumnus)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Send size={14} /> Request Mentorship
                      </button>
                      <button
                        onClick={() => setProfileDrawerAlumnus(alumnus)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        title="View Full Profile"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY MENTORSHIPS ────────────────────────────────────────── */}
      {activeTab === 'my_mentorships' && (
        <div>
          {loadingRequests ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
              <RefreshCw size={32} className="spin" style={{ marginBottom: '12px' }} />
              <p>Loading mentorship requests...</p>
            </div>
          ) : myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card-bg, #1e293b)', borderRadius: 'var(--radius-lg, 12px)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Calendar size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }} />
              <h3>No Active Mentorships Yet</h3>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
                You have not requested mentorship from any alumni yet. Discover graduates from your college and initiate your first request!
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn-primary">
                Browse Alumni Directory
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myRequests.map((req) => {
                const mentorName = req.alumnus?.studentProfile?.fullName || req.alumniProfile?.currentJobTitle || 'Mentor';
                const statusColor = {
                  PENDING: '#f59e0b',
                  ACCEPTED: '#3b82f6',
                  ACTIVE: '#10b981',
                  COMPLETED: '#8b5cf6',
                  DECLINED: '#ef4444',
                  CANCELLED: '#64748b',
                }[req.status] || '#64748b';

                return (
                  <div
                    key={req.id}
                    style={{
                      background: 'var(--card-bg, #1e293b)',
                      borderRadius: 'var(--radius-lg, 12px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '20px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{req.topic}</h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                            {req.status}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                          Mentor: <strong>{mentorName}</strong> {req.alumniProfile?.currentCompany && `(${req.alumniProfile.currentCompany})`}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444' }}
                          >
                            Cancel Request
                          </button>
                        )}

                        {(req.status === 'ACCEPTED' || req.status === 'ACTIVE') && (
                          <>
                            <button
                              onClick={() => handleOpenChat(req)}
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <MessageSquare size={14} /> Chat
                            </button>
                            <button
                              onClick={() => handleOpenSessionModal(req)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Calendar size={14} /> Schedule Session
                            </button>
                            <button
                              onClick={() => handleCompleteMentorship(req.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#10b981' }}
                            >
                              Complete
                            </button>
                          </>
                        )}

                        {req.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenFeedbackModal(req)}
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Star size={14} /> Leave Feedback
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Your Message:</div>
                      <div>{req.message}</div>
                      {req.goals && (
                        <div style={{ marginTop: '6px', color: '#10b981' }}>
                          <strong>Goals:</strong> {req.goals}
                        </div>
                      )}
                    </div>

                    {req.rejectionReason && (
                      <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong>Reason:</strong> {req.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SAVED ALUMNI ───────────────────────────────────────────── */}
      {activeTab === 'saved' && (
        <div>
          {loadingSaved ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
              <RefreshCw size={32} className="spin" style={{ marginBottom: '12px' }} />
              <p>Loading bookmarks...</p>
            </div>
          ) : savedAlumni.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card-bg, #1e293b)', borderRadius: 'var(--radius-lg, 12px)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Bookmark size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }} />
              <h3>No Saved Mentors</h3>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
                Bookmark mentors you would like to reach out to in the future from the discovery directory.
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn-primary">
                Browse Alumni
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {savedAlumni.map((alumnus) => {
                const name = alumnus.user?.studentProfile?.fullName || 'Alumnus Mentor';
                return (
                  <div
                    key={alumnus.id}
                    style={{
                      background: 'var(--card-bg, #1e293b)',
                      borderRadius: 'var(--radius-lg, 12px)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{name}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                          {alumnus.currentCompany}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
                        {alumnus.currentJobTitle} • Class of {alumnus.graduationYear}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                      <button
                        onClick={() => handleOpenRequestModal(alumnus)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                      >
                        Request Mentorship
                      </button>
                      <button
                        onClick={() => handleToggleBookmark({ ...alumnus, isBookmarked: true })}
                        className="btn btn-secondary"
                        style={{ padding: '8px', fontSize: '0.85rem', color: '#ef4444' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ALUMNI PORTAL & PROFILE ────────────────────────────────── */}
      {activeTab === 'portal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
          {/* Main Profile Form */}
          <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              {myAlumniProfile ? 'Edit Your Alumni Profile' : 'Register as an Alumni Mentor'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Provide accurate career information to guide current students. Submitted profiles are verified by college administration before appearing in search.
            </p>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Current Job Title *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.currentJobTitle}
                    onChange={(e) => setProfileForm({ ...profileForm, currentJobTitle: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Current Company *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.currentCompany}
                    onChange={(e) => setProfileForm({ ...profileForm, currentCompany: e.target.value })}
                    placeholder="e.g. Microsoft, Google, Intel"
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Graduation Year *</label>
                  <input
                    type="number"
                    required
                    value={profileForm.graduationYear}
                    onChange={(e) => setProfileForm({ ...profileForm, graduationYear: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Industry *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.industry}
                    onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                    placeholder="e.g. Technology"
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={profileForm.experienceYears}
                    onChange={(e) => setProfileForm({ ...profileForm, experienceYears: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Bio & Career Journey</label>
                <textarea
                  rows="3"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Share a short bio, your tech stack, and what advice you are excited to give."
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Skills (comma-separated)</label>
                <input
                  type="text"
                  value={profileForm.skills}
                  onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                  placeholder="Java, Distributed Systems, Cloud Architecture, Docker"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Mentorship Topics (comma-separated)</label>
                <input
                  type="text"
                  value={profileForm.mentorshipTopics}
                  onChange={(e) => setProfileForm({ ...profileForm, mentorshipTopics: e.target.value })}
                  placeholder="Backend Development, System Design, Resume Review, Placement Prep"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Availability Status</label>
                  <select
                    value={profileForm.availabilityStatus}
                    onChange={(e) => setProfileForm({ ...profileForm, availabilityStatus: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="AVAILABLE" style={{ background: '#1e293b' }}>Available for Mentorship</option>
                    <option value="LIMITED" style={{ background: '#1e293b' }}>Limited Availability</option>
                    <option value="NOT_AVAILABLE" style={{ background: '#1e293b' }}>Not Available Currently</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Preferred Mode</label>
                  <select
                    value={profileForm.mentorshipMode}
                    onChange={(e) => setProfileForm({ ...profileForm, mentorshipMode: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="FLEXIBLE" style={{ background: '#1e293b' }}>Flexible</option>
                    <option value="CHAT" style={{ background: '#1e293b' }}>Text Chat</option>
                    <option value="VIDEO" style={{ background: '#1e293b' }}>Video Call</option>
                    <option value="PHONE" style={{ background: '#1e293b' }}>Phone</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn btn-primary"
                style={{ padding: '12px', fontWeight: 700, marginTop: '8px' }}
              >
                {isSavingProfile ? 'Saving Profile...' : 'Save & Submit Profile'}
              </button>
            </form>
          </div>

          {/* Right Column: Verification Status & Received Requests */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status Card */}
            <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>Verification Status</h3>
              {myAlumniProfile ? (
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 700, background: myAlumniProfile.verificationStatus === 'VERIFIED' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: myAlumniProfile.verificationStatus === 'VERIFIED' ? '#10b981' : '#f59e0b' }}>
                    <Shield size={14} /> {myAlumniProfile.verificationStatus}
                  </div>
                  {myAlumniProfile.verificationStatus === 'PENDING' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                      Your profile has been submitted and is in the administration verification queue.
                    </p>
                  )}
                  {myAlumniProfile.verificationStatus === 'REJECTED' && (
                    <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '8px' }}>
                      Rejected: {myAlumniProfile.rejectionReason}
                    </p>
                  )}
                  <div style={{ marginTop: '14px', fontSize: '0.85rem' }}>
                    <div>Completed Mentorships: <strong>{myAlumniProfile.completedMentorshipsCount || 0}</strong></div>
                    <div>Average Feedback: <strong>{myAlumniProfile.averageRating ? `${myAlumniProfile.averageRating} ★` : 'No reviews yet'}</strong></div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  You have not set up an alumni profile yet. Fill out the form on the left to start mentoring!
                </p>
              )}
            </div>

            {/* Received Requests */}
            <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>Mentorship Requests Received</h3>
              {receivedRequests.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  No requests received yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {receivedRequests.map((r) => (
                    <div key={r.id} style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600 }}>{r.topic}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                        From: {r.student?.studentProfile?.fullName || 'Student'} ({r.status})
                      </div>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          <button
                            onClick={() => handleAcceptReceivedRequest(r.id)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineReceivedRequest(r.id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444' }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REQUEST MENTORSHIP ─────────────────────────────────────── */}
      {requestModalMentor && (
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
            maxWidth: '540px',
            width: '100%',
            position: 'relative',
          }}>
            <button
              onClick={() => setRequestModalMentor(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0' }}>Request 1-on-1 Mentorship</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: '0 0 20px 0' }}>
              Mentor: <strong>{requestModalMentor.user?.studentProfile?.fullName || 'Alumnus'}</strong> ({requestModalMentor.currentJobTitle} @ {requestModalMentor.currentCompany})
            </p>

            <form onSubmit={handleSubmitMentorshipRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Mentorship Topic *</label>
                <input
                  type="text"
                  required
                  value={requestTopic}
                  onChange={(e) => setRequestTopic(e.target.value)}
                  placeholder="e.g. Distributed Caching & System Design"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Introduction Message *</label>
                <textarea
                  rows="3"
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Introduce yourself, your semester, and what guidance you need."
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>What are your goals?</label>
                <input
                  type="text"
                  value={requestGoals}
                  onChange={(e) => setRequestGoals(e.target.value)}
                  placeholder="e.g. Crack backend technical interview round"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Preferred Mode</label>
                <select
                  value={requestMode}
                  onChange={(e) => setRequestMode(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="FLEXIBLE" style={{ background: '#1e293b' }}>Flexible</option>
                  <option value="CHAT" style={{ background: '#1e293b' }}>Chat (In-App)</option>
                  <option value="VIDEO" style={{ background: '#1e293b' }}>Video Session</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRequestModalMentor(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '10px', fontWeight: 700 }}
                >
                  {isSubmittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PRIVATE CHAT DRAWER ────────────────────────────────────── */}
      {activeChatRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          maxWidth: '100%',
          background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        }}>
          {/* Chat Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Mentorship Chat</h3>
              <span style={{ fontSize: '0.8rem', color: '#10b981' }}>{activeChatRequest.topic}</span>
            </div>
            <button
              onClick={() => setActiveChatRequest(null)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>Loading messages...</div>
            ) : chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No messages yet. Send a message to start communicating!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: isMe ? '#10b981' : '#1e293b',
                      color: isMe ? '#fff' : '#fff',
                      padding: '10px 14px',
                      borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      fontSize: '0.9rem',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                  >
                    <div>{msg.message}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px', textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Type message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ── MODAL: SCHEDULE SESSION ───────────────────────────────────────── */}
      {sessionModalRequest && (
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
            maxWidth: '500px',
            width: '100%',
            position: 'relative',
          }}>
            <button
              onClick={() => setSessionModalRequest(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0' }}>Schedule Mentorship Session</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: '0 0 20px 0' }}>
              Topic: <strong>{sessionModalRequest.topic}</strong>
            </p>

            <form onSubmit={handleSubmitSession} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={sessionDateTime}
                  onChange={(e) => setSessionDateTime(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Mode</label>
                  <select
                    value={sessionMode}
                    onChange={(e) => setSessionMode(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="VIDEO" style={{ background: '#1e293b' }}>Google Meet / Zoom</option>
                    <option value="CHAT" style={{ background: '#1e293b' }}>In-App Chat</option>
                    <option value="PHONE" style={{ background: '#1e293b' }}>Phone Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Meeting Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={sessionLink}
                  onChange={(e) => setSessionLink(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Session Notes / Agenda</label>
                <textarea
                  rows="2"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Points to cover, questions prepared, etc."
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSessionModalRequest(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSession}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '10px', fontWeight: 700 }}
                >
                  {isSubmittingSession ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: 5-STAR FEEDBACK ────────────────────────────────────────── */}
      {feedbackModalRequest && (
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
            maxWidth: '480px',
            width: '100%',
            position: 'relative',
          }}>
            <button
              onClick={() => setFeedbackModalRequest(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0' }}>Mentorship Feedback</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: '0 0 20px 0' }}>
              Rate your mentorship on <strong>{feedbackModalRequest.topic}</strong>. Ratings award reputation points and help other students find great mentors.
            </p>

            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Overall Rating (1–5 Stars)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: star <= feedbackRating ? '#fbbf24' : '#475569' }}
                    >
                      <Star size={28} fill={star <= feedbackRating ? '#fbbf24' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Written Review</label>
                <textarea
                  rows="3"
                  value={feedbackReview}
                  onChange={(e) => setFeedbackReview(e.target.value)}
                  placeholder="How was the guidance? What did you learn?"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFeedbackModalRequest(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '10px', fontWeight: 700 }}
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWER: FULL PROFILE DETAILS ──────────────────────────────────── */}
      {profileDrawerAlumnus && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '460px',
          maxWidth: '100%',
          background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
          padding: '28px',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Mentor Profile</h2>
            <button
              onClick={() => setProfileDrawerAlumnus(null)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              {profileDrawerAlumnus.user?.studentProfile?.fullName || 'Alumnus'}
            </h3>
            <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.95rem' }}>
              {profileDrawerAlumnus.currentJobTitle} @ {profileDrawerAlumnus.currentCompany}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {profileDrawerAlumnus.degree} • Class of {profileDrawerAlumnus.graduationYear}
            </div>
          </div>

          {profileDrawerAlumnus.bio && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>ABOUT</div>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: '#e2e8f0' }}>{profileDrawerAlumnus.bio}</p>
            </div>
          )}

          {Array.isArray(profileDrawerAlumnus.skills) && profileDrawerAlumnus.skills.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>SKILLS & TECH STACK</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profileDrawerAlumnus.skills.map((s, idx) => (
                  <span key={idx} style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(profileDrawerAlumnus.mentorshipTopics) && profileDrawerAlumnus.mentorshipTopics.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>MENTORSHIP TOPICS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profileDrawerAlumnus.mentorshipTopics.map((top, idx) => (
                  <span key={idx} style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '6px', fontWeight: 600 }}>
                    {top}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button
              onClick={() => {
                const a = profileDrawerAlumnus;
                setProfileDrawerAlumnus(null);
                handleOpenRequestModal(a);
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              Request Mentorship
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
