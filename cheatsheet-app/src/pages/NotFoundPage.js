import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import Footer from '../components/Footer';

function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found';
  }, []);
  return (
    <>
      <main className="not-found">
        <Mascot animation="hurt" stillFrame="last" scale={4} featured />
        <h1>That page isn't here</h1>
        <p>The link may be old, or the sheet may have moved.</p>
        <p>
          <Link to="/">Back to the games</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}

export default NotFoundPage;
