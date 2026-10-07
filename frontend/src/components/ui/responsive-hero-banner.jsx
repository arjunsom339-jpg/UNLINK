import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  BrainCircuit,
  GraduationCap,
  Users,
  BookOpen,
  MessageSquare,
  Trophy,
  ShoppingBag,
  Shield,
  Menu,
  X,
} from 'lucide-react';

/* ─── Campus background photo ────────────────────────────────────────── */
const BG_IMAGE = '/campus_hero_bg.jpg';

/* â”€â”€â”€ Scoped styles injected once â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const HERO_STYLES = `
  @keyframes ul-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .fsu-1,.fsu-2,.fsu-3,.fsu-4,.fsu-5 {
      animation: none !important; opacity: 1 !important; transform: none !important;
    }
  }
  .fsu-1 { animation: ul-fade-up 0.65s ease both; animation-delay: 0.05s; }
  .fsu-2 { animation: ul-fade-up 0.65s ease both; animation-delay: 0.18s; }
  .fsu-3 { animation: ul-fade-up 0.65s ease both; animation-delay: 0.30s; }
  .fsu-4 { animation: ul-fade-up 0.65s ease both; animation-delay: 0.42s; }
  .fsu-5 { animation: ul-fade-up 0.65s ease both; animation-delay: 0.54s; }

  /* Nav pill */
  .ul-nav-pill {
    display: flex; align-items: center; gap: 2px;
    border-radius: 9999px;
    background: rgba(255,255,255,0.07);
    padding: 4px;
    border: 1px solid rgba(255,255,255,0.13);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .ul-nav-link {
    padding: 7px 14px; border-radius: 9999px;
    font-size: 0.82rem; font-weight: 500;
    color: rgba(255,255,255,0.72);
    text-decoration: none;
    transition: color 0.18s, background 0.18s;
    white-space: nowrap; font-family: var(--font-sans);
  }
  .ul-nav-link:hover, .ul-nav-link.active {
    color: #fff; background: rgba(255,255,255,0.1);
  }
  .ul-nav-cta {
    margin-left: 4px; display: inline-flex; align-items: center; gap: 6px;
    border-radius: 9999px; background: #fff; color: #0f172a;
    font-size: 0.82rem; font-weight: 600; padding: 7px 16px;
    text-decoration: none; transition: background 0.18s, transform 0.18s;
    font-family: var(--font-sans); white-space: nowrap;
  }
  .ul-nav-cta:hover { background: #f1f5f9; transform: translateY(-1px); }

  /* Mobile */
  .ul-mobile-toggle {
    display: none; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 9999px;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
    backdrop-filter: blur(14px); color: #fff; cursor: pointer;
  }
  @media (max-width: 820px) {
    .ul-mobile-toggle { display: flex; }
    .ul-desktop-nav   { display: none !important; }
  }
  .ul-mobile-menu {
    position: absolute; top: 72px; left: 16px; right: 16px;
    background: rgba(8,8,24,0.92); backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
    padding: 12px; display: flex; flex-direction: column; gap: 4px; z-index: 100;
  }
  .ul-mobile-link {
    padding: 10px 16px; border-radius: 10px;
    font-size: 0.88rem; font-weight: 500;
    color: rgba(255,255,255,0.78); text-decoration: none;
    transition: background 0.15s, color 0.15s; font-family: var(--font-sans);
  }
  .ul-mobile-link:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* Hero text */
  .ul-hero-h1 {
    font-family: var(--font-display, 'Inter', sans-serif);
    font-size: clamp(2.4rem, 6.5vw, 5rem);
    font-weight: 800; line-height: 1.06;
    letter-spacing: -0.04em; color: #fff; margin: 0; text-wrap: balance;
  }
  .ul-hero-h1-accent {
    background: linear-gradient(135deg, #ffffff 0%, #c7d2fe 55%, rgba(165,180,252,0.6) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  /* Badge */
  .ul-badge {
    display: inline-flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
    border-radius: 9999px; padding: 6px 14px 6px 8px;
    backdrop-filter: blur(10px); text-decoration: none;
  }
  .ul-badge-label {
    background: rgba(255,255,255,0.9); color: #0f172a;
    font-size: 0.67rem; font-weight: 700; letter-spacing: 0.07em;
    padding: 3px 10px; border-radius: 9999px; text-transform: uppercase;
    font-family: var(--font-sans);
  }
  .ul-badge-text {
    font-size: 0.82rem; color: rgba(255,255,255,0.8);
    font-weight: 500; font-family: var(--font-sans);
  }

  /* CTA buttons */
  .ul-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; border-radius: 9999px;
    font-size: 0.88rem; font-weight: 600; color: #fff;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
    cursor: pointer; text-decoration: none; backdrop-filter: blur(10px);
    transition: background 0.18s, transform 0.18s, border-color 0.18s;
    white-space: nowrap; font-family: var(--font-sans);
  }
  .ul-btn-primary:hover {
    background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.35);
    transform: translateY(-2px);
  }
  .ul-btn-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; border-radius: 9999px;
    font-size: 0.88rem; font-weight: 500; color: rgba(255,255,255,0.78);
    background: transparent; border: none; cursor: pointer; text-decoration: none;
    transition: color 0.18s, transform 0.18s;
    white-space: nowrap; font-family: var(--font-sans);
  }
  .ul-btn-secondary:hover { color: #fff; transform: translateY(-2px); }

  /* Ecosystem pills */
  .ul-eco-tag {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 18px; border-radius: 9999px;
    border: 1px solid rgba(15, 23, 42, 0.16);
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    font-size: 0.74rem; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #0f172a;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer; font-family: var(--font-sans);
  }
  .ul-eco-tag svg {
    color: #4f46e5;
    transition: transform 0.2s;
  }
  .ul-eco-tag:hover {
    color: #4338ca;
    background: #ffffff;
    border-color: rgba(99, 102, 241, 0.45);
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.2);
    transform: translateY(-2px);
  }
  .ul-eco-tag:hover svg {
    transform: scale(1.18);
  }
  [data-theme="dark"] .ul-eco-tag {
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(255, 255, 255, 0.18);
    color: #f8fafc;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  }
  [data-theme="dark"] .ul-eco-tag:hover {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(129, 140, 248, 0.5);
    color: #ffffff;
  }
  [data-theme="dark"] .ul-eco-tag svg {
    color: #818cf8;
  }

  /* Bottom fade to page bg */
  .ul-fade-bottom {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 220px;
    background: linear-gradient(to bottom, transparent, var(--bg-app, #090912));
    pointer-events: none;
  }

  /* Layout helpers */
  .ul-btn-row {
    display: flex; flex-wrap: wrap; gap: 12px;
    justify-content: center; align-items: center;
  }
  .ul-eco-row {
    display: flex; flex-wrap: wrap; gap: 10px;
    justify-content: center; align-items: center;
  }
  @media (max-width: 480px) {
    .ul-hero-h1 { font-size: clamp(2rem, 9vw, 2.6rem); }
    .ul-btn-row { flex-direction: column; width: 100%; }
    .ul-btn-primary, .ul-btn-secondary { width: 100%; justify-content: center; }
    .ul-badge-text { display: none; }
  }
`;

/* â”€â”€â”€ Nav links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NAV = [
  { label: 'Home',       href: '/',                   active: true },
  { label: 'Events',     href: '/student/events'                   },
  { label: 'Clubs',      href: '/student/clubs'                    },
  { label: 'Placements', href: '/student/placements'               },
  { label: 'Community',  href: '/student/community'                },
];

/* â”€â”€â”€ Ecosystem strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ECOSYSTEM = [
  { icon: CalendarDays,  label: 'Events',          href: '/student/events'           },
  { icon: Users,         label: 'Clubs',           href: '/student/clubs'            },
  { icon: Trophy,        label: 'Placements',      href: '/student/placements'       },
  { icon: BookOpen,      label: 'Resources',       href: '/student/resources'        },
  { icon: MessageSquare, label: 'Community',       href: '/student/community'        },
  { icon: ShoppingBag,   label: 'Campus Exchange', href: '/student/campus-exchange'  },
];

/* â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ResponsiveHeroBanner({
  badgeLabel          = 'Campus AI',
  badgeText           = 'Your campus, intelligently connected',
  title               = 'Everything Your Campus',
  titleLine2          = 'Has to Offer.',
  description         = 'Discover events, clubs, opportunities and campus updates â€” all in one place, personalized around you.',
  primaryButtonText   = 'Explore Campus',
  primaryButtonHref   = '/login/student',
  secondaryButtonText = 'Ask Campus AI',
  secondaryButtonHref = '/login/student',
  onSecondaryClick,
  partnersTitle       = 'Discover what is happening across your campus',
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  /* Inject scoped styles once (and update on changes) */
  useEffect(() => {
    let tag = document.getElementById('ul-hero-styles');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'ul-hero-styles';
      document.head.appendChild(tag);
    }
    tag.textContent = HERO_STYLES;
  }, []);

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        isolation: 'isolate',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
      }}
    >
      {/* â”€â”€ Background image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <img
        src={BG_IMAGE}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          zIndex: 0,
        }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, rgba(4,4,18,0.78) 0%, rgba(4,4,18,0.52) 45%, rgba(4,4,18,0.82) 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Vignette ring */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Bottom fade */}
      <div className="ul-fade-bottom" style={{ zIndex: 2 }} />

      {/* â”€â”€ Embedded Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header style={{ position: 'relative', zIndex: 20, padding: '16px 24px' }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.55)',
            }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800, fontSize: '1.2rem',
                color: '#fff', letterSpacing: '-0.02em',
                display: 'block', lineHeight: 1,
              }}>UniLink</span>
              <span style={{
                fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)',
              }}>Campus Ecosystem</span>
            </div>
          </Link>

          {/* Desktop nav pill */}
          <nav className="ul-desktop-nav ul-nav-pill">
            {NAV.map(({ label, href, active }) => (
              <Link key={label} to={href} className={`ul-nav-link${active ? ' active' : ''}`}>
                {label}
              </Link>
            ))}
            <Link to="/login/student" className="ul-nav-cta">
              Sign In <ArrowRight size={13} />
            </Link>
          </nav>

          {/* Desktop auth shortcuts */}
          <div className="ul-desktop-nav" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link to="/login/teacher" style={{
              padding: '7px 14px', borderRadius: 9999,
              fontSize: '0.78rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.68)',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)', textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.18s',
            }}>Faculty</Link>
            <Link to="/login/admin" style={{
              padding: '7px 14px', borderRadius: 9999,
              fontSize: '0.78rem', fontWeight: 500,
              color: 'rgba(245,158,11,0.88)',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              backdropFilter: 'blur(10px)', textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.18s',
            }}><Shield size={12} /> Admin</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="ul-mobile-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            style={{ border: 'none' }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="ul-mobile-menu">
            {NAV.map(({ label, href }) => (
              <Link key={label} to={href} className="ul-mobile-link" onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/login/student" onClick={() => setMenuOpen(false)} className="ul-mobile-link"
                style={{ flex: 1, textAlign: 'center', background: 'rgba(99,102,241,0.18)', borderRadius: 10 }}>
                Student
              </Link>
              <Link to="/login/teacher" onClick={() => setMenuOpen(false)} className="ul-mobile-link"
                style={{ flex: 1, textAlign: 'center', background: 'rgba(14,165,233,0.15)', borderRadius: 10 }}>
                Faculty
              </Link>
              <Link to="/login/admin" onClick={() => setMenuOpen(false)} className="ul-mobile-link"
                style={{ flex: 1, textAlign: 'center', background: 'rgba(245,158,11,0.14)', color: 'rgba(245,158,11,0.9)', borderRadius: 10 }}>
                Admin
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* â”€â”€ Hero content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 'clamp(40px, 6vw, 90px) 24px clamp(80px, 10vw, 130px)',
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Badge */}
        <div className="ul-badge fsu-1">
          <span className="ul-badge-label">{badgeLabel}</span>
          <span className="ul-badge-text">{badgeText}</span>
        </div>

        {/* Title */}
        <h1 className="ul-hero-h1 fsu-2" style={{ marginTop: 28 }}>
          {title}
          <br />
          <span className="ul-hero-h1-accent">{titleLine2}</span>
        </h1>

        {/* Description */}
        <p className="fsu-3" style={{
          marginTop: 22,
          maxWidth: 560,
          fontSize: 'clamp(0.9rem, 2vw, 1.05rem)',
          lineHeight: 1.75,
          color: 'rgba(255,255,255,0.65)',
          textWrap: 'balance',
          fontFamily: 'var(--font-sans)',
        }}>
          {description}
        </p>

        {/* CTA Buttons */}
        <div className="ul-btn-row fsu-4" style={{ marginTop: 40 }}>
          <Link to={primaryButtonHref} className="ul-btn-primary">
            <GraduationCap size={17} />
            {primaryButtonText}
            <ArrowRight size={16} />
          </Link>
          {onSecondaryClick ? (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="ul-btn-secondary"
              style={{ cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <BrainCircuit size={17} style={{ color: '#a5b4fc' }} />
              {secondaryButtonText}
            </button>
          ) : (
            <Link to={secondaryButtonHref} className="ul-btn-secondary">
              <BrainCircuit size={17} style={{ color: '#a5b4fc' }} />
              {secondaryButtonText}
            </Link>
          )}
        </div>

        {/* Ecosystem discovery strip */}
        <div className="fsu-5" style={{ marginTop: 80, width: '100%', maxWidth: 760 }}>
          <p style={{
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--text-secondary, #475569)', marginBottom: 18,
            fontFamily: 'var(--font-sans)',
          }}>
            {partnersTitle}
          </p>
          <div className="ul-eco-row">
            {ECOSYSTEM.map(({ icon: Icon, label, href }) => (
              <Link key={label} to={href} className="ul-eco-tag">
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

