import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Calendar, Clock, User, ShieldCheck, AlertTriangle,
  ArrowLeft, CheckCircle, Check, X, Sparkles, HelpCircle, Lock, ArrowRight
} from 'lucide-react';
import { campusExchangeApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function LostFoundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [verificationAnswer, setVerificationAnswer] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Matches state
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('exchange_violation');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await campusExchangeApi.getLostFoundItemById(id);
      const data = res.data?.data || res.data;
      setItem(data);
      fetchMatches();
    } catch (err) {
      toast.error('Item not found or access restricted.');
      navigate('/student/campus-exchange');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await campusExchangeApi.getLostFoundMatches(id);
      setMatches(res.data?.data?.matches || []);
    } catch (_) {
      // Ignored
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const isReporter = user && item && item.reporterId === user.id;

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimMessage.trim()) return;
    setSubmittingClaim(true);
    try {
      await campusExchangeApi.createLostFoundClaim(id, {
        message: claimMessage,
        verificationAnswer: verificationAnswer ? verificationAnswer.trim() : undefined,
      });
      toast.success('Ownership claim submitted to the reporter.');
      setShowClaimModal(false);
      setClaimMessage('');
      setVerificationAnswer('');
      fetchItem();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleAcceptClaim = async (claimId) => {
    try {
      await campusExchangeApi.acceptLostFoundClaim(claimId);
      toast.success('Claim accepted! Item marked as claimed.');
      fetchItem();
    } catch (err) {
      toast.error('Failed to accept claim');
    }
  };

  const handleRejectClaim = async (claimId) => {
    try {
      await campusExchangeApi.rejectLostFoundClaim(claimId, { reason: 'Verification details do not match' });
      toast.success('Claim rejected.');
      fetchItem();
    } catch (err) {
      toast.error('Failed to reject claim');
    }
  };

  const handleResolve = async () => {
    try {
      await campusExchangeApi.markLostFoundResolved(id);
      toast.success('Item marked as successfully resolved!');
      fetchItem();
    } catch (err) {
      toast.error('Failed to resolve item');
    }
  };

  const handleReportItem = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await campusExchangeApi.reportItem('lost-found', id, {
        category: reportCategory,
        description: reportDescription,
      });
      toast.success('Report submitted for campus moderation.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <p>Loading Lost & Found report...</p>
      </div>
    );
  }

  if (!item) return null;

  const isLost = item.type === 'LOST';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/student/campus-exchange')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#4f46e5',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={16} /> Back to Campus Exchange
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Details & Claims */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Info Card */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span
                style={{
                  background: isLost ? '#ffe4e6' : '#dcfce7',
                  color: isLost ? '#e11d48' : '#15803d',
                  fontWeight: 800,
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {item.type}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                {item.category?.replace(/_/g, ' ')}
              </span>
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.3 }}>
              {item.title}
            </h1>

            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {item.description}
            </p>

            {/* Verification question if found */}
            {item.verificationQuestion && (
              <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px', border: '1px solid #bfdbfe', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                <HelpCircle size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#1e3a8a', display: 'block' }}>Finder's Verification Question:</strong>
                  <span style={{ fontSize: '13px', color: '#1e40af' }}>{item.verificationQuestion}</span>
                </div>
              </div>
            )}

            {/* Location & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '14px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={15} style={{ color: '#6366f1' }} />
                <span>Location: <strong>{item.location}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} style={{ color: '#6366f1' }} />
                <span>Date: {new Date(item.itemDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Claims List (For Reporter or Admin) */}
          {isReporter && item.claims && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Ownership Claims Received ({item.claims.length})
              </h3>
              {item.claims.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px' }}>No ownership claims submitted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {item.claims.map((claim) => (
                    <div
                      key={claim.id}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                          Claimant: {claim.claimant?.name || 'A student'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: claim.status === 'ACCEPTED' ? '#dcfce7' : claim.status === 'REJECTED' ? '#fee2e2' : '#e2e8f0',
                            color: claim.status === 'ACCEPTED' ? '#16a34a' : claim.status === 'REJECTED' ? '#ef4444' : '#475569',
                          }}
                        >
                          {claim.status}
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                        "{claim.message}"
                      </p>

                      {claim.verificationAnswer && (
                        <div style={{ fontSize: '13px', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ color: '#1e293b' }}>Private Verification Proof:</strong>{' '}
                          <span style={{ color: '#059669' }}>{claim.verificationAnswer}</span>
                        </div>
                      )}

                      {claim.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            onClick={() => handleAcceptClaim(claim.id)}
                            style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={14} /> Accept Ownership Claim
                          </button>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
                            style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deterministic Matches Section */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles size={18} style={{ color: '#6366f1' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Possible Matches ({matches.length})
              </h3>
            </div>
            {loadingMatches ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Finding potential item matches across campus...</p>
            ) : matches.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                No potential matching records found currently. The system will notify you if a matching belonging is reported.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matches.map((match, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/student/campus-exchange/lost-found/${match.item.id}`)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                          {match.item.title}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px' }}>
                          {match.score}% Confidence
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {match.reasons?.join(' • ')}
                      </span>
                    </div>
                    <ArrowRight size={16} style={{ color: '#6366f1' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions & Safety Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Action Card */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Status:</span>
              <strong style={{ fontSize: '14px', color: item.status === 'RESOLVED' ? '#16a34a' : '#0f172a' }}>
                {item.status}
              </strong>
            </div>

            {!isReporter ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {item.status === 'OPEN' && (
                  <button
                    onClick={() => setShowClaimModal(true)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                    }}
                  >
                    {isLost ? 'I Found This Item!' : 'Submit Ownership Claim'}
                  </button>
                )}
                <button
                  onClick={() => setShowReportModal(true)}
                  style={{
                    padding: '10px',
                    background: '#fff',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Report Inappropriate / Stale
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {item.status !== 'RESOLVED' && (
                  <button
                    onClick={handleResolve}
                    style={{
                      padding: '12px',
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as Resolved / Recovered
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reporter Verification Card */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#64748b' }}>
              REPORTER IDENTITY
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '18px',
                }}
              >
                {item.reporter?.name ? item.reporter.name[0] : 'U'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                    {item.reporter?.name || 'Campus Member'}
                  </span>
                  <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                    <ShieldCheck size={12} /> Verified
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  College verified affiliation
                </span>
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8' }}>
              🔒 Privacy Protected: Personal contact details are confidential.
            </div>
          </div>
        </div>
      </div>

      {/* Claim Submission Modal */}
      {showClaimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {isLost ? 'Contact Reporter' : 'Submit Ownership Claim'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              {isLost
                ? 'Send a secure message to let the reporter know you found their belonging.'
                : 'Provide identifying details to prove this item belongs to you.'}
            </p>
            <form onSubmit={handleClaimSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Message *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain why this item is yours or when you can meet..."
                  value={claimMessage}
                  onChange={(e) => setClaimMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              {item.verificationQuestion && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Answer to: "{item.verificationQuestion}"
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your private verification answer..."
                    value={verificationAnswer}
                    onChange={(e) => setVerificationAnswer(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Only the reporter can read this answer to confirm ownership.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Report Lost & Found Entry
            </h3>
            <form onSubmit={handleReportItem}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Category *
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="scam_or_fake">Fraudulent or fake report</option>
                  <option value="sensitive_leak">Sensitive document / private data exposed</option>
                  <option value="harassment">Abusive behavior</option>
                  <option value="exchange_violation">Other policy violation</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Details *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Provide context for campus administration..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  style={{ padding: '8px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
