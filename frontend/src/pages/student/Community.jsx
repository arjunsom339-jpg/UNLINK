import { useState, useEffect, useCallback } from 'react';
import {
  Users, Megaphone, MessageSquare, BarChart2, Search,
  Pin, Heart, MessageCircle, Share2, Plus, CheckCircle, Clock,
  Send, ChevronDown, ChevronUp, Loader2, RefreshCw, Trophy,
  ThumbsUp, Award, AlertCircle, Filter, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { communityApi, connectionApi } from '../../api';

// ─── Utility helpers ────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getAuthorName(item) {
  return item?.author?.studentProfile?.fullName
    || item?.author?.teacherProfile?.fullName
    || item?.author?.email?.split('@')[0]
    || 'Campus';
}

function getAuthorLabel(q) {
  const sp = q?.author?.studentProfile;
  if (!sp) return '';
  const dept = sp.department?.split(' ')[0] || '';
  return `${sp.semester ? `Sem ${sp.semester} ` : ''}${dept}`;
}

function Avatar({ name = '?', size = 36, gradient = 'linear-gradient(135deg,#6366f1,#a855f7)' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.38,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
      <Icon size={40} style={{ marginBottom: 12, opacity: 0.35 }} />
      <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: '0.85rem' }}>{body}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-500)' }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Community() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab]   = useState('announcements');
  const [searchTerm, setSearchTerm] = useState('');

  // Announcements
  const [announcements, setAnnouncements]         = useState([]);
  const [annLoading, setAnnLoading]               = useState(true);
  const [annCategoryFilter, setAnnCategoryFilter] = useState('all');

  // Q&A
  const [questions, setQuestions]     = useState([]);
  const [qTotal, setQTotal]           = useState(0);
  const [qLoading, setQLoading]       = useState(true);
  const [qSort, setQSort]             = useState('newest');
  const [qResolved, setQResolved]     = useState('');
  const [showAskModal, setShowAskModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', body: '', subject: '', tags: '' });
  const [askLoading, setAskLoading]   = useState(false);

  // Q&A Answers panel
  const [expandedQ, setExpandedQ]     = useState(null);
  const [answerData, setAnswerData]   = useState({});  // { [qId]: { question, answers } }
  const [answerLoading, setAnswerLoading] = useState({});
  const [newAnswer, setNewAnswer]     = useState('');
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  // Polls
  const [polls, setPolls]       = useState([]);
  const [pollLoading, setPollLoading] = useState(true);
  const [showPollModal, setShowPollModal] = useState(false);
  const [newPoll, setNewPoll]   = useState({ question: '', options: ['', ''] });
  const [pollSubmitting, setPollSubmitting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    setAnnLoading(true);
    try {
      const params = annCategoryFilter !== 'all' ? { category: annCategoryFilter } : {};
      const res = await communityApi.getAnnouncements(params);
      setAnnouncements(res.data?.data || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setAnnLoading(false);
    }
  }, [annCategoryFilter]);

  const fetchQuestions = useCallback(async () => {
    setQLoading(true);
    try {
      const params = { sort: qSort, limit: 20 };
      if (qResolved) params.resolved = qResolved;
      const res = await communityApi.getQuestions(params);
      setQuestions(res.data?.data || []);
      setQTotal(res.data?.meta?.total || 0);
    } catch {
      toast.error('Failed to load Q&A');
    } finally {
      setQLoading(false);
    }
  }, [qSort, qResolved]);

  const fetchPolls = useCallback(async () => {
    setPollLoading(true);
    try {
      const res = await communityApi.getPolls();
      setPolls(res.data?.data || []);
    } catch {
      toast.error('Failed to load polls');
    } finally {
      setPollLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);
  useEffect(() => { if (activeTab === 'discussions') fetchQuestions(); }, [activeTab, fetchQuestions]);
  useEffect(() => { if (activeTab === 'polls') fetchPolls(); }, [activeTab, fetchPolls]);

  // ── Announcement actions ───────────────────────────────────────────────────

  const handleShareAnnouncement = (ann) => {
    const text = `${ann.title} — UniLink Campus`;
    navigator.clipboard?.writeText(text).then(() => toast.success('Link copied!')).catch(() => toast('Share: ' + text));
  };

  // ── Q&A actions ────────────────────────────────────────────────────────────

  const handleVoteQuestion = async (q) => {
    if (q.authorId === user?.id) { toast.error("You can't upvote your own question"); return; }
    try {
      const res = await communityApi.voteQuestion(q.id);
      const { voted, voteCount } = res.data?.data || {};
      setQuestions((prev) => prev.map((item) =>
        item.id === q.id ? { ...item, voteCount: voteCount ?? item.voteCount, hasVoted: voted } : item
      ));
      toast.success(voted ? '▲ Upvoted!' : 'Vote removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote failed');
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.title.trim() || !newQuestion.body.trim()) {
      toast.error('Please fill in the title and question body');
      return;
    }
    setAskLoading(true);
    try {
      const res = await communityApi.createQuestion({
        title: newQuestion.title,
        body: newQuestion.body,
        subject: newQuestion.subject,
        tags: newQuestion.tags,
      });
      const created = res.data?.data;
      if (created) setQuestions((prev) => [created, ...prev]);
      setShowAskModal(false);
      setNewQuestion({ title: '', body: '', subject: '', tags: '' });
      toast.success('🎓 Question posted to campus!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post question');
    } finally {
      setAskLoading(false);
    }
  };

  const handleExpandQuestion = async (qId) => {
    if (expandedQ === qId) { setExpandedQ(null); return; }
    setExpandedQ(qId);
    if (answerData[qId]) return; // Already loaded
    setAnswerLoading((prev) => ({ ...prev, [qId]: true }));
    try {
      const res = await communityApi.getAnswers(qId);
      setAnswerData((prev) => ({ ...prev, [qId]: res.data?.data || {} }));
    } catch {
      toast.error('Failed to load answers');
    } finally {
      setAnswerLoading((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handlePostAnswer = async (qId) => {
    if (!newAnswer.trim()) { toast.error('Please write an answer'); return; }
    setAnswerSubmitting(true);
    try {
      const res = await communityApi.postAnswer(qId, { body: newAnswer });
      const answer = res.data?.data;
      setAnswerData((prev) => ({
        ...prev,
        [qId]: {
          ...prev[qId],
          answers: [answer, ...(prev[qId]?.answers || [])],
        },
      }));
      setQuestions((prev) => prev.map((q) =>
        q.id === qId ? { ...q, answerCount: (q.answerCount || 0) + 1 } : q
      ));
      setNewAnswer('');
      toast.success('✅ Answer posted! +10 reputation');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post answer');
    } finally {
      setAnswerSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (qId, aId) => {
    try {
      await communityApi.acceptAnswer(qId, aId);
      setAnswerData((prev) => ({
        ...prev,
        [qId]: {
          ...prev[qId],
          answers: prev[qId]?.answers?.map((a) => ({ ...a, isAccepted: a.id === aId })) || [],
        },
      }));
      setQuestions((prev) => prev.map((q) => q.id === qId ? { ...q, isResolved: true } : q));
      toast.success('✅ Best answer accepted! +25 reputation to author');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept answer');
    }
  };

  // ── Poll actions ──────────────────────────────────────────────────────────

  const handleVotePoll = async (pollId, optionIndex) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;
    if (poll.votedIndex !== null) { toast.error('You have already voted'); return; }
    try {
      const res = await communityApi.votePoll(pollId, optionIndex);
      const updated = res.data?.data;
      setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, ...updated } : p));
      toast.success('🗳️ Vote recorded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote failed');
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const cleanOptions = newPoll.options.filter((o) => o.trim());
    if (!newPoll.question.trim() || cleanOptions.length < 2) {
      toast.error('Question and at least 2 options are required');
      return;
    }
    setPollSubmitting(true);
    try {
      const res = await communityApi.createPoll({ question: newPoll.question, options: cleanOptions });
      const created = res.data?.data;
      if (created) setPolls((prev) => [created, ...prev]);
      setShowPollModal(false);
      setNewPoll({ question: '', options: ['', ''] });
      toast.success('📊 Poll created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setPollSubmitting(false);
    }
  };

  // ── Filtered results ───────────────────────────────────────────────────────

  const filteredAnnouncements = announcements.filter((a) => {
    const s = searchTerm.toLowerCase();
    return !s || a.title?.toLowerCase().includes(s) || a.content?.toLowerCase().includes(s);
  });

  const filteredQuestions = questions.filter((q) => {
    const s = searchTerm.toLowerCase();
    return !s || q.title?.toLowerCase().includes(s) || q.tags?.some((t) => t.toLowerCase().includes(s));
  });

  // ── Category badge styles ─────────────────────────────────────────────────

  const catBadge = (cat) => ({
    urgent: 'badge-danger', event: 'badge-primary',
    placement: 'badge-success', academic: 'badge-warning',
    workshop: 'badge-neutral', general: 'badge-neutral',
  }[cat] || 'badge-neutral');

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Campus Community
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Official announcements, peer Q&A, campus polls, and discussion.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'discussions' && (
            <button className="btn btn-primary" onClick={() => setShowAskModal(true)}>
              <Plus size={15} /> Ask Question
            </button>
          )}
          {activeTab === 'polls' && (
            <button className="btn btn-secondary" onClick={() => setShowPollModal(true)}>
              <Plus size={15} /> Create Poll
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher + Search ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { id: 'announcements', label: 'Announcements', icon: Megaphone, count: filteredAnnouncements.length },
            { id: 'discussions',   label: 'Q&A',           icon: MessageSquare, count: qTotal },
            { id: 'polls',         label: 'Campus Polls',  icon: BarChart2, count: polls.length },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`community-tab-${tab.id}`}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              <span style={{
                background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-2)',
                padding: '1px 6px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 36, height: 40 }}
            placeholder={`Search ${activeTab}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: ANNOUNCEMENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'academic', 'event', 'placement', 'urgent', 'workshop'].map((cat) => (
              <button
                key={cat}
                onClick={() => setAnnCategoryFilter(cat)}
                className={`btn btn-sm ${annCategoryFilter === cat ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {cat}
              </button>
            ))}
            <button
              className="btn btn-ghost btn-sm"
              onClick={fetchAnnouncements}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {annLoading ? <LoadingSpinner /> : filteredAnnouncements.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements" body="Check back later for campus news and notices." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredAnnouncements.map((ann) => (
                <div key={ann.id} className="card" style={{ position: 'relative' }}>
                  {/* Urgent accent */}
                  {ann.category === 'urgent' && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#ef4444', borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)' }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {ann.isPinned && (
                        <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Pin size={11} /> Pinned
                        </span>
                      )}
                      <span className={`badge ${catBadge(ann.category)}`}>
                        {ann.category?.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {timeAgo(ann.publishedAt)}
                      </span>
                    </div>
                    {ann.targetDepartment && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ann.targetDepartment}</span>
                    )}
                  </div>

                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.45 }}>
                    {ann.title}
                  </h3>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: 14 }}>
                    {ann.content}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={getAuthorName(ann)} size={30} gradient="linear-gradient(135deg,#0ea5e9,#6366f1)" />
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {getAuthorName(ann)}
                        </span>
                        <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: '0.68rem', padding: '1px 6px' }}>
                          {ann.author?.role === 'teacher' ? 'Faculty' : ann.author?.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleShareAnnouncement(ann)}
                      className="btn btn-ghost btn-sm"
                      title="Share"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: Q&A DISCUSSIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'discussions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sort + filter bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sort:</span>
            {[{ val: 'newest', label: 'Newest' }, { val: 'votes', label: 'Top Voted' }].map((s) => (
              <button key={s.val} className={`btn btn-sm ${qSort === s.val ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQSort(s.val)}>
                {s.label}
              </button>
            ))}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 8 }}>Status:</span>
            {[{ val: '', label: 'All' }, { val: 'false', label: 'Open' }, { val: 'true', label: 'Solved' }].map((s) => (
              <button key={s.val} className={`btn btn-sm ${qResolved === s.val ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setQResolved(s.val)}>
                {s.label}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={fetchQuestions} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>

          {qLoading ? <LoadingSpinner /> : filteredQuestions.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No questions yet"
              body="Be the first to ask an academic question on campus!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredQuestions.map((q) => (
                <div key={q.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Question row */}
                  <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                    {/* Vote column */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: q.hasVoted ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface-2)',
                      padding: '14px 16px', minWidth: 66, gap: 4,
                      borderRight: '1px solid var(--border-default)',
                      cursor: 'pointer', transition: 'background 0.2s',
                    }}
                      onClick={() => handleVoteQuestion(q)}
                      title={q.hasVoted ? 'Remove vote' : 'Upvote this question'}
                    >
                      <ChevronUp size={20} style={{ color: q.hasVoted ? 'var(--color-primary-500)' : 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: q.hasVoted ? 'var(--color-primary-500)' : 'var(--text-primary)' }}>
                        {q.voteCount || 0}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>votes</span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>
                          {q.title}
                        </h3>
                        {q.isResolved && (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <CheckCircle size={11} /> Solved
                          </span>
                        )}
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, marginBottom: 10 }}>
                        {q.body?.length > 180 ? q.body.slice(0, 180) + '…' : q.body}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {q.subject && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{q.subject}</span>
                          )}
                          {(q.tags || []).slice(0, 4).map((t) => (
                            <span key={t} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>#{t}</span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <button
                            onClick={() => handleExpandQuestion(q.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}
                          >
                            <MessageCircle size={14} /> {q.answerCount || 0} answers
                            {expandedQ === q.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <span>
                            By <strong style={{ color: 'var(--text-primary)' }}>{getAuthorName(q)}</strong>
                            {getAuthorLabel(q) && <span> ({getAuthorLabel(q)})</span>}
                          </span>
                          <span>{timeAgo(q.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Answers panel */}
                  {expandedQ === q.id && (
                    <div style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                      {answerLoading[q.id] ? (
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-500)' }} />
                        </div>
                      ) : (
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {/* Answer list */}
                          {(answerData[q.id]?.answers || []).length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                              No answers yet. Be the first to help!
                            </p>
                          ) : (
                            (answerData[q.id]?.answers || []).map((ans) => (
                              <div key={ans.id} style={{
                                background: ans.isAccepted ? 'rgba(16,185,129,0.07)' : 'var(--bg-surface-2)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 14px',
                                border: `1px solid ${ans.isAccepted ? 'rgba(16,185,129,0.3)' : 'var(--border-default)'}`,
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Avatar name={getAuthorName(ans)} size={26} gradient="linear-gradient(135deg,#10b981,#0ea5e9)" />
                                    <div>
                                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{getAuthorName(ans)}</span>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>{timeAgo(ans.createdAt)}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {ans.isAccepted && (
                                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Award size={11} /> Best Answer
                                      </span>
                                    )}
                                    {!q.isResolved && q.authorId === user?.id && !ans.isAccepted && (
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ fontSize: '0.75rem', color: '#10b981' }}
                                        onClick={() => handleAcceptAnswer(q.id, ans.id)}
                                        title="Mark as best answer"
                                      >
                                        <CheckCircle size={13} /> Accept
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                  {ans.body}
                                </p>
                              </div>
                            ))
                          )}

                          {/* Post answer box */}
                          {q.authorId !== user?.id && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                              <textarea
                                className="input"
                                rows={2}
                                placeholder="Write your answer…"
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                style={{ flex: 1, resize: 'vertical', minHeight: 60 }}
                              />
                              <button
                                className="btn btn-primary"
                                style={{ alignSelf: 'flex-end' }}
                                onClick={() => handlePostAnswer(q.id)}
                                disabled={answerSubmitting}
                              >
                                {answerSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: CAMPUS POLLS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'polls' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchPolls}><RefreshCw size={14} /> Refresh</button>
          </div>

          {pollLoading ? <LoadingSpinner /> : polls.length === 0 ? (
            <EmptyState icon={BarChart2} title="No active polls"
              body="Create a campus poll to gather student opinions." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {polls.map((poll) => (
                <div key={poll.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="badge badge-primary">Campus Poll</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      By {getAuthorName(poll)} • {poll.totalVotes} votes • {timeAgo(poll.createdAt)}
                    </span>
                  </div>

                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.4 }}>
                    {poll.question}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(poll.options || []).map((opt, i) => {
                      const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                      const isSelected = poll.votedIndex === i;
                      const hasVoted   = poll.votedIndex !== null;
                      return (
                        <div
                          key={i}
                          id={`poll-${poll.id}-option-${i}`}
                          onClick={() => !hasVoted && handleVotePoll(poll.id, i)}
                          style={{
                            position: 'relative',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: `1.5px solid ${isSelected ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                            cursor: hasVoted ? 'default' : 'pointer',
                            overflow: 'hidden',
                            background: 'var(--bg-surface-2)',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0,
                            width: hasVoted ? `${pct}%` : 0,
                            background: isSelected ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.08)',
                            transition: 'width 0.5s ease',
                          }} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isSelected && <CheckCircle size={14} style={{ color: 'var(--color-primary-500)' }} />}
                              {opt.text}
                            </span>
                            {hasVoted && (
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                                {pct}% ({opt.votes})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {poll.votedIndex !== null && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'right' }}>
                      You voted for option {poll.votedIndex + 1} • Total: {poll.totalVotes} votes
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ASK QUESTION
      ══════════════════════════════════════════════════════════════════════ */}
      {showAskModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">Ask an Academic Question</h3>
              <button onClick={() => setShowAskModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Question Title *</label>
                <input type="text" className="input"
                  placeholder="e.g. How does virtual memory paging handle page faults?"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })} required />
              </div>

              <div className="input-group">
                <label className="input-label">Subject / Course</label>
                <input type="text" className="input"
                  placeholder="e.g. Operating Systems / CS401"
                  value={newQuestion.subject}
                  onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">Detailed Description *</label>
                <textarea className="input" rows={4}
                  placeholder="Provide context, what you've tried, error messages or code snippets…"
                  value={newQuestion.body}
                  onChange={(e) => setNewQuestion({ ...newQuestion, body: e.target.value })} required />
              </div>

              <div className="input-group">
                <label className="input-label">Tags (comma separated)</label>
                <input type="text" className="input"
                  placeholder="e.g. OS, Memory, Kernel, C"
                  value={newQuestion.tags}
                  onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={askLoading}>
                  {askLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                  Post Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CREATE POLL
      ══════════════════════════════════════════════════════════════════════ */}
      {showPollModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">Create Campus Poll</h3>
              <button onClick={() => setShowPollModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>

            <form onSubmit={handleCreatePoll} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Poll Question *</label>
                <input type="text" className="input"
                  placeholder="e.g. Should library hours be extended during exams?"
                  value={newPoll.question}
                  onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })} required />
              </div>

              <div className="input-group">
                <label className="input-label">Options (min 2) *</label>
                {newPoll.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="text" className="input"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newPoll.options];
                        updated[i] = e.target.value;
                        setNewPoll({ ...newPoll, options: updated });
                      }} />
                    {newPoll.options.length > 2 && (
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => setNewPoll({ ...newPoll, options: newPoll.options.filter((_, j) => j !== i) })}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {newPoll.options.length < 5 && (
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}>
                    <Plus size={14} /> Add Option
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowPollModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-secondary" disabled={pollSubmitting}>
                  {pollSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart2 size={15} />}
                  Publish Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
