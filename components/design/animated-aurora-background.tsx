/** Decorative, token-driven ambient light for the landing hero. */
export function AnimatedAuroraBackground() {
  return (
    <div className="hero-aurora" aria-hidden="true">
      <div className="hero-aurora__mesh" />
      <div className="hero-aurora__orb hero-aurora__orb--one" />
      <div className="hero-aurora__orb hero-aurora__orb--two" />
      <div className="hero-aurora__orb hero-aurora__orb--three" />
      <div className="hero-aurora__beam" />
      <div className="hero-aurora__fade" />
    </div>
  );
}
