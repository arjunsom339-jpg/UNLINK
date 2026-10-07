import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Search, Tag, Filter, Plus, Bookmark, HelpCircle,
  CheckCircle, Clock, MapPin, Eye, ArrowRight, ShieldCheck, AlertTriangle,
  RefreshCw, DollarSign, Package, Sparkles, MessageSquare
} from 'lucide-react';
import { campusExchangeApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const MARKETPLACE_CATEGORIES = [
  'ALL',
  'BOOKS',
  'ELECTRONICS',
  'COMPUTERS',
  'MOBILE_ACCESSORIES',
  'FURNITURE',
  'BICYCLE',
  'COLLEGE_SUPPLIES',
  'PROJECT_MATERIAL',
  'CLOTHING',
  'SPORTS',
  'OTHER',
];

const LOST_FOUND_CATEGORIES = [
  'ALL',
  'ID_CARD',
  'DOCUMENT',
  'PHONE',
  'LAPTOP',
  'BAG',
  'WALLET',
  'KEYS',
  'BOOK',
  'ELECTRONICS',
  'CLOTHING',
  'VEHICLE_ITEM',
  'OTHER',
];

export default function CampusExchange() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Active top-level tab: 'marketplace' | 'lost-found'
  const [activeTab, setActiveTab] = useState('marketplace');

  // Sub-tabs for Marketplace: 'browse' | 'saved' | 'my-listings' | 'my-inquiries'
  const [marketSubTab, setMarketSubTab] = useState('browse');

  // Sub-tabs for Lost & Found: 'browse-lost' | 'browse-found' | 'my-reports' | 'my-claims'
  const [lfSubTab, setLfSubTab] = useState('browse-lost');

  // Marketplace states
  const [marketListings, setMarketListings] = useState([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketCategory, setMarketCategory] = useState('ALL');
  const [marketCondition, setMarketCondition] = useState('');
  const [marketSort, setMarketSort] = useState('newest');
  const [marketTotal, setMarketTotal] = useState(0);

  // Lost & Found states
  const [lfItems, setLfItems] = useState([]);
  const [lfLoading, setLfLoading] = useState(true);
  const [lfSearch, setLfSearch] = useState('');
  const [lfCategory, setLfCategory] = useState('ALL');
  const [lfTotal, setLfTotal] = useState(0);

  // Modal states
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showReportItem, setShowReportItem] = useState(false);

  // Listing Form State
  const [listingForm, setListingForm] = useState({
    title: '',
    category: 'BOOKS',
    price: '',
    isNegotiable: false,
    condition: 'GOOD',
    location: '',
    description: '',
  });
  const [creatingListing, setCreatingListing] = useState(false);

  // Lost & Found Form State
  const [lfForm, setLfForm] = useState({
    type: 'LOST',
    category: 'ID_CARD',
    title: '',
    description: '',
    location: '',
    itemDate: new Date().toISOString().split('T')[0],
    verificationQuestion: '',
  });
  const [reportingLf, setReportingLf] = useState(false);

  // Fetch Marketplace Listings
  const fetchMarketplace = async () => {
    setMarketLoading(true);
    try {
      if (marketSubTab === 'browse') {
        const res = await campusExchangeApi.getMarketplaceListings({
          q: marketSearch || undefined,
          category: marketCategory !== 'ALL' ? marketCategory : undefined,
          condition: marketCondition || undefined,
          sort: marketSort,
          status: 'ACTIVE',
        });
        setMarketListings(res.data?.data || []);
        setMarketTotal(res.data?.meta?.total || 0);
      } else if (marketSubTab === 'saved') {
        const res = await campusExchangeApi.getSavedMarketplaceListings();
        setMarketListings(res.data?.data || []);
        setMarketTotal(res.data?.meta?.total || 0);
      } else if (marketSubTab === 'my-listings') {
        const res = await campusExchangeApi.getMyMarketplaceListings();
        setMarketListings(res.data?.data || []);
        setMarketTotal(res.data?.meta?.total || 0);
      } else if (marketSubTab === 'my-inquiries') {
        const res = await campusExchangeApi.getMyMarketplaceInquiries();
        setMarketListings(res.data?.data || []);
        setMarketTotal(res.data?.meta?.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load marketplace listings.');
    } finally {
      setMarketLoading(false);
    }
  };

  // Fetch Lost & Found Items
  const fetchLostFound = async () => {
    setLfLoading(true);
    try {
      if (lfSubTab === 'browse-lost' || lfSubTab === 'browse-found') {
        const itemType = lfSubTab === 'browse-lost' ? 'LOST' : 'FOUND';
        const res = await campusExchangeApi.getLostFoundItems({
          type: itemType,
          category: lfCategory !== 'ALL' ? lfCategory : undefined,
          q: lfSearch || undefined,
          status: 'OPEN',
        });
        setLfItems(res.data?.data || []);
        setLfTotal(res.data?.meta?.total || 0);
      } else if (lfSubTab === 'my-reports') {
        const res = await campusExchangeApi.getMyLostFoundReports();
        setLfItems(res.data?.data || []);
        setLfTotal(res.data?.meta?.total || 0);
      } else if (lfSubTab === 'my-claims') {
        const res = await campusExchangeApi.getMyLostFoundClaims();
        setLfItems(res.data?.data || []);
        setLfTotal(res.data?.meta?.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load Lost & Found items.');
    } finally {
      setLfLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchMarketplace();
    } else {
      fetchLostFound();
    }
  }, [activeTab, marketSubTab, marketCategory, marketCondition, marketSort, lfSubTab, lfCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'marketplace') fetchMarketplace();
    else fetchLostFound();
  };

  const handleCreateListingSubmit = async (e) => {
    e.preventDefault();
    setCreatingListing(true);
    try {
      await campusExchangeApi.createMarketplaceListing({
        ...listingForm,
        price: Number(listingForm.price) || 0,
      });
      toast.success('Marketplace listing published!');
      setShowCreateListing(false);
      setListingForm({
        title: '',
        category: 'BOOKS',
        price: '',
        isNegotiable: false,
        condition: 'GOOD',
        location: '',
        description: '',
      });
      fetchMarketplace();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing.');
    } finally {
      setCreatingListing(false);
    }
  };

  const handleReportLfSubmit = async (e) => {
    e.preventDefault();
    setReportingLf(true);
    try {
      await campusExchangeApi.createLostFoundItem(lfForm);
      toast.success('Report submitted successfully!');
      setShowReportItem(false);
      setLfForm({
        type: 'LOST',
        category: 'ID_CARD',
        title: '',
        description: '',
        location: '',
        itemDate: new Date().toISOString().split('T')[0],
        verificationQuestion: '',
      });
      fetchLostFound();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setReportingLf(false);
    }
  };

  return (
    <div className="campus-exchange-page" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* ── HEADER BANNER ─────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#fff',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} /> College Verified Isolation
              </span>
              <span style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                100% Peer-to-Peer
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
              Campus Exchange & Lost / Found
            </h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: '15px', maxWidth: '640px', lineHeight: 1.5 }}>
              Buy, sell, or donate textbooks and campus gear directly with college peers, or report and recover lost belongings with deterministic verification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowCreateListing(true)}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Plus size={16} /> Post Listing
            </button>
            <button
              onClick={() => setShowReportItem(true)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '10px',
                padding: '10px 18px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <HelpCircle size={16} /> Report Lost / Found
            </button>
          </div>
        </div>

        {/* Primary Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '16px' }}>
          <button
            onClick={() => setActiveTab('marketplace')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'marketplace' ? '#fff' : 'transparent',
              color: activeTab === 'marketplace' ? '#1e1b4b' : 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <ShoppingBag size={16} /> Campus Marketplace
          </button>
          <button
            onClick={() => setActiveTab('lost-found')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'lost-found' ? '#fff' : 'transparent',
              color: activeTab === 'lost-found' ? '#1e1b4b' : 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Search size={16} /> Lost & Found
          </button>
        </div>
      </div>

      {/* ── MARKETPLACE VIEW ────────────────────────────────────────── */}
      {activeTab === 'marketplace' && (
        <div>
          {/* Sub Navigation Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'browse', label: 'Browse Store' },
                { id: 'saved', label: 'Saved Items' },
                { id: 'my-listings', label: 'My Listings' },
                { id: 'my-inquiries', label: 'My Inquiries' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setMarketSubTab(sub.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: marketSubTab === sub.id ? '#4f46e5' : '#e2e8f0',
                    background: marketSubTab === sub.id ? '#eef2ff' : '#fff',
                    color: marketSubTab === sub.id ? '#4f46e5' : '#64748b',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {marketSubTab === 'browse' && (
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search books, lab tools, bikes..."
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      width: '260px',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Search
                </button>
              </form>
            )}
          </div>

          {/* Filters Bar for Browse */}
          {marketSubTab === 'browse' && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                <Filter size={15} /> Category:
              </div>
              <select
                value={marketCategory}
                onChange={(e) => setMarketCategory(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginLeft: '12px' }}>
                Condition:
              </div>
              <select
                value={marketCondition}
                onChange={(e) => setMarketCondition(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="">All Conditions</option>
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="USED">Used</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginLeft: '12px' }}>
                Sort:
              </div>
              <select
                value={marketSort}
                onChange={(e) => setMarketSort(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          )}

          {/* Listings Grid */}
          {marketLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <RefreshCw className="spin" size={28} style={{ margin: '0 auto 12px' }} />
              <p>Loading campus marketplace...</p>
            </div>
          ) : marketListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <Package size={42} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1e293b' }}>No listings found</h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
                {marketSubTab === 'saved'
                  ? 'You have not bookmarked any items yet.'
                  : marketSubTab === 'my-listings'
                  ? 'You have not posted any marketplace listings yet.'
                  : 'Be the first to list a textbook, electronics, or college item for peers!'}
              </p>
              {marketSubTab === 'browse' && (
                <button
                  onClick={() => setShowCreateListing(true)}
                  style={{
                    padding: '8px 18px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create First Listing
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {marketListings.map((item) => {
                // If sub-tab is my-inquiries, structure is slightly different
                const listing = item.listing || item;
                const isFree = Number(listing.price) === 0;

                return (
                  <div
                    key={listing.id}
                    onClick={() => navigate(`/student/campus-exchange/marketplace/${listing.id}`)}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Item Image or Header placeholder */}
                    <div
                      style={{
                        height: '160px',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {listing.images && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Tag size={40} style={{ color: '#cbd5e1' }} />
                      )}

                      {/* Condition badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {listing.condition?.replace(/_/g, ' ')}
                      </span>

                      {/* Status badge if reserved or sold */}
                      {listing.status !== 'ACTIVE' && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            background: listing.status === 'SOLD' ? '#ef4444' : '#f59e0b',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {listing.status}
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase' }}>
                          {listing.category?.replace(/_/g, ' ')}
                        </span>
                        {/* Price display with FREE check */}
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>
                          {isFree ? (
                            <span style={{ color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontSize: '13px' }}>
                              FREE
                            </span>
                          ) : (
                            <span style={{ color: '#0f172a' }}>₹{Number(listing.price).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                        {listing.title}
                      </h4>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}
                      >
                        {listing.description}
                      </p>

                      <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {listing.location || 'On Campus'}
                        </span>
                        {listing.seller && (
                          <span style={{ fontWeight: 600, color: '#475569' }}>
                            {listing.seller.name?.split(' ')[0]}
                          </span>
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

      {/* ── LOST & FOUND VIEW ────────────────────────────────────────── */}
      {activeTab === 'lost-found' && (
        <div>
          {/* Sub Navigation Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'browse-lost', label: '🔴 Browse Lost Items' },
                { id: 'browse-found', label: '🟢 Browse Found Items' },
                { id: 'my-reports', label: 'My Reports' },
                { id: 'my-claims', label: 'My Ownership Claims' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setLfSubTab(sub.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: lfSubTab === sub.id ? '#4f46e5' : '#e2e8f0',
                    background: lfSubTab === sub.id ? '#eef2ff' : '#fff',
                    color: lfSubTab === sub.id ? '#4f46e5' : '#64748b',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {(lfSubTab === 'browse-lost' || lfSubTab === 'browse-found') && (
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search ID card, wallet, keys, laptop..."
                    value={lfSearch}
                    onChange={(e) => setLfSearch(e.target.value)}
                    style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      width: '260px',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Search
                </button>
              </form>
            )}
          </div>

          {/* Filters Bar */}
          {(lfSubTab === 'browse-lost' || lfSubTab === 'browse-found') && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                <Filter size={15} /> Category:
              </div>
              <select
                value={lfCategory}
                onChange={(e) => setLfCategory(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                {LOST_FOUND_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lost & Found List */}
          {lfLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <RefreshCw className="spin" size={28} style={{ margin: '0 auto 12px' }} />
              <p>Loading Lost & Found reports...</p>
            </div>
          ) : lfItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <HelpCircle size={42} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1e293b' }}>No reports recorded</h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
                {lfSubTab === 'my-reports'
                  ? 'You have not reported any lost or found items.'
                  : lfSubTab === 'my-claims'
                  ? 'You have not submitted any ownership claims.'
                  : 'No active reports under this category.'}
              </p>
              <button
                onClick={() => setShowReportItem(true)}
                style={{
                  padding: '8px 18px',
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                File a Report
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {lfItems.map((item) => {
                const target = item.item || item;
                const isLost = target.type === 'LOST';

                return (
                  <div
                    key={target.id}
                    onClick={() => navigate(`/student/campus-exchange/lost-found/${target.id}`)}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          background: isLost ? '#ffe4e6' : '#dcfce7',
                          color: isLost ? '#e11d48' : '#15803d',
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {target.type}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {target.category?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                      {target.title}
                    </h4>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#64748b',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {target.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} style={{ color: '#6366f1' }} /> {target.location}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} style={{ color: '#6366f1' }} />{' '}
                        {new Date(target.itemDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Status: <strong style={{ color: target.status === 'RESOLVED' ? '#16a34a' : '#475569' }}>{target.status}</strong>
                      </span>
                      <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Details <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE LISTING ─────────────────────────────────── */}
      {showCreateListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              Create Marketplace Listing
            </h3>
            <form onSubmit={handleCreateListingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering Mathematics Volume 2 (Kreyszig)"
                  value={listingForm.title}
                  onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={listingForm.category}
                    onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {MARKETPLACE_CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Price (₹) — 0 for FREE *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={listingForm.price}
                    onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Condition *
                  </label>
                  <select
                    value={listingForm.condition}
                    onChange={(e) => setListingForm({ ...listingForm, condition: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="NEW">Brand New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good Condition</option>
                    <option value="FAIR">Fair / Usable</option>
                    <option value="USED">Heavily Used</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Campus Pickup Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Central Library / Hostel 2"
                    value={listingForm.location}
                    onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Description *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe condition, edition, accessories included..."
                  value={listingForm.description}
                  onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isNegotiable"
                  checked={listingForm.isNegotiable}
                  onChange={(e) => setListingForm({ ...listingForm, isNegotiable: e.target.checked })}
                />
                <label htmlFor="isNegotiable" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                  Price is negotiable
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateListing(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingListing}
                  style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {creatingListing ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT LOST / FOUND ────────────────────────────── */}
      {showReportItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              Report Lost or Found Belonging
            </h3>
            <form onSubmit={handleReportLfSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Report Type *
                  </label>
                  <select
                    value={lfForm.type}
                    onChange={(e) => setLfForm({ ...lfForm, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="LOST">I LOST something</option>
                    <option value="FOUND">I FOUND something</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={lfForm.category}
                    onChange={(e) => setLfForm({ ...lfForm, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {LOST_FOUND_CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student ID Card (Mechanical Dept)"
                  value={lfForm.title}
                  onChange={(e) => setLfForm({ ...lfForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Campus Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Library 2nd Floor"
                    value={lfForm.location}
                    onChange={(e) => setLfForm({ ...lfForm, location: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={lfForm.itemDate}
                    onChange={(e) => setLfForm({ ...lfForm, itemDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Description *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe appearance. Avoid posting full sensitive ID numbers for privacy."
                  value={lfForm.description}
                  onChange={(e) => setLfForm({ ...lfForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              {lfForm.type === 'FOUND' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Verification Question (Optional for Owner Proof)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. What color is the keychain? Or What sticker is on the back?"
                    value={lfForm.verificationQuestion}
                    onChange={(e) => setLfForm({ ...lfForm, verificationQuestion: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    A secret question prevents false claims without exposing full contents publicly.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportItem(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportingLf}
                  style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {reportingLf ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
