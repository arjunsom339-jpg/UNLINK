import { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, AlertTriangle, ShieldCheck, Trash2, Archive,
  TrendingUp, CheckCircle, Clock, Package, DollarSign, Filter, RefreshCw
} from 'lucide-react';
import { campusExchangeApi } from '../../api';
import toast from 'react-hot-toast';

export default function AdminMarketplace() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'marketplace' | 'lost-found'

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Marketplace listings state
  const [marketListings, setMarketListings] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketStatus, setMarketStatus] = useState('');

  // Lost & Found items state
  const [lfItems, setLfItems] = useState([]);
  const [loadingLf, setLoadingLf] = useState(false);
  const [lfSearch, setLfSearch] = useState('');
  const [lfType, setLfType] = useState('');

  // Moderation action modal
  const [modModal, setModModal] = useState({ open: false, type: '', id: '', title: '' });
  const [modReason, setModReason] = useState('');
  const [submittingMod, setSubmittingMod] = useState(false);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await campusExchangeApi.getAdminAnalytics();
      setAnalytics(res.data?.data || null);
    } catch (err) {
      toast.error('Failed to load exchange analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchMarketplace = async () => {
    setLoadingMarket(true);
    try {
      const res = await campusExchangeApi.getAdminMarketplace({
        q: marketSearch || undefined,
        status: marketStatus || undefined,
      });
      setMarketListings(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load marketplace listings');
    } finally {
      setLoadingMarket(false);
    }
  };

  const fetchLostFound = async () => {
    setLoadingLf(true);
    try {
      const res = await campusExchangeApi.getAdminLostFound({
        q: lfSearch || undefined,
        type: lfType || undefined,
      });
      setLfItems(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load Lost & Found items');
    } finally {
      setLoadingLf(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    else if (activeTab === 'marketplace') fetchMarketplace();
    else if (activeTab === 'lost-found') fetchLostFound();
  }, [activeTab, marketStatus, lfType]);

  const handleExecuteMod = async (e) => {
    e.preventDefault();
    setSubmittingMod(true);
    try {
      if (modModal.type === 'marketplace_remove') {
        await campusExchangeApi.adminRemoveMarketplace(modModal.id, { reason: modReason });
        toast.success('Marketplace listing removed and audit logged.');
        fetchMarketplace();
      } else if (modModal.type === 'lost_found_archive') {
        await campusExchangeApi.adminArchiveLostFound(modModal.id, { reason: modReason });
        toast.success('Report archived and audit logged.');
        fetchLostFound();
      }
      setModModal({ open: false, type: '', id: '', title: '' });
      setModReason('');
    } catch (err) {
      toast.error('Moderation action failed');
    } finally {
      setSubmittingMod(false);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Campus Exchange & Lost / Found Administration
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Monitor peer marketplace listings, oversee lost & found resolution, and moderate policy-violating records.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        {[
          { id: 'analytics', label: '📊 Exchange Analytics' },
          { id: 'marketplace', label: '🏷️ Marketplace Moderation' },
          { id: 'lost-found', label: '🔍 Lost & Found Oversight' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === tab.id ? '#4f46e5' : '#64748b',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 1. REAL ANALYTICS DASHBOARD ────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div>
          {loadingAnalytics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px' }} />
              <p>Calculating real database metrics...</p>
            </div>
          ) : analytics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Marketplace Stats */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
                  Marketplace Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Listings</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#4f46e5', margin: '8px 0 0' }}>
                      {analytics.marketplace.activeListings}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Sold Items</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', margin: '8px 0 0' }}>
                      {analytics.marketplace.soldListings}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Inquiries</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', margin: '8px 0 0' }}>
                      {analytics.marketplace.totalInquiries}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Average Price</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '8px 0 0' }}>
                      ₹{analytics.marketplace.averagePrice}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Sellers</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#9333ea', margin: '8px 0 0' }}>
                      {analytics.marketplace.activeSellers}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Lost & Found Stats */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
                  Lost & Found Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Reports</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '8px 0 0' }}>
                      {analytics.lostAndFound.totalReports}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Lost Belongings</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#e11d48', margin: '8px 0 0' }}>
                      {analytics.lostAndFound.lostReports}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Found Items</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', margin: '8px 0 0' }}>
                      {analytics.lostAndFound.foundReports}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Resolved / Recovered</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', margin: '8px 0 0' }}>
                      {analytics.lostAndFound.resolvedReports}
                    </h2>
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Open Claims</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', margin: '8px 0 0' }}>
                      {analytics.lostAndFound.openClaims}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── 2. MARKETPLACE MODERATION TAB ──────────────────────────── */}
      {activeTab === 'marketplace' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by title..."
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '260px' }}
            />
            <select
              value={marketStatus}
              onChange={(e) => setMarketStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="SOLD">SOLD</option>
              <option value="REMOVED">REMOVED</option>
            </select>
            <button
              onClick={fetchMarketplace}
              style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Filter
            </button>
          </div>

          {/* Table */}
          {loadingMarket ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading listings...</p>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                  <tr>
                    <th style={{ padding: '14px 16px' }}>Item Title</th>
                    <th style={{ padding: '14px 16px' }}>Seller</th>
                    <th style={{ padding: '14px 16px' }}>Category</th>
                    <th style={{ padding: '14px 16px' }}>Price</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {marketListings.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No listings found.</td>
                    </tr>
                  ) : (
                    marketListings.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{item.title}</td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{item.seller?.name || 'N/A'}</td>
                        <td style={{ padding: '14px 16px', color: '#64748b' }}>{item.category}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                          {Number(item.price) === 0 ? 'FREE' : `₹${item.price}`}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: item.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: item.status === 'ACTIVE' ? '#16a34a' : '#64748b' }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setModModal({ open: true, type: 'marketplace_remove', id: item.id, title: item.title })}
                            style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 3. LOST & FOUND OVERSIGHT TAB ──────────────────────────── */}
      {activeTab === 'lost-found' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search reports..."
              value={lfSearch}
              onChange={(e) => setLfSearch(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '260px' }}
            />
            <select
              value={lfType}
              onChange={(e) => setLfType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="">All Types</option>
              <option value="LOST">LOST</option>
              <option value="FOUND">FOUND</option>
            </select>
            <button
              onClick={fetchLostFound}
              style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Filter
            </button>
          </div>

          {/* Table */}
          {loadingLf ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading records...</p>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                  <tr>
                    <th style={{ padding: '14px 16px' }}>Type</th>
                    <th style={{ padding: '14px 16px' }}>Item Title</th>
                    <th style={{ padding: '14px 16px' }}>Reporter</th>
                    <th style={{ padding: '14px 16px' }}>Claims</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lfItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No reports found.</td>
                    </tr>
                  ) : (
                    lfItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: item.type === 'LOST' ? '#ffe4e6' : '#dcfce7', color: item.type === 'LOST' ? '#e11d48' : '#15803d' }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{item.title}</td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{item.reporter?.name || 'N/A'}</td>
                        <td style={{ padding: '14px 16px', color: '#64748b' }}>{item.claims?.length || 0} claims</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setModModal({ open: true, type: 'lost_found_archive', id: item.id, title: item.title })}
                            style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Archive
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Moderation Confirmation Modal */}
      {modModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {modModal.type === 'marketplace_remove' ? 'Remove Marketplace Listing' : 'Archive Lost & Found Report'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Action on: <strong>{modModal.title}</strong>. An administrative AuditLog entry will be created.
            </p>
            <form onSubmit={handleExecuteMod}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Moderation Reason *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Specify policy violation reason..."
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModModal({ open: false, type: '', id: '', title: '' })}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMod}
                  style={{ padding: '8px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingMod ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
