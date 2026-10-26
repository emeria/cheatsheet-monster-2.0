import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import ThemeSwitcher from './ThemeSwitcher';
import BackToTopButton from './BackToTopButton';

function Layout() {
  const { pathname } = useLocation();

  // The single-page app never reloads, so report each page change to Google Analytics.
  // Pages set document.title in their own effects, which run before this one.
  useEffect(() => {
    window.gtag?.('event', 'page_view', { page_location: window.location.href, page_title: document.title });
  }, [pathname]);

  return (
    <div className="app">
      <Header />
      <ThemeSwitcher />
      <Outlet />
      <BackToTopButton />
    </div>
  );
}

export default Layout;
