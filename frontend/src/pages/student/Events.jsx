import { useState, useEffect } from 'react';
import {
  Calendar, Search, Filter, Bookmark, BookmarkCheck, Users, MapPin,
  Clock, CheckCircle, AlertCircle, X, ChevronRight, Share2, Sparkles,
  Award, Tag, ExternalLink, RefreshCw, CalendarDays
} from 'lucide-react';
import { eventsApi } from '../../api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'all', label: 'All Activities', icon: '🌟' },
  { id: 'hackathon', label: 'Hackathons', icon: '💻' },
  { id: 'workshop', label: 'Workshops', icon: '🛠️' },
  { id: 'technical_fest', label: 'Tech Fests', icon: '🚀' },
  { id: 'seminar', label: 'Seminars', icon: '🎤' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'cultural', label: 'Cultural', icon: '🎭' },
  { id: 'competition', label: 'Competitions', icon: '🏆' },
  { id: 'club', label: 'Club Events', icon: '👥' },
  { id: 'placement', label: 'Career & Placement', icon: '💼' },
  { id: 'academic', label: 'Academic', icon: '📚' },
];

export default function Events() {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'my_registrations' | 'saved'
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeframe, setTimeframe] = useState('upcoming');

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registerNotes, setRegisterNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchMyRegistrations();
    fetchSavedEvents();
  }, []);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchEvents();
    }
  }, [selectedCategory, timeframe]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        timeframe,
        search: search.trim() || undefined,
      };
      const res = await eventsApi.getEvents(params);
      setEvents(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load campus events');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRegistrations = async () => {
    try {
      const res = await eventsApi.getMyRegistrations();
      setMyRegistrations(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSavedEvents = async () => {
    try {
      const res = await eventsApi.getBookmarks();
      setSavedEvents(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleRegister = async (eventId) => {
    setIsSubmitting(true);
    try {
      const res = await eventsApi.registerForEvent(eventId, { notes: registerNotes });
      toast.success(res.data?.message || 'Registered successfully!');
      setRegisterNotes('');
      if (selectedEvent) {
        // Refresh event details
        const refreshed = await eventsApi.getEventById(eventId);
        setSelectedEvent(refreshed.data?.data);
      }
      fetchEvents();
      fetchMyRegistrations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRegistration = async (eventId) => {
    setIsSubmitting(true);
    try {
      const res = await eventsApi.cancelRegistration(eventId);
      toast.success(res.data?.message || 'Registration cancelled.');
      setShowCancelConfirm(false);
      if (selectedEvent) {
        const refreshed = await eventsApi.getEventById(eventId);
        setSelectedEvent(refreshed.data?.data);
      }
      fetchEvents();
      fetchMyRegistrations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBookmark = async (e, eventId, isCurrentlyBookmarked) => {
    e.stopPropagation();
    try {
      if (isCurrentlyBookmarked) {
        await eventsApi.unbookmarkEvent(eventId);
        toast.success('Removed from saved events');
      } else {
        await eventsApi.bookmarkEvent(eventId);
        toast.success('Saved to your bookmarks');
      }
      fetchEvents();
      fetchSavedEvents();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, isBookmarked: !isCurrentlyBookmarked });
      }
    } catch (err) {
      toast.error('Bookmark update failed');
    }
  };

  const openEventDetails = async (event) => {
    try {
      const res = await eventsApi.getEventById(event.id);
      setSelectedEvent(res.data?.data);
    } catch (err) {
      setSelectedEvent(event);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getCategoryTheme = (category) => {
    switch (category) {
      case 'hackathon': return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'workshop': return { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' };
      case 'technical_fest': return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
      case 'seminar': return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'sports': return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
      case 'cultural': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'placement': return { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div className="page-container">
      {/* ── Page Header ────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              <Calendar className="text-primary" size={28} />
              Campus Events & Activities
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
              Discover hackathons, fests, workshops, and student activities happening across the college.
            </p>
          </div>
          <button
            onClick={() => { fetchEvents(); fetchMyRegistrations(); fetchSavedEvents(); }}
            className="btn btn--outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {/* ── Tabs Navigation ────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 1 }}>
          <button
            onClick={() => setActiveTab('discover')}
            className={`tab-btn ${activeTab === 'discover' ? 'tab-btn--active' : ''}`}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'discover' ? 'var(--primary-color)' : 'var(--text-muted)',
              borderBottom: activeTab === 'discover' ? '2px solid var(--primary-color)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CalendarDays size={18} />
            Discover Events
            <span style={{ background: activeTab === 'discover' ? 'rgba(37,99,235,0.1)' : '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my_registrations')}
            className={`tab-btn ${activeTab === 'my_registrations' ? 'tab-btn--active' : ''}`}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'my_registrations' ? 'var(--primary-color)' : 'var(--text-muted)',
              borderBottom: activeTab === 'my_registrations' ? '2px solid var(--primary-color)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle size={18} />
            My Registrations
            <span style={{ background: activeTab === 'my_registrations' ? 'rgba(37,99,235,0.1)' : '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
              {myRegistrations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`tab-btn ${activeTab === 'saved' ? 'tab-btn--active' : ''}`}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'saved' ? 'var(--primary-color)' : 'var(--text-muted)',
              borderBottom: activeTab === 'saved' ? '2px solid var(--primary-color)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Bookmark size={18} />
            Saved Events
            <span style={{ background: activeTab === 'saved' ? 'rgba(37,99,235,0.1)' : '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
              {savedEvents.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── 1. DISCOVER EVENTS VIEW ─────────────────────────── */}
      {activeTab === 'discover' && (
        <div>
          {/* Search & Timeframe Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search events by title, venue, or organizer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  fontSize: '0.9rem',
                }}
              />
            </form>

            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="upcoming">Upcoming Events</option>
                <option value="today">Today Only</option>
                <option value="this_week">This Week</option>
                <option value="past">Past Events</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: selectedCategory === cat.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: selectedCategory === cat.id ? 'var(--primary-color)' : 'var(--bg-surface)',
                  color: selectedCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
              <p>Loading campus events...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
              <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>No events found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 420, margin: '6px auto 16px' }}>
                There are no published events matching your selected category and filters right now.
              </p>
              <button
                onClick={() => { setSelectedCategory('all'); setTimeframe('upcoming'); setSearch(''); }}
                className="btn btn--outline"
                style={{ fontSize: '0.85rem' }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {events.map((evt) => {
                const theme = getCategoryTheme(evt.category);
                return (
                  <div
                    key={evt.id}
                    onClick={() => openEventDetails(evt)}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 16,
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Header banner or category strip */}
                    <div
                      style={{
                        padding: '16px 20px',
                        background: `linear-gradient(135deg, ${theme.bg}, #ffffff)`,
                        borderBottom: `1px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 12, background: theme.bg, color: theme.color, border: `1px solid ${theme.border}` }}>
                          {evt.category.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          • {evt.eventType.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleToggleBookmark(e, evt.id, evt.isBookmarked)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: evt.isBookmarked ? '#f59e0b' : 'var(--text-muted)' }}
                        title={evt.isBookmarked ? 'Remove bookmark' : 'Save event'}
                      >
                        {evt.isBookmarked ? <BookmarkCheck size={20} fill="#f59e0b" /> : <Bookmark size={20} />}
                      </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
                        {evt.title}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {evt.description}
                      </p>

                      {/* Event Meta Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={15} style={{ color: 'var(--primary-color)' }} />
                          <span>{formatDate(evt.startDateTime)} • {formatTime(evt.startDateTime)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MapPin size={15} style={{ color: '#ef4444' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.venue}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={15} style={{ color: '#10b981' }} />
                          <span>Organizer: {evt.organizerName}</span>
                        </div>
                      </div>

                      {/* Bottom Footer Actions */}
                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          {evt.isRegistered ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={14} /> Registered
                            </span>
                          ) : evt.registrationStatus === 'WAITLISTED' ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={14} /> On Waitlist
                            </span>
                          ) : evt.isFull ? (
                            <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                              Full (Waitlist Open)
                            </span>
                          ) : evt.availableSeats != null ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {evt.availableSeats} spots left
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Open registration
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          View <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 2. MY REGISTRATIONS VIEW ─────────────────────────── */}
      {activeTab === 'my_registrations' && (
        <div>
          {myRegistrations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
              <CheckCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>No active registrations</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '6px auto 16px' }}>
                You haven't registered for any campus events yet. Explore upcoming hackathons, workshops, and fests!
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn--primary" style={{ fontSize: '0.85rem' }}>
                Browse Events
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {myRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 14,
                    border: '1px solid var(--border-color)',
                    padding: '18px 22px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10, background: '#e0f2fe', color: '#0369a1' }}>
                        {reg.event?.category?.replace('_', ' ') || 'Event'}
                      </span>
                      {reg.status === 'REGISTERED' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#15803d' }}>
                          CONFIRMED
                        </span>
                      )}
                      {reg.status === 'WAITLISTED' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#b45309' }}>
                          WAITLISTED
                        </span>
                      )}
                      {reg.attendanceStatus === 'ATTENDED' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Award size={12} /> ATTENDED (+10 Karma)
                        </span>
                      )}
                      {reg.attendanceStatus === 'NO_SHOW' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fee2e2', color: '#b91c1c' }}>
                          NO SHOW
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {reg.event?.title}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span>📅 {formatDate(reg.event?.startDateTime)}</span>
                      <span>⏰ {formatTime(reg.event?.startDateTime)}</span>
                      <span>📍 {reg.event?.venue}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => openEventDetails(reg.event)}
                      className="btn btn--outline"
                      style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                    >
                      View Details
                    </button>
                    {reg.status === 'REGISTERED' && (
                      <button
                        onClick={() => { setSelectedEvent(reg.event); setShowCancelConfirm(true); }}
                        className="btn btn--outline"
                        style={{ fontSize: '0.82rem', padding: '8px 14px', color: '#ef4444', borderColor: '#fca5a5' }}
                      >
                        Cancel Seat
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. SAVED EVENTS VIEW ─────────────────────────────── */}
      {activeTab === 'saved' && (
        <div>
          {savedEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
              <Bookmark size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>No saved events</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '6px auto 16px' }}>
                Bookmark interesting hackathons or workshops to find them easily here later.
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn--outline" style={{ fontSize: '0.85rem' }}>
                Browse Events
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {savedEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => openEventDetails(evt)}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 16,
                    border: '1px solid var(--border-color)',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 10, background: '#f1f5f9' }}>
                      {evt.category?.replace('_', ' ')}
                    </span>
                    <button
                      onClick={(e) => handleToggleBookmark(e, evt.id, true)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#f59e0b' }}
                      title="Remove bookmark"
                    >
                      <BookmarkCheck size={20} fill="#f59e0b" />
                    </button>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {evt.title}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>📅 {formatDate(evt.startDateTime)} at {formatTime(evt.startDateTime)}</div>
                    <div>📍 {evt.venue}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EVENT DETAILS MODAL ─────────────────────────────── */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 20,
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 12, background: '#eff6ff', color: '#2563eb' }}>
                {selectedEvent.category?.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {selectedEvent.eventType?.replace('_', ' ')}
              </span>
              {selectedEvent.status === 'CANCELLED' && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: 12 }}>
                  CANCELLED
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
              {selectedEvent.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              <Users size={16} /> Organized by: <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.organizerName}</strong>
              {selectedEvent.organizerContact && <span>({selectedEvent.organizerContact})</span>}
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-main)', padding: 16, borderRadius: 14, marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Start Schedule</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {formatDate(selectedEvent.startDateTime)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {formatTime(selectedEvent.startDateTime)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>End Schedule</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {formatDate(selectedEvent.endDateTime)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {formatTime(selectedEvent.endDateTime)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Venue & Location</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedEvent.venue}
                </div>
                {selectedEvent.locationLabel && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedEvent.locationLabel}
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Capacity</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedEvent.maxParticipants ? `${selectedEvent.registrationCount} / ${selectedEvent.maxParticipants} Registered` : 'Unlimited Open Capacity'}
                </div>
                {selectedEvent.availableSeats != null && (
                  <div style={{ fontSize: '0.8rem', color: selectedEvent.isFull ? '#ef4444' : '#10b981' }}>
                    {selectedEvent.isFull ? 'Waitlist Active' : `${selectedEvent.availableSeats} spots left`}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>About this Event</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {selectedEvent.description}
              </p>
            </div>

            {/* Registration status / Action Box */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedEvent.status === 'CANCELLED' ? (
                <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 10, color: '#b91c1c', fontSize: '0.85rem' }}>
                  ⚠️ This event has been cancelled by the organizers.
                  {selectedEvent.cancellationReason && ` Reason: ${selectedEvent.cancellationReason}`}
                </div>
              ) : selectedEvent.isRegistered ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 18px', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
                      <CheckCircle size={18} /> You are registered for this event!
                    </div>
                    {selectedEvent.attendanceStatus === 'ATTENDED' && (
                      <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: 4 }}>
                        🎉 Attendance marked as verified (+10 Karma awarded)
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="btn btn--outline"
                    style={{ fontSize: '0.85rem', color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    Cancel Registration
                  </button>
                </div>
              ) : selectedEvent.registrationStatus === 'WAITLISTED' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fefce8', border: '1px solid #fef08a', padding: '14px 18px', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#854d0e', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
                      <AlertCircle size={18} /> You are on the waitlist
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#a16207', marginTop: 4 }}>
                      You'll be automatically promoted if an attendee cancels.
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="btn btn--outline"
                    style={{ fontSize: '0.85rem', color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    Leave Waitlist
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Optional: Team name, questions, or notes for organizer"
                    value={registerNotes}
                    onChange={(e) => setRegisterNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                  <button
                    onClick={() => handleRegister(selectedEvent.id)}
                    disabled={isSubmitting}
                    className="btn btn--primary"
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600 }}
                  >
                    {isSubmitting ? 'Registering...' : selectedEvent.isFull ? 'Join Waitlist' : 'Confirm Registration'}
                  </button>
                </div>
              )}
            </div>

            {/* Cancel Confirmation Dialog */}
            {showCancelConfirm && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.9rem' }}>
                  Are you sure you want to cancel your seat?
                </div>
                <p style={{ fontSize: '0.82rem', color: '#b91c1c' }}>
                  If you cancel, your reserved spot will be given to the next person on the waitlist.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleCancelRegistration(selectedEvent.id)}
                    disabled={isSubmitting}
                    className="btn btn--danger"
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Seat'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn btn--outline"
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    Keep Registration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
