import { useEffect, useRef } from 'react';

export default function AuthBackground({ mousePos = { x: 0, y: 0 } }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Check prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = reducedMotionQuery.matches;

    // Particle count: ~90-130 on desktop, ~45 on mobile
    const count = window.innerWidth < 680 ? 45 : 110;
    const particles = [];

    for (let i = 0; i < count; i++) {
      // ~12% subtle amber particles, others white/gray
      const isAmber = Math.random() < 0.12;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: isAmber ? Math.random() * 1.5 + 0.8 : Math.random() * 1.2 + 0.5,
        alpha: Math.random() * 0.55 + 0.15,
        targetAlpha: Math.random() * 0.55 + 0.15,
        alphaSpeed: (Math.random() * 0.008 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
        vx: (Math.random() - 0.5) * 0.06,
        vy: -(Math.random() * 0.08 + 0.02),
        color: isAmber
          ? '249, 115, 22' // Amber #f97316
          : Math.random() < 0.4
          ? '255, 255, 255'
          : '200, 205, 215',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle parallax shift for particle layer (2-4px)
      const pOffsetX = mousePos.x * 3.5;
      const pOffsetY = mousePos.y * 3.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha += p.alphaSpeed;

          if (p.alpha > 0.75 || p.alpha < 0.15) {
            p.alphaSpeed = -p.alphaSpeed;
          }

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        ctx.beginPath();
        ctx.arc(p.x + pOffsetX, p.y + pOffsetY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${Math.max(0.05, Math.min(1, p.alpha))})`;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [mousePos.x, mousePos.y]);

  return (
    <>
      <canvas ref={canvasRef} className="auth-bg-canvas" aria-hidden="true" />
      <div
        className="auth-ambient-glow"
        style={{
          transform: `translate(calc(-50% + ${mousePos.x * 1.5}px), calc(-50% + ${mousePos.y * 1.5}px))`,
        }}
        aria-hidden="true"
      />
      <div
        className="auth-tech-grid"
        style={{
          transform: `translate(${mousePos.x * 1}px, ${mousePos.y * 1}px)`,
        }}
        aria-hidden="true"
      />
    </>
  );
}
