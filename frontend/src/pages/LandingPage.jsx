import { Link } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Shield, Users, HeartHandshake,
  AlertTriangle, MessageSquare, ArrowRight,
} from 'lucide-react';
import ResponsiveHeroBanner from '../components/ui/responsive-hero-banner';
import '../components/ui/animated-card.css';

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section — nav is embedded inside the full-bleed hero banner */}
      <ResponsiveHeroBanner
        badgeLabel="Campus AI"
        badgeText="Your campus, intelligently connected"
        title="Everything Your Campus"
        titleLine2="Has to Offer."
        description="Discover events, clubs, opportunities and campus updates — all in one place, personalized around you."
        primaryButtonText="Explore Campus"
        primaryButtonHref="/login/student"
        secondaryButtonText="Ask Campus AI"
        secondaryButtonHref="/login/student"
        partnersTitle="Discover what is happening across your campus"
      />

      {/* Role Entry Doors */}
      <section style={{
        padding: '0 24px 56px',
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          textAlign: 'left',
        }}>
          <div className="uiverse-card">
            <div className="card__border"></div>
            <div className="card_title__container">
              <div style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: 'rgba(99,102,241,0.2)',
                color: '#8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <GraduationCap size={24} />
              </div>
              <span className="card_title">Student Portal</span>
              <p className="card_paragraph">
                For registered college students. Swap skills, join study groups, assemble hackathon teams, and access campus SOS.
              </p>
            </div>
            <hr className="line" />
            <Link to="/login/student" className="button">
              Student Sign In <ArrowRight size={15} />
            </Link>
            <Link to="/register/student" className="secondary-link">
              New Student? Register here
            </Link>
          </div>

          <div className="uiverse-card">
            <div className="card__border"></div>
            <div className="card_title__container">
              <div style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: 'rgba(14,165,233,0.2)',
                color: '#0ea5e9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <BookOpen size={24} />
              </div>
              <span className="card_title">Teacher Portal</span>
              <p className="card_paragraph">
                Separate verified portal for faculty. Broadcast official circulars, share course materials, and guide students.
              </p>
            </div>
            <hr className="line" />
            <Link to="/login/teacher" className="button">
              Faculty Sign In <ArrowRight size={15} />
            </Link>
            <Link to="/register/teacher" className="secondary-link">
              New Faculty? Request Access
            </Link>
          </div>

          <div className="uiverse-card">
            <div className="card__border"></div>
            <div className="card_title__container">
              <div style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: 'rgba(245,158,11,0.2)',
                color: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Shield size={24} />
              </div>
              <span className="card_title">Admin Console</span>
              <p className="card_paragraph">
                Executive administrative hub. Verify faculty credentials, enforce campus moderation, and review audit telemetry.
              </p>
            </div>
            <hr className="line" />
            <Link to="/login/admin" className="button">
              Admin Sign In <ArrowRight size={15} />
            </Link>
            <div className="secondary-link" style={{ cursor: 'default' }}>
              No public registration
            </div>
          </div>
        </div>
      </section>

      {/* Key Ecosystem Capabilities */}
      <section style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto 48px',
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {[
          { icon: HeartHandshake, title: 'Smart Skill Exchange', desc: 'Swap skills 1-on-1 with peers based on mutual learning wishlists.', color: '#10b981' },
          { icon: AlertTriangle,  title: 'Campus Emergency SOS', desc: 'Instant peer dispatch for medical aid, vehicle breakdowns, and campus safety.', color: '#ef4444' },
          { icon: Users,          title: 'Teammate Discovery',   desc: 'Assemble cross-disciplinary teams for Smart India Hackathon and capstones.', color: '#6366f1' },
          { icon: MessageSquare,  title: 'Verified Academic Q&A', desc: 'Ask course questions with verified guidance from college faculty.', color: '#0ea5e9' },
        ].map((feat) => (
          <div key={feat.title} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: 'var(--radius-md)',
              background: feat.color + '15',
              color: feat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <feat.icon size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                {feat.title}
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {feat.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
      }}>
        <p>2026 UniLink Digital Campus Platform. Engineered for Higher Education Institutions.</p>
      </footer>
    </div>
  );
}
