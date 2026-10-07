import { useState, useEffect } from 'react';
import {
  Calendar, Search, Filter, Shield, AlertTriangle, CheckCircle,
  XCircle, Trash2, RefreshCw, BarChart2, Eye, X
} from 'lucide-react';
import { adminApi, eventsApi } from '../../api';
import toast from 'react-hot-toast';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  // Selected event for participant view
  const [viewEvent, setViewEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [category, status]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEvents({
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
        search: search.trim() || undefined,
      });
      setEvents(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load campus events');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminApi.getEventStats();
      setStats(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load event statistics:', err);
    }
  };

  const handleModerate = async (eventId, action) => {
    let reason = '';
    if (action === 'cancel') {
      reason = window.prompt('Specify cancellation reason for administrative audit:');
      if (reason === null) return;
    }

    try {
      await adminApi.moderateEvent(eventId, { action, reason });
      toast.success(`Event successfully moderated (${action})`);
      fetchEvents();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Moderation action failed');
    }
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (!window.confirm(`Permanently delete event "${eventTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteEvent(eventId);
      toast.success('Event permanently deleted');
      fetchEvents();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const openParticipantsView = async (event) => {
    setViewEvent(event);
    setParticipantsLoading(true);
    try {
      const res = await eventsApi.getParticipants(event.id);
      setParticipants(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load participants');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="page-container">
      {/* ── Page Header ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            <Calendar className="text-primary" size={28} />
            Campus Events Moderation & Audit
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
            Oversee all college activities, verify compliance, monitor attendance, and moderate events.
          </p>
        </div>

        <button
          onClick={() => { fetchEvents(); fetchStats(); }}
          className="btn btn--outline"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* ── Analytics Telemetry Cards ───────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 14, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Campus Events</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {stats.totalEvents}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 14, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Published Active</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
              {stats.publishedEvents}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 14, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registrations</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
              {stats.totalRegistrations}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 14, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Attendance Rate</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>
              {stats.attendanceRate}%
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filters ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <form onSubmit={(e) => { e.preventDefault(); fetchEvents(); }} style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search events by title, organizer, or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '0.9rem' }}
          />
        </form>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '0.88rem' }}
        >
          <option value="all">All Categories</option>
          <option value="hackathon">Hackathons</option>
          <option value="workshop">Workshops</option>
          <option value="technical_fest">Technical Fests</option>
          <option value="seminar">Seminars</option>
          <option value="sports">Sports</option>
          <option value="cultural">Cultural</option>
          <option value="competition">Competitions</option>
          <option value="club">Clubs</option>
          <option value="placement">Placement</option>
          <option value="academic">Academic</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '0.88rem' }}
        >
          <option value="all">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* ── Events Table ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
          <p>Loading events registry...</p>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>No events found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '6px auto 16px' }}>
            No campus events match the selected criteria.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px' }}>Event</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Organizer / Faculty</th>
                <th style={{ padding: '12px 16px' }}>Date & Venue</th>
                <th style={{ padding: '12px 16px' }}>Registrations</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {evt.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Scope: {evt.visibility}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 8, background: '#f1f5f9' }}>
                      {evt.category?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{evt.organizerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {evt.creator?.teacherProfile?.fullName || evt.creator?.email}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div>{formatDate(evt.startDateTime)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.venue}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{evt.registrationCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {evt.maxParticipants ? `Cap: ${evt.maxParticipants}` : 'No cap'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
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
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openParticipantsView(evt)}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-main)', cursor: 'pointer', fontSize: '0.75rem' }}
                        title="View Attendees"
                      >
                        <Eye size={14} />
                      </button>

                      {evt.status === 'DRAFT' && (
                        <button
                          onClick={() => handleModerate(evt.id, 'publish')}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#dcfce7', color: '#16a34a', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          title="Publish Event"
                        >
                          Publish
                        </button>
                      )}

                      {evt.status === 'PUBLISHED' && (
                        <button
                          onClick={() => handleModerate(evt.id, 'cancel')}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          title="Cancel Event"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(evt.id, evt.title)}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}
                        title="Delete Event"
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

      {/* ── PARTICIPANTS AUDIT MODAL ───────────────────────── */}
      {viewEvent && (
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
          onClick={() => setViewEvent(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 20,
              maxWidth: 680,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewEvent(null)}
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

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
              {viewEvent.title} — Attendees
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Total Registrations: {participants.length}
            </p>

            {participantsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Loading attendee roster...
              </div>
            ) : participants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 12 }}>
                No students have registered for this event yet.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 12px' }}>Student</th>
                      <th style={{ padding: '8px 12px' }}>USN</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{p.student?.studentProfile?.fullName || 'Student'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.student?.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{p.student?.studentProfile?.usn || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{p.status}</td>
                        <td style={{ padding: '10px 12px' }}>{p.attendanceStatus}</td>
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
