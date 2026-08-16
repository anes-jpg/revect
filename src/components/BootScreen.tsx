import { useEffect, useState } from 'react';
import Logo from './Logo';

interface BootScreenProps {
  onFinished: () => void;
}

// Total runtime (keep in sync with the CSS animation timings in index.css).
const SHOW_MS = 1800;
const FADE_MS = 450;

export function BootScreen({ onFinished }: BootScreenProps) {
  const [exiting, setExiting] = useState(false);

  // Respect reduced-motion: skip the animation, leave almost immediately.
  const [fast] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const showMs = fast ? 250 : SHOW_MS;
    const showTimer = setTimeout(() => setExiting(true), showMs);
    const doneTimer = setTimeout(onFinished, showMs + (fast ? 0 : FADE_MS));
    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished, fast]);

  return (
    <div className={`boot-screen ${exiting ? 'boot-screen--exit' : ''}`} aria-hidden="true">
      <div className="boot-tile">
        {/* Rising patterned fill */}
        <div className="boot-tile__fill" />
        {/* Border sweep */}
        <div className="boot-tile__border" />
        {/* R logo */}
        <div className="boot-tile__logo">
          <Logo />
        </div>
      </div>
      <div className="boot-wordmark">Revect</div>
    </div>
  );
}
