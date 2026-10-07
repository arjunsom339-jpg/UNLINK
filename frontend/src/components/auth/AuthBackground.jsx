import React from 'react';

export default function AuthBackground({ mousePos = { x: 0, y: 0 } }) {
  return (
    <div
      aria-hidden="true"
      className="auth-bg-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 
        Themed multi-radial gradient background:
        - 50% 60% at 20% 25%: Warm red/coral (oklch 0.72 0.2 20)
        - 55% 55% at 80% 20%: Magenta/purple (oklch 0.7 0.19 300)
        - 60% 60% at 60% 90%: Cyan/sky accent (oklch 0.72 0.18 210)
        - Base: 135deg deep indigo-violet to dark slate (oklch 0.25 0.09 290 -> oklch 0.24 0.06 235)
      */}
      <div
        className="auth-gradient-canvas"
        style={{
          position: 'absolute',
          inset: '-30px',
          background: `
            radial-gradient(50% 60% at 20% 25%, oklch(0.72 0.2 20), transparent 60%),
            radial-gradient(55% 55% at 80% 20%, oklch(0.7 0.19 300), transparent 60%),
            radial-gradient(60% 60% at 60% 90%, oklch(0.72 0.18 210), transparent 60%),
            linear-gradient(135deg, oklch(0.25 0.09 290), oklch(0.24 0.06 235))
          `,
          transform: `translate(${mousePos.x * 6}px, ${mousePos.y * 6}px)`,
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Subtle fine mesh overlay for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.35,
        }}
      />
    </div>
  );
}
