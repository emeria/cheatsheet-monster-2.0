import React from 'react';
import { Link } from 'react-router-dom';
import site from '../content/site';
import ThemeSwitcher from './ThemeSwitcher';

// Brand on the left, theme picker on the right. Socials and support links live in the footer.
const Header = () => {
  return (
    <header className="site-header">
      <div className="site-header-in">
        <Link className="brand" to="/">
          {site.name}
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
};

export default Header;
