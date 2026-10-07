import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, PhoneCall, ShieldAlert, Heart, Wrench, Search,
  MapPin, Clock, CheckCircle2, UserCheck, AlertCircle, Plus,
  Shield, Compass, Sparkles, X, Send, Phone, Droplet, FileText,
  GraduationCap, Navigation, HelpCircle, Activity, Star, RefreshCw,
  Eye, UserPlus, Check, MessageSquare, ThumbsUp, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { helpApi } from '../../api';

// ── OFFICIAL EMERGENCY CONTACTS ──────────────────────────────────────────────
const OFFICIAL_SERVICES = [
  {
    name: 'National Emergency Helpline',
    number: '112',
    desc: 'Unified 24/7 all-in-one emergency response for Police, Fire & Medical.',
    badge: 'National',
    color: '#ef4444',
  },
  {
    name: 'Ambulance & Medical Emergency',
    number: '108',
    desc: 'Emergency Medical Transport, Trauma Responders & Disaster Relief.',
    badge: 'Medical',
    color: '#dc2626',
  },
  {
    name: 'Police Control Room',
    number: '100',
    desc: 'Immediate law enforcement patrol and campus perimeter intervention.',
    badge: 'Police',
    color: '#2563eb',
  },
  {
    name: 'Fire & Rescue Services',
    number: '101',
    desc: 'Fire suppression, hazard containment & structural evacuation rescue.',
    badge: 'Fire',
    color: '#ea580c',
  },
  {
    name: 'Campus Security & Gate Control',
    number: '+91 80-2841-0001',
    desc: 'Internal security patrol, gate monitoring & fast on-campus response.',
    badge: 'Campus Security',
    color: '#4f46e5',
  },
  {
    name: 'Women’s Safety Helpline (ICC)',
    number: '1091',
    desc: 'Confidential campus harassment protection and immediate dispatch.',
    badge: 'Women Safety',
    color: '#9333ea',
  },
  {
    name: 'Student Mental Health & Crisis Hotline',
    number: '+91 80-2841-0004',
    desc: '24/7 trained counselors for acute anxiety, panic or mental health distress.',
    badge: 'Counseling',
    color: '#059669',
  },
];

// ── CATEGORIES SPECIFICATION ─────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'medical', label: 'Medical Emergency', icon: Activity, color: '#ef4444', desc: 'Acute injury, fainting, asthma attack, sudden sickness' },
  { id: 'blood_requirement', label: 'Blood Requirement', icon: Droplet, color: '#dc2626', desc: 'Urgent donor request for patient or surgery' },
  { id: 'safety', label: 'Campus Safety', icon: ShieldAlert, color: '#f59e0b', desc: 'Threat, harassment, suspicious persons, unlit zones' },
  { id: 'vehicle_breakdown', label: 'Vehicle Breakdown', icon: Wrench, color: '#f97316', desc: 'Flat tire, jump start, chain break, stranded vehicle' },
  { id: 'lost_item', label: 'Lost Item / Document', icon: FileText, color: '#8b5cf6', desc: 'Lost ID card, wallet, keys, laptop or project hardware' },
  { id: 'academic_emergency', label: 'Academic Urgent Help', icon: GraduationCap, color: '#3b82f6', desc: 'Urgent lab kit missing, exam admit card issue' },
  { id: 'travel', label: 'Travel / Safety Escort', icon: Navigation, color: '#06b6d4', desc: 'Late night walk buddy, commute breakdown companion' },
  { id: 'campus_assistance', label: 'Campus Assistance', icon: HelpCircle, color: '#10b981', desc: 'Physical help, heavy lifting, hostel facility issue' },
  { id: 'other', label: 'General Help', icon: Sparkles, color: '#6b7280', desc: 'Other urgent needs requiring peer support' },
];

