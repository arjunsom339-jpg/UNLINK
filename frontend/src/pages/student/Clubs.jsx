import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, Plus, CheckCircle, Clock, AlertCircle,
  ExternalLink, ChevronRight, Settings, LogOut, Shield, Award,
  Compass, Sparkles, Building, Globe, Mail, X, Check
} from 'lucide-react';
import { clubsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'ALL',
  'TECHNICAL',
  'PROFESSIONAL',
  'CULTURAL',
  'SPORTS',
  'ACADEMIC',
  'SOCIAL_SERVICE',
  'ENTREPRENEURSHIP',
  'HOBBY',
  'DEPARTMENT',
  'OTHER',
];

export default function Clubs() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'my' | 'requests'
  const [clubs, setClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Proposal Modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    name: '',
    shortName: '',
    category: 'TECHNICAL',
    description: '',
    foundedYear: new Date().getFullYear(),
    contactEmail: '',
    contactPhone: '',
    meetingLocation: '',
    meetingSchedule: '',
    website: '',
    membershipApprovalRequired: true,
    electionsEnabled: true,
  });

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'ALL') params.category = selectedCategory;

      const [resAll, resMy] = await Promise.all([
        clubsApi.getClubs(params),
        clubsApi.getMyClubs(),
      ]);

      setClubs(resAll.data?.data || []);
      setMyClubs(resMy.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [search, selectedCategory]);

  const handleJoin = async (clubId) => {
    try {
      setActionLoadingId(clubId);
      const res = await clubsApi.joinClub(clubId);
      toast.success(res.data?.message || 'Joined club successfully!');
      await fetchClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not join club');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLeave = async (clubId, clubName) => {
    if (!window.confirm(`Are you sure you want to leave ${clubName}?`)) return;
    try {
      setActionLoadingId(clubId);
      await clubsApi.leaveClub(clubId);
      toast.success('Successfully left the club');
      await fetchClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave club');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProposeClub = async (e) => {
    e.preventDefault();
    if (!proposalForm.name.trim() || !proposalForm.description.trim()) {
      toast.error('Club name and description are required.');
      return;
    }
    try {
      setSubmittingProposal(true);
      const res = await clubsApi.createClub(proposalForm);
      toast.success(res.data?.message || 'Club proposal submitted for administrator review!');
      setShowProposeModal(false);
      setProposalForm({
        name: '',
        shortName: '',
        category: 'TECHNICAL',
        description: '',
        foundedYear: new Date().getFullYear(),
        contactEmail: '',
        contactPhone: '',
        meetingLocation: '',
        meetingSchedule: '',
        website: '',
        membershipApprovalRequired: true,
        electionsEnabled: true,
      });
      await fetchClubs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit proposal');
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Split myClubs into active vs pending requests
  const activeMemberships = myClubs.filter((m) => m.status === 'ACTIVE');
  const pendingRequests = myClubs.filter((m) => m.status === 'PENDING');

  const getMembershipStatus = (clubId) => {
    const mem = myClubs.find((m) => (m.clubId || m.club?.id) === clubId);
    return mem ? mem.status : null;
  };

  const getMembershipRole = (clubId) => {
    const mem = myClubs.find((m) => (m.clubId || m.club?.id) === clubId);
    return mem ? mem.role : null;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Page Header ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <Compass size={22} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              Campus Clubs & Societies
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Discover technical chapters, cultural groups, and student societies, or launch a new initiative.
          </p>
        </div>

        <button
          onClick={() => setShowProposeModal(true)}
          className="btn btn--primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} />
          <span>Propose a Club</span>
        </button>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: 2,
      }}>
        <button
          onClick={() => setActiveTab('discover')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'discover' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            color: activeTab === 'discover' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Compass size={17} />
          <span>Discover Clubs</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 12,
            background: activeTab === 'discover' ? 'var(--color-primary-100)' : 'var(--color-neutral-100)',
            color: activeTab === 'discover' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
          }}>
            {clubs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('my')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'my' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            color: activeTab === 'my' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Users size={17} />
          <span>My Clubs</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 12,
            background: activeTab === 'my' ? 'var(--color-primary-100)' : 'var(--color-neutral-100)',
            color: activeTab === 'my' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
          }}>
            {activeMemberships.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'requests' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            color: activeTab === 'requests' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock size={17} />
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 12,
              background: '#fef3c7',
              color: '#d97706',
              fontWeight: 700,
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: DISCOVER CLUBS ───────────────────────────── */}
      {activeTab === 'discover' && (
        <div>
          {/* Filters & Search */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginBottom: 24,
            background: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by club name, short code, or interests (e.g. ACM, Robotics, Coding, Cultural)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-2)',
                  fontSize: '0.93rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>
                CATEGORY:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: selectedCategory === cat ? 'var(--color-primary-600)' : 'var(--color-neutral-100)',
                    color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Clubs Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p>Loading campus clubs...</p>
            </div>
          ) : clubs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 24px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-strong)',
            }}>
              <Compass size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>No clubs found</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Try adjusting your search query or propose a new student society!
              </p>
              <button onClick={() => setShowProposeModal(true)} className="btn btn--primary">
                Propose a Club
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {clubs.map((club) => {
                const memStatus = getMembershipStatus(club.id);
                const memRole = getMembershipRole(club.id);
                const isLeader = ['PRESIDENT', 'VICE_PRESIDENT', 'OFFICER', 'SECRETARY', 'TREASURER'].includes(memRole);

                return (
                  <div
                    key={club.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-default)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {/* Card Top Banner */}
                    <div style={{
                      height: 84,
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
                      position: 'relative',
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(4px)',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                      }}>
                        {club.category}
                      </span>

                      {club.department && (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.25)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          {club.department.code || club.department.name}
                        </span>
                      )}
                    </div>

                    {/* Monogram / Logo & Content */}
                    <div style={{ padding: '0 16px 16px', marginTop: -28, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                        <div style={{
                          width: 56,
                          height: 56,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-surface)',
                          border: '3px solid var(--bg-surface)',
                          boxShadow: 'var(--shadow-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.2rem',
                          color: 'var(--color-primary-600)',
                        }}>
                          {club.shortName || club.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-surface-2)',
                          padding: '4px 10px',
                          borderRadius: 12,
                        }}>
                          <Users size={14} />
                          <span>{club.memberCount || 0} members</span>
                        </div>
                      </div>

                      <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>
                        {club.name}
                      </h3>
                      {club.shortName && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-600)', marginBottom: 8, display: 'block' }}>
                          ({club.shortName})
                        </span>
                      )}

                      <p style={{
                        margin: '0 0 16px',
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {club.description}
                      </p>

                      {/* Card Footer Actions */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-default)',
                      }}>
                        <button
                          onClick={() => navigate(`/student/clubs/${club.id}`)}
                          className="btn btn--outline"
                          style={{ flex: 1, padding: '7px 12px', fontSize: '0.85rem' }}
                        >
                          View Club
                        </button>

                        {memStatus === 'ACTIVE' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{
                              padding: '7px 12px',
                              borderRadius: 'var(--radius-md)',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}>
                              <CheckCircle size={14} />
                              {memRole === 'PRESIDENT' ? 'President' : memRole === 'OFFICER' ? 'Officer' : 'Member'}
                            </span>
                            {isLeader && (
                              <button
                                onClick={() => navigate(`/student/clubs/${club.id}/manage`)}
                                className="btn btn--secondary"
                                style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                                title="Manage Club"
                              >
                                <Settings size={15} />
                              </button>
                            )}
                          </div>
                        ) : memStatus === 'PENDING' ? (
                          <span style={{
                            padding: '7px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: '#fef3c7',
                            color: '#d97706',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            <Clock size={14} />
                            Requested
                          </span>
                        ) : (
                          <button
                            onClick={() => handleJoin(club.id)}
                            disabled={actionLoadingId === club.id}
                            className="btn btn--primary"
                            style={{ padding: '7px 14px', fontSize: '0.85rem' }}
                          >
                            {actionLoadingId === club.id ? 'Joining...' : 'Join Club'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY CLUBS ─────────────────────────────────── */}
      {activeTab === 'my' && (
        <div>
          {activeMemberships.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 24px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-strong)',
            }}>
              <Users size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>You haven't joined any clubs yet</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Explore campus clubs, apply for membership, or propose a new society!
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn--primary">
                Browse Clubs
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 20,
            }}>
              {activeMemberships.map((membership) => {
                const c = membership.club || {};
                const isLeader = ['PRESIDENT', 'VICE_PRESIDENT', 'OFFICER', 'SECRETARY', 'TREASURER'].includes(membership.role);

                return (
                  <div
                    key={membership.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-default)',
                      padding: 20,
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#fff',
                        }}>
                          {c.shortName || (c.name ? c.name.slice(0, 2).toUpperCase() : 'CL')}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{c.name}</h3>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Joined {new Date(membership.joinedAt || membership.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isLeader ? '#fef3c7' : '#ecfdf5',
                        color: isLeader ? '#b45309' : '#059669',
                      }}>
                        {membership.role}
                      </span>
                    </div>

                    <p style={{
                      margin: '0 0 16px',
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {c.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-default)',
                    }}>
                      <button
                        onClick={() => navigate(`/student/clubs/${c.id}`)}
                        className="btn btn--outline"
                        style={{ flex: 1, padding: '7px 12px', fontSize: '0.85rem' }}
                      >
                        Club Home
                      </button>

                      {isLeader && (
                        <button
                          onClick={() => navigate(`/student/clubs/${c.id}/manage`)}
                          className="btn btn--primary"
                          style={{ padding: '7px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Settings size={14} />
                          <span>Manage</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleLeave(c.id, c.name)}
                        disabled={actionLoadingId === c.id}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border-default)',
                          color: 'var(--color-danger-500)',
                          borderRadius: 'var(--radius-md)',
                          padding: '7px 10px',
                          cursor: 'pointer',
                        }}
                        title="Leave Club"
                      >
                        <LogOut size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PENDING REQUESTS ─────────────────────────── */}
      {activeTab === 'requests' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 24px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-strong)',
            }}>
              <CheckCircle size={44} style={{ color: 'var(--color-accent-500)', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>No pending requests</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                All your club membership applications have been processed or you have not applied to any yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingRequests.map((req) => {
                const c = req.club || {};
                return (
                  <div
                    key={req.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-default)',
                      padding: 18,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{c.name}</h4>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: '#fef3c7',
                          color: '#d97706',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          AWAITING REVIEW
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Applied on {new Date(req.createdAt).toLocaleDateString()} • Pending club leadership approval
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => navigate(`/student/clubs/${c.id}`)}
                        className="btn btn--outline"
                        style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                      >
                        View Club
                      </button>
                      <button
                        onClick={() => handleLeave(c.id, c.name)}
                        className="btn btn--secondary"
                        style={{ padding: '6px 14px', fontSize: '0.85rem', color: 'var(--color-danger-500)' }}
                      >
                        Cancel Application
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROPOSE CLUB MODAL ──────────────────────────────── */}
      {showProposeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-default)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-default)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  Propose a New Club / Society
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Club proposals are reviewed by college administrators before activation.
                </p>
              </div>
              <button
                onClick={() => setShowProposeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProposeClub} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Club Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence & Robotics Society"
                    value={proposalForm.name}
                    onChange={(e) => setProposalForm({ ...proposalForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Short Name / Acronym
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AIRS"
                    value={proposalForm.shortName}
                    onChange={(e) => setProposalForm({ ...proposalForm, shortName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Category *
                  </label>
                  <select
                    value={proposalForm.category}
                    onChange={(e) => setProposalForm({ ...proposalForm, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Founded Year
                  </label>
                  <input
                    type="number"
                    value={proposalForm.foundedYear}
                    onChange={(e) => setProposalForm({ ...proposalForm, foundedYear: parseInt(e.target.value) || new Date().getFullYear() })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                  Mission & Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the objectives, proposed activities, workshops, and student benefits..."
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="club@student.institution.edu"
                    value={proposalForm.contactEmail}
                    onChange={(e) => setProposalForm({ ...proposalForm, contactEmail: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Website / Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={proposalForm.website}
                    onChange={(e) => setProposalForm({ ...proposalForm, website: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Meeting Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 402, CS Block"
                    value={proposalForm.meetingLocation}
                    onChange={(e) => setProposalForm({ ...proposalForm, meetingLocation: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Meeting Schedule
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Every Friday 4:30 PM"
                    value={proposalForm.meetingSchedule}
                    onChange={(e) => setProposalForm({ ...proposalForm, meetingSchedule: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, padding: '8px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={proposalForm.membershipApprovalRequired}
                    onChange={(e) => setProposalForm({ ...proposalForm, membershipApprovalRequired: e.target.checked })}
                  />
                  <span>Require Leadership Approval for Joining</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={proposalForm.electionsEnabled}
                    onChange={(e) => setProposalForm({ ...proposalForm, electionsEnabled: e.target.checked })}
                  />
                  <span>Enable Student Elections</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="btn btn--outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="btn btn--primary"
                >
                  {submittingProposal ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
