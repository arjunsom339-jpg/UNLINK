import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tag, MapPin, Calendar, User, Bookmark, MessageSquare, AlertTriangle,
  ArrowLeft, CheckCircle, ShieldCheck, Clock, Share2, Trash2, Check
} from 'lucide-react';
import { campusExchangeApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function MarketplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  // Inquiry modal state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('exchange_violation');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Seller inquiries state
  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const res = await campusExchangeApi.getMarketplaceListingById(id);
      const data = res.data?.data || res.data;
      setListing(data);
      setBookmarked(!!data.isBookmarked);

      // If user is seller, fetch inquiries
      if (user && data.sellerId === user.id) {
        fetchInquiries();
      }
    } catch (err) {
      toast.error('Listing not found or access restricted.');
      navigate('/student/campus-exchange');
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const res = await campusExchangeApi.getListingInquiries(id);
      setInquiries(res.data?.data || []);
    } catch (_) {
      // Ignored if not authorized
    } finally {
      setLoadingInquiries(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleToggleBookmark = async () => {
    try {
      if (bookmarked) {
        await campusExchangeApi.removeMarketplaceBookmark(id);
        setBookmarked(false);
        toast.success('Removed from saved items');
      } else {
        await campusExchangeApi.bookmarkMarketplaceListing(id);
        setBookmarked(true);
        toast.success('Saved to bookmarks');
      }
    } catch (err) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;
    setSendingInquiry(true);
    try {
      await campusExchangeApi.createMarketplaceInquiry(id, { message: inquiryMessage });
      toast.success('Inquiry sent to seller!');
      setShowInquiryModal(false);
      setInquiryMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send inquiry.');
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleReportListing = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await campusExchangeApi.reportItem('marketplace', id, {
        category: reportCategory,
        description: reportDescription,
      });
      toast.success('Listing reported for campus administration review.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleReserve = async () => {
    try {
      await campusExchangeApi.reserveMarketplaceListing(id);
      toast.success('Listing marked as Reserved.');
      fetchListing();
    } catch (err) {
      toast.error('Failed to reserve listing');
    }
  };

  const handleMarkSold = async () => {
    try {
      await campusExchangeApi.markMarketplaceListingSold(id);
      toast.success('Listing marked as Sold!');
      fetchListing();
    } catch (err) {
      toast.error('Failed to mark sold');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await campusExchangeApi.deleteMarketplaceListing(id);
      toast.success('Listing deleted.');
      navigate('/student/campus-exchange');
    } catch (err) {
      toast.error('Failed to delete listing');
    }
  };

  const handleRespondInquiry = async (inquiryId, status) => {
    try {
      await campusExchangeApi.respondToInquiry(inquiryId, { status });
      toast.success(`Inquiry marked as ${status.toLowerCase()}`);
      fetchInquiries();
    } catch (err) {
      toast.error('Failed to update inquiry');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <p>Loading listing details...</p>
      </div>
    );
  }

  if (!listing) return null;

  const isSeller = user && listing.sellerId === user.id;
  const isFree = Number(listing.price) === 0;

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
        {/* Left Column: Image & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Image */}
          <div
            style={{
              width: '100%',
              height: '360px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {listing.images && listing.images.length > 0 ? (
              <img
                src={listing.images[0]}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Tag size={64} style={{ color: '#cbd5e1' }} />
            )}
          </div>

          {/* Description Section */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Description
            </h3>
            <p style={{ margin: 0, fontSize: '15px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {listing.description}
            </p>
          </div>

          {/* Inquiries List (For Seller) */}
          {isSeller && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} /> Inquiries Received ({inquiries.length})
              </h3>
              {loadingInquiries ? (
                <p style={{ color: '#64748b', fontSize: '14px' }}>Loading inquiries...</p>
              ) : inquiries.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px' }}>No prospective buyers have messaged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      style={{
                        padding: '14px',
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
                          {inq.buyer?.name || 'A student'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: inq.status === 'ACCEPTED' ? '#dcfce7' : '#e2e8f0', color: inq.status === 'ACCEPTED' ? '#16a34a' : '#475569' }}>
                          {inq.status}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                        "{inq.message}"
                      </p>
                      {inq.status === 'OPEN' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            onClick={() => handleRespondInquiry(inq.id, 'ACCEPTED')}
                            style={{ padding: '4px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Accept & Connect
                          </button>
                          <button
                            onClick={() => handleRespondInquiry(inq.id, 'DECLINED')}
                            style={{ padding: '4px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
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
          )}
        </div>

        {/* Right Column: Pricing, Seller & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Info Card */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>
                {listing.category?.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
                Condition: {listing.condition?.replace(/_/g, ' ')}
              </span>
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.3 }}>
              {listing.title}
            </h1>

            {/* Price display with FREE support */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
              {isFree ? (
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#16a34a' }}>
                  FREE
                </span>
              ) : (
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>
                  ₹{Number(listing.price).toLocaleString()}
                </span>
              )}
              {listing.isNegotiable && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
                  Negotiable
                </span>
              )}
            </div>

            {/* Location & Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={15} style={{ color: '#6366f1' }} />
                <span>Pickup: <strong>{listing.location || 'On-campus pickup'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} style={{ color: '#6366f1' }} />
                <span>Posted: {new Date(listing.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!isSeller ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setShowInquiryModal(true)}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <MessageSquare size={16} /> Contact Seller / Send Inquiry
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={handleToggleBookmark}
                    style={{
                      padding: '10px',
                      background: bookmarked ? '#eef2ff' : '#fff',
                      color: bookmarked ? '#4f46e5' : '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Bookmark size={15} /> {bookmarked ? 'Saved' : 'Save Item'}
                  </button>
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertTriangle size={15} /> Report
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listing.status === 'ACTIVE' && (
                  <button
                    onClick={handleReserve}
                    style={{
                      padding: '12px',
                      background: '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as Reserved
                  </button>
                )}
                {listing.status !== 'SOLD' && (
                  <button
                    onClick={handleMarkSold}
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
                    Mark as Sold
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '10px',
                    background: '#fff',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={15} /> Delete Listing
                </button>
              </div>
            )}
          </div>

          {/* Seller Verified Profile Card */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#64748b' }}>
              SELLER VERIFICATION
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '18px',
                }}
              >
                {listing.seller?.name ? listing.seller.name[0] : 'S'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                    {listing.seller?.name || 'Campus Peer'}
                  </span>
                  <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                    <ShieldCheck size={12} /> Verified Student
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Institutional identity authenticated
                </span>
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8' }}>
              🔒 Private phone and email are never exposed to prevent spam.
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Send Inquiry to Seller
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Inquire about availability, pickup location, or negotiate price politely.
            </p>
            <form onSubmit={handleSendInquiry}>
              <textarea
                rows="4"
                required
                placeholder="Hi! Is this still available? I can meet near the library..."
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInquiryModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInquiry}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {sendingInquiry ? 'Sending...' : 'Send Message'}
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
              Report Inappropriate Listing
            </h3>
            <form onSubmit={handleReportListing}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Reason Category *
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="prohibited_item">Prohibited or dangerous item</option>
                  <option value="scam_or_fake">Scam, fake, or misleading listing</option>
                  <option value="harassment">Harassment or abusive content</option>
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
                  placeholder="Explain why this listing violates campus guidelines..."
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