export default function HelpEmergency() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'request');

  useEffect(() => {
    if (urlTab && ['request', 'nearby', 'active', 'my', 'services', 'history'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState({ myRequests: [], helpProvided: [] });

  // Location and Helper Settings
  const [helperSettings, setHelperSettings] = useState({
    availableToHelp: true,
    helpRadiusKm: 5.0,
  });
  const [currentCoords, setCurrentCoords] = useState(null);

  // New Request Form State
  const [newRequest, setNewRequest] = useState({
    category: 'medical',
    title: '',
    description: '',
    urgencyLevel: 'medium',
    locationLabel: 'Campus Main Block',
    locationConsented: false,
    latitude: null,
    longitude: null,
    contactPreference: 'chat',
    isAnonymous: false,
  });

  // Modal States
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [respondModal, setRespondModal] = useState({ isOpen: false, request: null, message: '' });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, requestId: null, wasHelpful: true, rating: 5, comments: '' });
  const [chatMessageText, setChatMessageText] = useState('');

  // Request GPS Location when permitted
  const handleRequestGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCurrentCoords(coords);
        setNewRequest((prev) => ({
          ...prev,
          locationConsented: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        toast.success('Current GPS coordinates acquired.');
      },
      (err) => {
        toast.error(`Location access denied or unavailable (${err.message}). You can still enter location manually.`);
        setNewRequest((prev) => ({ ...prev, locationConsented: false }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Load data for active tab
  const loadTabData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'nearby') {
        const params = currentCoords ? { lat: currentCoords.latitude, lon: currentCoords.longitude } : {};
        const res = await helpApi.getNearbyRequests(params);
        if (res.data?.data) setNearbyRequests(res.data.data);
      } else if (activeTab === 'my') {
        const res = await helpApi.getRequests({ scope: 'my' });
        if (res.data?.data) setMyRequests(res.data.data);
      } else if (activeTab === 'active') {
        // Find latest active or accepted request involving current user
        const res = await helpApi.getRequests({ scope: 'all' });
        if (res.data?.data) {
          const ongoing = res.data.data.find(
            (r) => (r.status === 'active' || r.status === 'accepted' || r.status === 'pending') &&
                   (r.requesterId === user?.id || r.helperId === user?.id)
          );
          if (ongoing) {
            setActiveRequest(ongoing);
            loadChatMessages(ongoing.id);
          } else {
            setActiveRequest(null);
          }
        }
      } else if (activeTab === 'history') {
        const res = await helpApi.getHistory();
        if (res.data?.data) setHistory(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatMessages = async (requestId) => {
    try {
      const res = await helpApi.getMessages(requestId);
      if (res.data?.data) setMessages(res.data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // Create Request Handler
  const handleProceedCreateRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    try {
      const res = await helpApi.createRequest(newRequest);
      toast.success('Help request broadcasted to campus network!');
      setShowSafetyWarning(false);
      setNewRequest({
        category: 'medical',
        title: '',
        description: '',
        urgencyLevel: 'medium',
        locationLabel: 'Campus Main Block',
        locationConsented: false,
        latitude: null,
        longitude: null,
        contactPreference: 'chat',
        isAnonymous: false,
      });
      setActiveTab('active');
      if (res.data?.data) {
        setActiveRequest(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit help request.');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (newRequest.urgencyLevel === 'high' || newRequest.urgencyLevel === 'critical') {
      setShowSafetyWarning(true);
    } else {
      handleProceedCreateRequest();
    }
  };

  // Volunteer Response Handler ("I Can Help")
  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    if (!respondModal.request) return;
    try {
      await helpApi.respondToRequest(respondModal.request.id, {
        message: respondModal.message,
        latitude: currentCoords?.latitude,
        longitude: currentCoords?.longitude,
      });
      toast.success('Volunteer offer submitted! The requester will be notified.');
      setRespondModal({ isOpen: false, request: null, message: '' });
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response.');
    }
  };

  // Requester Selects Helper
  const handleSelectHelper = async (responderUserId) => {
    if (!activeRequest) return;
    try {
      const res = await helpApi.selectPrimaryHelper(activeRequest.id, { responderUserId });
      toast.success('Helper confirmed! Private coordination channel opened.');
      if (res.data?.data) setActiveRequest(res.data.data);
      loadChatMessages(activeRequest.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to select helper.');
    }
  };

  // Send Message in Emergency Chat
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeRequest) return;
    try {
      await helpApi.sendMessage(activeRequest.id, { message: chatMessageText.trim() });
      setChatMessageText('');
      loadChatMessages(activeRequest.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    }
  };

  // Toggle Live Location Sharing
  const handleToggleLocationSharing = async (field, currentVal) => {
    if (!activeRequest) return;
    try {
      const updates = { shareExactLocation: !currentVal };
      if (currentCoords) {
        updates.latitude = currentCoords.latitude;
        updates.longitude = currentCoords.longitude;
      }
      const res = await helpApi.updateLocation(activeRequest.id, updates);
      toast.success(`Live location sharing ${!currentVal ? 'enabled' : 'disabled'}.`);
      if (res.data?.data) setActiveRequest(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update location sharing.');
    }
  };

  // Resolve Request
  const handleResolveRequest = async () => {
    if (!activeRequest) return;
    try {
      await helpApi.resolveRequest(activeRequest.id);
      toast.success('Help marked as resolved! Reputation points awarded.');
      const resolvedId = activeRequest.id;
      setActiveRequest(null);
      // Open feedback modal if requester
      if (activeRequest.requesterId === user?.id && activeRequest.helperId) {
        setFeedbackModal({ isOpen: true, requestId: resolvedId, wasHelpful: true, rating: 5, comments: '' });
      } else {
        loadTabData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve request.');
    }
  };

  // Cancel Request
  const handleCancelRequest = async () => {
    if (!activeRequest) return;
    try {
      await helpApi.cancelRequest(activeRequest.id, { reason: 'Cancelled by requester' });
      toast.success('Help request cancelled.');
      setActiveRequest(null);
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request.');
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await helpApi.submitFeedback(feedbackModal.requestId, {
        wasHelpful: feedbackModal.wasHelpful,
        rating: feedbackModal.rating,
        comments: feedbackModal.comments,
      });
      toast.success('Thank you for your rating and feedback!');
      setFeedbackModal({ isOpen: false, requestId: null, wasHelpful: true, rating: 5, comments: '' });
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback.');
    }
  };

  // Helper Availability Settings Update
  const handleUpdateAvailability = async (updates) => {
    try {
      const res = await helpApi.updateAvailability(updates);
      setHelperSettings((prev) => ({ ...prev, ...updates }));
      toast.success(res.data?.message || 'Helper settings updated.');
    } catch {
      toast.error('Failed to update availability.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Official Services Alert Banner ─────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#ef4444', color: '#fff', padding: 10, borderRadius: 'var(--radius-md)', display: 'flex' }}>
            <PhoneCall size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              IMMEDIATE LIFE EMERGENCY? CALL 112
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
              UniLink peer assistance is community-driven and does <strong>not</strong> substitute for official police, fire or hospital ambulances.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('services')}
          className="btn btn-sm"
          style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Phone size={14} /> View Emergency Hotlines
        </button>
      </div>

      {/* ── Page Header & Quick Navigation ─────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <span className="badge badge-primary" style={{ fontWeight: 800 }}>CAMPUS SAFETY & PEER HELP</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            Help & Emergency Support
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Rapid collegiate peer assistance, GPS proximity coordination, and official helpline access.
          </p>
        </div>

        {/* GPS Sensor Quick Button */}
        <button
          onClick={handleRequestGPS}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <MapPin size={15} color={currentCoords ? '#10b981' : 'var(--text-muted)'} />
          {currentCoords ? 'GPS Active (Locked)' : 'Enable GPS Coordinates'}
        </button>
      </div>

      {/* ── Sub-Section Tabs Navigation ────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-default)', paddingBottom: 8, overflowX: 'auto' }}>
        {[
          { key: 'request', label: '🆘 Request Help', icon: Plus },
          { key: 'nearby', label: '📍 Nearby Help', icon: Compass, count: nearbyRequests.length },
          { key: 'active', label: '⚡ Active Requests', icon: Activity, count: activeRequest ? 1 : 0 },
          { key: 'my', label: '📋 My Requests', icon: FileText, count: myRequests.length },
          { key: 'services', label: '🚑 Emergency Services', icon: PhoneCall },
          { key: 'history', label: '🕘 Help History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSearchParams({ tab: tab.key });
            }}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SUBSECTION 1: REQUEST HELP ─────────────────────────── */}
      {activeTab === 'request' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <form onSubmit={handleFormSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                1. Select Emergency / Assistance Category
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Choose the category that best matches your immediate situation.
              </p>
            </div>

            {/* Visual Category Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
              }}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = newRequest.category === cat.id;
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setNewRequest({ ...newRequest, category: cat.id })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border-default)',
                      background: isSelected ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface-2)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ color: cat.color }}>
                          <IconComponent size={20} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {cat.label}
                        </span>
                      </div>
                      {isSelected && <Check size={16} color={cat.color} />}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {cat.desc}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Urgency Selector */}
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                2. Urgency Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { level: 'low', label: 'Low', desc: 'Can wait 24h', color: '#10b981' },
                  { level: 'medium', label: 'Medium', desc: 'Need help soon', color: '#f59e0b' },
                  { level: 'high', label: 'High', desc: 'Urgent situation', color: '#f97316' },
                  { level: 'critical', label: 'Critical', desc: 'Acute emergency', color: '#ef4444' },
                ].map((u) => {
                  const isSelected = newRequest.urgencyLevel === u.level;
                  return (
                    <button
                      key={u.level}
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, urgencyLevel: u.level })}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? `2px solid ${u.color}` : '1px solid var(--border-default)',
                        background: isSelected ? `${u.color}15` : 'var(--bg-surface-2)',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: u.color, fontSize: '0.95rem' }}>{u.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{u.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Request Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                  Short Title / Summary *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Asthma inhaler backup needed at Central Library"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                  Detailed Description *
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Describe exactly what kind of help is needed, where you are seated, and any relevant details..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                    Location Label *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Main Library 2nd Floor, Quiet Zone"
                    value={newRequest.locationLabel}
                    onChange={(e) => setNewRequest({ ...newRequest, locationLabel: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                    Contact Preference
                  </label>
                  <select
                    className="input"
                    value={newRequest.contactPreference}
                    onChange={(e) => setNewRequest({ ...newRequest, contactPreference: e.target.value })}
                  >
                    <option value="chat">In-App Emergency Chat (Recommended)</option>
                    <option value="phone">Direct Phone Call</option>
                    <option value="in_person">In-Person Coordination Only</option>
                  </select>
                </div>
              </div>

              {/* Location Consent & Privacy Options */}
              <div
                style={{
                  background: 'var(--bg-surface-2)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={newRequest.locationConsented}
                    onChange={(e) => {
                      if (e.target.checked && !currentCoords) {
                        handleRequestGPS();
                      } else {
                        setNewRequest({ ...newRequest, locationConsented: e.target.checked });
                      }
                    }}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>
                    <strong>Share precise GPS location</strong> with authorized helper during active request (stops upon resolution)
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={newRequest.isAnonymous}
                    onChange={(e) => setNewRequest({ ...newRequest, isAnonymous: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>
                    <strong>Post anonymously</strong> (hides your name & USN from general nearby feed)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  background: newRequest.urgencyLevel === 'critical' ? '#ef4444' : 'var(--color-primary-600)',
                  borderColor: newRequest.urgencyLevel === 'critical' ? '#ef4444' : 'var(--color-primary-600)',
                  fontWeight: 700,
                  padding: '12px 24px',
                }}
              >
                Broadcast Help Request 🚀
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SUBSECTION 2: NEARBY HELP ───────────────────────────── */}
      {activeTab === 'nearby' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Helper Availability Preferences Card */}
          <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
                Your Helper Readiness
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Control whether you appear as available to assist fellow students and your desired notification radius.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={helperSettings.availableToHelp}
                  onChange={(e) => handleUpdateAvailability({ availableToHelp: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontWeight: 600 }}>Available to Help</span>
              </label>

              <select
                className="input input-sm"
                value={helperSettings.helpRadiusKm}
                onChange={(e) => handleUpdateAvailability({ helpRadiusKm: parseFloat(e.target.value) })}
                style={{ width: 130 }}
              >
                <option value={0.5}>Within 500 m</option>
                <option value={1.0}>Within 1 km</option>
                <option value={2.0}>Within 2 km</option>
                <option value={5.0}>Within 5 km</option>
                <option value={10.0}>Within 10 km</option>
              </select>
            </div>
          </div>

          {/* Nearby Requests Feed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Active Student Requests In Your Area ({nearbyRequests.length})
              </h3>
              <button onClick={loadTabData} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Refresh Feed
              </button>
            </div>

            {nearbyRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: '#10b981' }} />
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  No active emergencies nearby!
                </p>
                <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  All clear in your current vicinity. When a peer within {helperSettings.helpRadiusKm} km requests assistance, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid-2">
                {nearbyRequests.map((req) => {
                  const isCritical = req.urgencyLevel === 'critical';
                  return (
                    <div
                      key={req.id}
                      className="card"
                      style={{
                        borderLeft: `4px solid ${isCritical ? '#ef4444' : req.urgencyLevel === 'high' ? '#f97316' : 'var(--color-primary-500)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <span className="badge badge-neutral" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                              {req.category.replace('_', ' ')}
                            </span>
                            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: 4 }}>
                              {req.title}
                            </h4>
                          </div>
                          <span
                            className="badge"
                            style={{
                              background: isCritical ? '#fee2e2' : '#fef3c7',
                              color: isCritical ? '#b91c1c' : '#b45309',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              fontSize: '0.7rem',
                            }}
                          >
                            {req.urgencyLevel}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                          {req.description}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} color="var(--color-primary-500)" />
                            {req.locationLabel}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Compass size={13} />
                            {req.distanceLabel}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <UserCheck size={13} />
                            {req.requester.fullName} ({req.requester.department || 'Student'})
                          </span>
                        </div>
                      </div>

                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {req.responderCount} responder(s) offering help
                        </span>

                        {req.hasUserResponded ? (
                          <span className="badge badge-success">Offer Submitted</span>
                        ) : (
                          <button
                            onClick={() => setRespondModal({ isOpen: true, request: req, message: '' })}
                            className="btn btn-primary btn-sm"
                            style={{ background: '#10b981', borderColor: '#10b981' }}
                          >
                            I Can Help 🤝
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBSECTION 3: ACTIVE REQUESTS (LIVE COORDINATION) ──── */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!activeRequest ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <Activity size={40} style={{ margin: '0 auto 12px', color: 'var(--color-primary-500)' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                No active ongoing requests right now
              </p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                When you initiate a help request or are selected as primary helper, real-time coordination and chat will appear here.
              </p>
              <button onClick={() => setActiveTab('request')} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                Request Assistance Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Active Request Status Banner */}
              <div
                className="card"
                style={{
                  border: '1.5px solid var(--color-primary-500)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                        {activeRequest.status}
                      </span>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {activeRequest.category.replace('_', ' ')}
                      </span>
                      <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase' }}>
                        {activeRequest.urgencyLevel}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
                      {activeRequest.title}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                      {activeRequest.description}
                    </p>
                  </div>

                  {/* Actions: Resolve / Cancel */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleCancelRequest} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger-500)' }}>
                      Cancel Request
                    </button>
                    <button onClick={handleResolveRequest} className="btn btn-primary btn-sm" style={{ background: '#10b981', borderColor: '#10b981' }}>
                      Mark Resolved (+15 pts) ✅
                    </button>
                  </div>
                </div>

                {/* State Machine Status Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={16} color="var(--color-primary-500)" />
                    <span>Location: <strong>{activeRequest.locationLabel}</strong></span>
                  </div>

                  {/* Location Sharing Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: activeRequest.requesterLocationShared || activeRequest.helperLocationShared ? '#10b981' : '#9ca3af',
                        }}
                      />
                      {activeRequest.requesterLocationShared || activeRequest.helperLocationShared
                        ? '🟢 Exact GPS Sharing Active'
                        : '⚪ Location Sharing Disabled'}
                    </span>

                    <button
                      onClick={() => handleToggleLocationSharing('shareExactLocation', activeRequest.requesterLocationShared)}
                      className="btn btn-xs btn-secondary"
                    >
                      {activeRequest.requesterLocationShared ? 'Disable Live GPS' : 'Share Live GPS'}
                    </button>
                  </div>
                </div>

                {/* Responders Selection Section (If pending/accepted) */}
                {activeRequest.status === 'accepted' && activeRequest.requesterId === user?.id && (
                  <div style={{ background: 'rgba(245,158,11,0.08)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#b45309', marginBottom: 8 }}>
                      Peers Offering to Help ({activeRequest.responders?.length || 0})
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Review volunteers below and confirm your primary helper to open live private coordination.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(activeRequest.responders || []).map((resp) => (
                        <div
                          key={resp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-surface)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {resp.responder?.studentProfile?.fullName || resp.responder?.email}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {resp.responder?.studentProfile?.department}
                            </div>
                            {resp.message && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
                                "{resp.message}"
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleSelectHelper(resp.userId)}
                            className="btn btn-sm btn-primary"
                          >
                            Confirm Helper & Chat
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Private Emergency Coordination Chat Panel */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
                <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={18} color="var(--color-primary-500)" />
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      Private Emergency Coordination Channel
                    </span>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    End-to-End Private Channel
                  </span>
                </div>

                {/* Message Stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto' }}>
                      No messages yet. Send a message to coordinate arrival, room number, or status.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === user?.id;
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            background: isMe ? 'var(--color-primary-600)' : 'var(--bg-surface-2)',
                            color: isMe ? '#fff' : 'var(--text-primary)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            borderBottomRightRadius: isMe ? 2 : 'var(--radius-md)',
                            borderBottomLeftRadius: !isMe ? 2 : 'var(--radius-md)',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 2 }}>
                            {isMe ? 'You' : (m.sender?.studentProfile?.fullName || 'Helper')}
                          </div>
                          <div style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>{m.message}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Box */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Type urgent coordination message..."
                    value={chatMessageText}
                    onChange={(e) => setChatMessageText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={15} /> Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBSECTION 4: MY REQUESTS ──────────────────────────── */}
      {activeTab === 'my' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              My Help Requests ({myRequests.length})
            </h3>
            <button onClick={() => setActiveTab('request')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> New Help Request
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>You haven't posted any help requests</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Whenever you request campus peer assistance, you can track it here.</p>
            </div>
          ) : (
            <div className="grid-2">
              {myRequests.map((r) => (
                <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {r.category.replace('_', ' ')}
                        </span>
                        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: 4 }}>
                          {r.title}
                        </h4>
                      </div>
                      <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                        {r.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                      {r.description}
                    </p>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span>📍 {r.locationLabel}</span>
                      <span>⚡ {r.urgencyLevel}</span>
                    </div>
                  </div>

                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Created: {new Date(r.createdAt).toLocaleDateString()}
                    </span>

                    {(r.status === 'pending' || r.status === 'accepted' || r.status === 'active') && (
                      <button
                        onClick={() => {
                          setActiveRequest(r);
                          setActiveTab('active');
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        Open Live Tracker
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUBSECTION 5: OFFICIAL EMERGENCY SERVICES ──────────── */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Official Emergency Services & Helplines
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              Direct one-tap contact numbers for National Emergency dispatch, local police, ambulance, campus security, and student counselors.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {OFFICIAL_SERVICES.map((s) => (
              <div
                key={s.number}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${s.color}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span className="badge" style={{ background: `${s.color}15`, color: s.color, fontWeight: 700, fontSize: '0.72rem' }}>
                      {s.badge}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>
                      {s.number}
                    </span>
                  </div>

                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                    {s.name}
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {s.desc}
                  </p>
                </div>

                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
                  <a
                    href={`tel:${s.number}`}
                    className="btn btn-sm"
                    style={{ background: s.color, color: '#fff', borderColor: s.color, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <PhoneCall size={14} /> Call {s.number} Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUBSECTION 6: HELP HISTORY & REPUTATION ─────────────── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Assistance Provided Log */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Heart size={18} color="#10b981" /> Assistance You Provided ({history.helpProvided?.length || 0})
            </h3>

            {!history.helpProvided || history.helpProvided.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                You have not resolved any peer help requests yet. Check "Nearby Help" to assist fellow students!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.helpProvided.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface-2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Helped: {item.requester?.studentProfile?.fullName || 'Student'} • {item.durationMinutes || 15} mins duration
                      </div>
                    </div>
                    <span className="badge badge-success">+15 Rep Points Awarded</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Requests Created */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Clock size={18} color="var(--color-primary-500)" /> Resolved / Past Requests ({history.myRequests?.length || 0})
            </h3>

            {!history.myRequests || history.myRequests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No past resolved requests found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.myRequests.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface-2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Helper: {item.helper?.studentProfile?.fullName || 'Campus Peer'} • Status: {item.status}
                      </div>
                    </div>
                    <span className="badge badge-neutral">{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: SAFETY WARNING FOR HIGH / CRITICAL ─────────── */}
      {showSafetyWarning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24, borderTop: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', marginBottom: 12 }}>
              <ShieldAlert size={26} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Critical Safety Notice</h3>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              You are about to broadcast a <strong>{newRequest.urgencyLevel.toUpperCase()}</strong> urgency request. If you or someone nearby is in immediate physical danger, medical shock, or active hazard, please dial official emergency services first:
            </p>

            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 'var(--radius-md)', fontWeight: 700, textAlign: 'center', marginBottom: 18 }}>
              🚨 Emergency Hotlines: 112 (National) | 108 (Ambulance) | 100 (Police)
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <a href="tel:112" className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                <PhoneCall size={14} /> Call 112
              </a>
              <button onClick={handleProceedCreateRequest} className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                Proceed & Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VOLUNTEER ("I CAN HELP") ────────────────────── */}
      {respondModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Offer Assistance to Peer
              </h3>
              <button onClick={() => setRespondModal({ isOpen: false, request: null, message: '' })} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              You are offering to help with: <strong>{respondModal.request?.title}</strong>
            </p>

            <form onSubmit={handleVolunteerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Note to Requester (Optional)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. I have a spare tire inflator in Mechanical Block. Walking over now..."
                  value={respondModal.message}
                  onChange={(e) => setRespondModal({ ...respondModal, message: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setRespondModal({ isOpen: false, request: null, message: '' })} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Send Offer 🤝
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: FEEDBACK & RATING ───────────────────────────── */}
      {feedbackModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Rate Your Helper & Assistance
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Your feedback verifies authentic assistance and awards campus peer reputation.
            </p>

            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  Did this student help you resolve the request?
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setFeedbackModal({ ...feedbackModal, wasHelpful: true })}
                    className={`btn btn-sm ${feedbackModal.wasHelpful ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                  >
                    👍 Yes, Very Helpful
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackModal({ ...feedbackModal, wasHelpful: false })}
                    className={`btn btn-sm ${!feedbackModal.wasHelpful ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                  >
                    👎 No / Didn't show up
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                  Rating (1 to 5 Stars)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackModal({ ...feedbackModal, rating: star })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                    >
                      <Star
                        size={24}
                        fill={star <= feedbackModal.rating ? '#f59e0b' : 'none'}
                        color={star <= feedbackModal.rating ? '#f59e0b' : '#9ca3af'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                  Comments (Optional)
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Thank your peer or describe what they did..."
                  value={feedbackModal.comments}
                  onChange={(e) => setFeedbackModal({ ...feedbackModal, comments: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button type="submit" className="btn btn-primary">
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
