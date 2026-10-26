import React, { useEffect, useState } from 'react';

// An image that opens full screen when clicked. Click anywhere or press Escape to close.
function ZoomImage({ src, alt }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return undefined;
    const onKey = (event) => event.key === 'Escape' && setZoomed(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  return (
    <>
      <img className="zoomable" src={src} alt={alt} loading="lazy" onClick={() => setZoomed(true)} />
      {zoomed && (
        <div className="zoom-overlay" role="dialog" aria-label={alt} onClick={() => setZoomed(false)}>
          <img src={src} alt={alt} />
        </div>
      )}
    </>
  );
}

export default ZoomImage;
