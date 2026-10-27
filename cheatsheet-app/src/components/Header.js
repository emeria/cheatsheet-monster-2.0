import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import site from '../content/site';
import Mascot from './Mascot';
import ThemeSwitcher from './ThemeSwitcher';

// Canvas = the mascot's 32×40 frame at this whole-number scale (Mascot.test.js checks the frame).
export const HEADER_MASCOT_SCALE = 1;

// Brand on the left, theme picker on the right. Socials and support links live in the footer.
// The mascot idles, waves while the brand is hovered or focused, and reads on a sheet page.
const Header = () => {
  const [waving, setWaving] = useState(false);
  const parts = useLocation().pathname.split('/').filter(Boolean);
  const reading = parts.length === 2 && parts[1] !== 'tools';
  const animation = waving ? 'wave' : reading ? 'sit' : 'idle';
  return (
    <header className="site-header">
      <div className="site-header-in">
        <Link
          className="brand"
          to="/"
          onMouseEnter={() => setWaving(true)}
          onMouseLeave={() => setWaving(false)}
          onFocus={() => setWaving(true)}
          onBlur={() => setWaving(false)}
        >
          <Mascot animation={animation} scale={HEADER_MASCOT_SCALE} stillFrame={animation === 'sit' ? 'last' : 0} />
          {site.name}
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
};

export default Header;
