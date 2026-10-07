import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, Vote, Award, CheckCircle2, Clock, AlertCircle, ArrowLeft,
  Users, Check, Lock, ChevronRight, Sparkles, AlertTriangle
} from 'lucide-react';
import { clubsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ClubElectionView() {
  const { id: clubId, electionId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // Voting state: { [positionId]: candidateId }
  const [selectedVotes, setSelectedVotes] = useState({});
  const [submittingVote, setSubmittingVote] = useState(false);
  const [votedPositions, setVotedPositions] = useState({});

  // Nomination form state
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominatePosId, setNominatePosId] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [submittingNom, setSubmittingNom] = useState(false);

  const fetchElectionData = async () => {
    try {
      setLoading(true);
      const res = await clubsApi.getElectionById(electionId);
      const data = res.data?.data;
      setElection(data);

      // If results are published or closed, try fetching results
      if (data.status === 'RESULTS_PUBLISHED') {
        try {
          const resRes = await clubsApi.getElectionResults(electionId);
          setResults(resRes.data?.data);
        } catch (rErr) {
          console.warn('Results not accessible yet:', rErr.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load election details');
      navigate(`/student/clubs/${clubId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionData();
  }, [electionId]);

  const handleSelectVote = (positionId, candidateId) => {
    setSelectedVotes({ ...selectedVotes, [positionId]: candidateId });
  };

  const handleCastVote = async (positionId) => {
    const candidateId = selectedVotes[positionId];
    if (!candidateId) {
      toast.error('Please select a candidate before casting your vote.');
      return;
    }
    try {
      setSubmittingVote(true);
      await clubsApi.vote(electionId, { positionId, candidateId });
      toast.success('Your vote has been securely recorded!');
      setVotedPositions({ ...votedPositions, [positionId]: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote casting failed');
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleNominate = async (e) => {
    e.preventDefault();
    if (!manifesto.trim()) {
      toast.error('Please provide a candidate manifesto.');
      return;
    }
    try {
      setSubmittingNom(true);
      await clubsApi.nominateCandidate(nominatePosId, { manifesto });
      toast.success('Candidacy nomination submitted for review!');
      setShowNominateModal(false);
      setManifesto('');
      fetchElectionData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Nomination failed');
    } finally {
      setSubmittingNom(false);
    }
  };

  if (loading || !election) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p>Loading election ballot & results...</p>
      </div>
    );
  }

  const isOpen = election.status === 'OPEN';
  const isPublished = election.status === 'RESULTS_PUBLISHED';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Top Back Button ─────────────────────────────────── */}
      <button
        onClick={() => navigate(`/student/clubs/${clubId}`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: 16,
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Club Page</span>
      </button>

      {/* ── Election Hero Card ──────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-default)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <Vote size={20} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                {election.title}
              </h1>
            </div>
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: 640 }}>
              {election.description}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>Voting Starts: {new Date(election.startAt).toLocaleString()}</span>
              <span>•</span>
              <span>Voting Closes: {new Date(election.endAt).toLocaleString()}</span>
            </div>
          </div>

          <span style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: '0.82rem',
            fontWeight: 700,
            background: isOpen ? '#ecfdf5' : isPublished ? '#e0e7ff' : '#f1f5f9',
            color: isOpen ? '#059669' : isPublished ? '#4338ca' : '#475569',
          }}>
            STATUS: {election.status}
          </span>
        </div>

        {/* Voter Privacy Banner */}
        <div style={{
          marginTop: 20,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}>
          <Lock size={16} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} />
          <span>
            <strong>Voter Privacy Guarantee:</strong> Ballots are cryptographic and anonymous. Individual voter candidate selections are strictly confidential and never exposed to club officers.
          </span>
        </div>
      </div>

      {/* ── PUBLISHED RESULTS VIEW ──────────────────────────── */}
      {isPublished && results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={22} style={{ color: '#eab308' }} />
              <span>Certified Election Results</span>
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Total Turnout: <strong>{results.totalVoters || 0}</strong> ballots cast
            </span>
          </div>

          {(results.positions || []).map((pos) => (
            <div
              key={pos.positionId}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                padding: 20,
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-default)', paddingBottom: 10 }}>
                Position: {pos.title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(pos.candidates || []).map((cand) => {
                  const isWinner = (pos.winners || []).some((w) => w.id === cand.id);
                  const pct = pos.totalVotes > 0 ? Math.round((cand.voteCount / pos.totalVotes) * 100) : 0;

                  return (
                    <div
                      key={cand.id}
                      style={{
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        background: isWinner ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-surface-2)',
                        border: isWinner ? '1.5px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {cand.student?.studentProfile?.fullName || cand.student?.email || 'Candidate'}
                          </span>
                          {isWinner && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: '#fef3c7',
                              color: '#b45309',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}>
                              <Sparkles size={12} />
                              ELECTED WINNER
                            </span>
                          )}
                        </div>

                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {cand.voteCount} votes ({pct}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? 'var(--color-primary-600)' : 'var(--color-neutral-400)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ACTIVE BALLOT (OPEN ELECTION) ────────────────────── */}
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            Official Ballot
          </h2>

          {(election.positions || []).map((pos) => {
            const hasVoted = votedPositions[pos.id];
            const approvedCandidates = (pos.candidates || []).filter((c) => c.approved);

            return (
              <div
                key={pos.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  padding: 22,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                      Position: {pos.title}
                    </h3>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {pos.description || `Select one candidate for ${pos.title}`}
                    </p>
                  </div>

                  {hasVoted ? (
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      background: '#ecfdf5',
                      color: '#059669',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <CheckCircle2 size={14} />
                      Vote Cast
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCastVote(pos.id)}
                      disabled={submittingVote || !selectedVotes[pos.id]}
                      className="btn btn--primary"
                      style={{ padding: '7px 16px', fontSize: '0.85rem' }}
                    >
                      Cast Ballot
                    </button>
                  )}
                </div>

                {/* Candidate choices */}
                {approvedCandidates.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No approved candidates registered for this seat.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {approvedCandidates.map((cand) => {
                      const isSelected = selectedVotes[pos.id] === cand.id;

                      return (
                        <div
                          key={cand.id}
                          onClick={() => !hasVoted && handleSelectVote(pos.id, cand.id)}
                          style={{
                            padding: 14,
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2px solid var(--color-primary-600)' : '1px solid var(--border-default)',
                            background: isSelected ? 'var(--color-primary-50)' : 'var(--bg-surface)',
                            cursor: hasVoted ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="radio"
                            name={`pos-${pos.id}`}
                            checked={isSelected}
                            disabled={hasVoted}
                            onChange={() => handleSelectVote(pos.id, cand.id)}
                            style={{ marginTop: 3 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                              {cand.student?.studentProfile?.fullName || cand.student?.email}
                            </div>
                            {cand.manifesto && (
                              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                "{cand.manifesto}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DRAFT OR UPCOMING ───────────────────────────────── */}
      {!isOpen && !isPublished && (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-strong)',
        }}>
          <Clock size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>
            {election.status === 'DRAFT' ? 'Election in Preparation' : election.status === 'CLOSED' ? 'Voting Has Ended' : 'Election Upcoming'}
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {election.status === 'CLOSED'
              ? 'Leadership is tabulating ballots. Official results will be published shortly.'
              : 'The election ballot is not currently open for voting.'}
          </p>
        </div>
      )}
    </div>
  );
}
