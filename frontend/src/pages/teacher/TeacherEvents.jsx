import { useState, useEffect } from 'react';
import {
  Calendar, Plus, Users, Clock, MapPin, CheckCircle, XCircle,
  AlertCircle, Edit, Trash2, Check, RefreshCw, X, ChevronRight,
  Award, FileText, Search, Filter, BarChart3
} from 'lucide-react';
import { eventsApi, teacherApi } from '../../api';
import toast from 'react-hot-toast';

export default function TeacherEvents() {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'create'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected event for management modal
  const [manageEvent, setManageEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [eventStats, setEventStats] = useState(null);

  // Create Event Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'workshop',
    eventType: 'in_person',
    organizerName: '',
    organizerContact: '',
    venue: '',
    locationLabel: '',
    startDateTime: '',
    endDateTime: '',
    registrationStart: '',
    registrationEnd: '',
    maxParticipants: '',
    visibility: 'COLLEGE',
    status: 'PUBLISHED',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchMyEvents();
  }, [statusFilter]);

  const fetchMyEvents = async () => {
    setLoading(true);
    try {
      const res = await eventsApi.getTeacherMyEvents({ status: statusFilter !== 'all' ? statusFilter : undefined });
      setEvents(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load your organized events');
    } finally {
      setLoading(false);
    }
  };

  const openManageModal = async (event) => {
    setManageEvent(event);
    setParticipantsLoading(true);
    try {
      const [partRes, statsRes] = await Promise.all([
        eventsApi.getParticipants(event.id),
        eventsApi.getEventStats(event.id),
      ]);
      setParticipants(partRes.data?.data || []);
      setEventStats(statsRes.data?.data || null);
    } catch (err) {
      toast.error('Failed to load participant roster');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, attendanceStatus) => {
    try {
      await eventsApi.markAttendance(manageEvent.id, studentId, { attendanceStatus });
      toast.success(`Attendance updated to ${attendanceStatus}`);
      // Refresh participants & stats
      const [partRes, statsRes] = await Promise.all([
        eventsApi.getParticipants(manageEvent.id),
        eventsApi.getEventStats(manageEvent.id),
      ]);
      setParticipants(partRes.data?.data || []);
      setEventStats(statsRes.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      await eventsApi.publishEvent(eventId);
      toast.success('Event published! It is now visible to students.');
      fetchMyEvents();
      if (manageEvent?.id === eventId) {
        setManageEvent({ ...manageEvent, status: 'PUBLISHED' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleCancelEvent = async (eventId) => {
    const reason = window.prompt('Please provide a reason for cancelling this event:');
    if (reason === null) return;

    try {
      await eventsApi.cancelEvent(eventId, { reason });
      toast.success('Event cancelled. Registered participants have been notified.');
      fetchMyEvents();
      if (manageEvent?.id === eventId) {
        setManageEvent({ ...manageEvent, status: 'CANCELLED', cancellationReason: reason });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel event');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants, 10) : null,
        registrationStart: formData.registrationStart || null,
        registrationEnd: formData.registrationEnd || null,
      };
      const res = await eventsApi.createEvent(payload);
      toast.success(res.data?.message || 'Event created successfully!');
      setActiveTab('events');
      fetchMyEvents();
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'workshop',
        eventType: 'in_person',
        organizerName: '',
        organizerContact: '',
        venue: '',
        locationLabel: '',
        startDateTime: '',
        endDateTime: '',
        registrationStart: '',
        registrationEnd: '',
        maxParticipants: '',
        visibility: 'COLLEGE',
        status: 'PUBLISHED',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setFormSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filteredParticipants = participants.filter((p) => {
    const name = p.student?.studentProfile?.fullName?.toLowerCase() || '';
    const usn = p.student?.studentProfile?.usn?.toLowerCase() || '';
    const email = p.student?.email?.toLowerCase() || '';
    const q = participantSearch.toLowerCase();
    return name.includes(q) || usn.includes(q) || email.includes(q);
  });

  return (
    <div className="page-container">
      {/* ── Page Header ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            <Calendar className="text-primary" size={28} />
            Faculty Event Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
            Organize official campus activities, track registrations, and verify student attendance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab(activeTab === 'create' ? 'events' : 'create')}
            className={`btn ${activeTab === 'create' ? 'btn--outline' : 'btn--primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}
          >
            {activeTab === 'create' ? <Calendar size={16} /> : <Plus size={16} />}
            {activeTab === 'create' ? 'View My Events' : 'Create New Event'}
          </button>
        </div>
      </div>

      {/* ── 1. MY EVENTS VIEW ───────────────────────────────── */}
      {activeTab === 'events' && (
        <div>
          {/* Status filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['all', 'PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: statusFilter === st ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: statusFilter === st ? 'var(--primary-color)' : 'var(--bg-surface)',
                  color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {st.toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
              <p>Loading your events...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
              <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>No organized events yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '6px auto 16px' }}>
                Create your first workshop, hackathon, or seminar for students.
              </p>
              <button onClick={() => setActiveTab('create')} className="btn btn--primary" style={{ fontSize: '0.85rem' }}>
                Create Event Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 16,
                    border: '1px solid var(--border-color)',
                    padding: '20px 24px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10, background: '#e0f2fe', color: '#0369a1' }}>
                        {evt.category?.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: evt.status === 'PUBLISHED' ? '#dcfce7' : evt.status === 'DRAFT' ? '#f1f5f9' : '#fee2e2',
                          color: evt.status === 'PUBLISHED' ? '#15803d' : evt.status === 'DRAFT' ? '#475569' : '#b91c1c',
                        }}
                      >
                        {evt.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        • {evt.visibility} Scope
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {evt.title}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span>📅 {formatDate(evt.startDateTime)}</span>
                      <span>📍 {evt.venue}</span>
                      <span>👥 {evt.registrationCount} Registered {evt.maxParticipants ? `(Cap: ${evt.maxParticipants})` : ''}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => openManageModal(evt)}
                      className="btn btn--primary"
                      style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Users size={15} />
                      Manage & Attendance
                    </button>

                    {evt.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublishEvent(evt.id)}
                        className="btn btn--outline"
                        style={{ fontSize: '0.82rem', padding: '8px 14px', color: '#16a34a', borderColor: '#86efac' }}
                      >
                        Publish
                      </button>
                    )}

                    {evt.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleCancelEvent(evt.id)}
                        className="btn btn--outline"
                        style={{ fontSize: '0.82rem', padding: '8px 14px', color: '#ef4444', borderColor: '#fca5a5' }}
                      >
                        Cancel Event
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 2. CREATE EVENT VIEW ────────────────────────────── */}
      {activeTab === 'create' && (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 20, border: '1px solid var(--border-color)', padding: '28px', maxWidth: 780, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
            Create Campus Event
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 24 }}>
            Fill in the details below. Published events appear immediately in student activity feeds.
          </p>

          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Annual Smart Campus Hackathon 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                >
                  <option value="workshop">Workshop</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="technical_fest">Technical Fest</option>
                  <option value="seminar">Seminar / Talk</option>
                  <option value="competition">Competition</option>
                  <option value="sports">Sports Tournament</option>
                  <option value="cultural">Cultural Festival</option>
                  <option value="club">Club Activity</option>
                  <option value="placement">Placement & Career</option>
                  <option value="academic">Academic Activity</option>
                  <option value="other">Other Event</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Format / Delivery *
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                >
                  <option value="in_person">In-Person (Campus)</option>
                  <option value="virtual">Virtual (Online)</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Description & Agenda *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe the objectives, schedule, rules, and outcomes of the activity..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Venue *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sir M.V. Auditorium"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Specific Room / Block
                </label>
                <input
                  type="text"
                  placeholder="e.g., Block B, Ground Floor"
                  value={formData.locationLabel}
                  onChange={(e) => setFormData({ ...formData, locationLabel: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Organizer Department / Club *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Computer Science Association"
                  value={formData.organizerName}
                  onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Contact Email / Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g., cse-events@nie.ac.in"
                  value={formData.organizerContact}
                  onChange={(e) => setFormData({ ...formData, organizerContact: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDateTime}
                  onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDateTime}
                  onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Registration Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.registrationEnd}
                  onChange={(e) => setFormData({ ...formData, registrationEnd: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Max Participants / Seat Limit (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited seats"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Target Audience Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                >
                  <option value="COLLEGE">All College Students</option>
                  <option value="DEPARTMENT">My Department Only</option>
                  <option value="SEMESTER">Specific Semester Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                >
                  <option value="PUBLISHED">Publish Immediately</option>
                  <option value="DRAFT">Save as Draft</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                type="submit"
                disabled={formSubmitting}
                className="btn btn--primary"
                style={{ flex: 1, padding: '12px', fontSize: '0.95rem', fontWeight: 600 }}
              >
                {formSubmitting ? 'Creating Event...' : 'Submit & Save Event'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className="btn btn--outline"
                style={{ padding: '12px 24px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MANAGE PARTICIPANTS & ATTENDANCE MODAL ──────────── */}
      {manageEvent && (
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
          onClick={() => setManageEvent(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 20,
              maxWidth: 780,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setManageEvent(null)}
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

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {manageEvent.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Attendee Roster & Attendance Verification
            </p>

            {/* Metrics cards */}
            {eventStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {eventStats.activeRegistrations}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                    {eventStats.waitlistedCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Waitlisted</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                    {eventStats.attendedCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attended</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1' }}>
                    {eventStats.capacityUtilization}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacity</div>
                </div>
              </div>
            )}

            {/* Search participant */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search attendee by name, USN, or email..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Participants Table */}
            {participantsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Loading attendee list...
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 12 }}>
                No registered attendees match this query.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px' }}>Student</th>
                      <th style={{ padding: '10px 14px' }}>USN / Dept</th>
                      <th style={{ padding: '10px 14px' }}>Reg Status</th>
                      <th style={{ padding: '10px 14px' }}>Attendance</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{p.student?.studentProfile?.fullName || 'Student'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.student?.email}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div>{p.student?.studentProfile?.usn || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.student?.studentProfile?.department || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: p.status === 'REGISTERED' ? '#dcfce7' : p.status === 'WAITLISTED' ? '#fef3c7' : '#fee2e2',
                              color: p.status === 'REGISTERED' ? '#15803d' : p.status === 'WAITLISTED' ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {p.attendanceStatus === 'ATTENDED' ? (
                            <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={14} /> Attended
                            </span>
                          ) : p.attendanceStatus === 'NO_SHOW' ? (
                            <span style={{ color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <XCircle size={14} /> No Show
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleMarkAttendance(p.studentId, 'ATTENDED')}
                              disabled={p.attendanceStatus === 'ATTENDED'}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #86efac',
                                background: p.attendanceStatus === 'ATTENDED' ? '#dcfce7' : '#fff',
                                color: '#16a34a',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                              title="Mark Present"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(p.studentId, 'NO_SHOW')}
                              disabled={p.attendanceStatus === 'NO_SHOW'}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #fca5a5',
                                background: p.attendanceStatus === 'NO_SHOW' ? '#fee2e2' : '#fff',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                              title="Mark Absent"
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
