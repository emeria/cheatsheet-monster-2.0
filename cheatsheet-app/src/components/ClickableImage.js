import React, { useState, useEffect } from 'react';
import images from '../data/imagesData';

function ClickableImage({ tag }) {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const image = images.find(img => img.tag === tag);

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!image) {
    return <p>Image not found</p>;
  }

  const toggleOverlay = () => {
    setOverlayVisible(!overlayVisible);
  };

  const imageStyle = {
    cursor: 'pointer',
    maxWidth: '100%', // Ensures image is not larger than its container
    maxHeight: windowSize.height * 0.8, // 80% of viewport height
    width: 'auto',
    height: 'auto'
  };

  return (
    <div>
      <img
        src={process.env.PUBLIC_URL + image.src}
        alt={image.alt}
        onClick={toggleOverlay}
        style={imageStyle}
      />

      {overlayVisible && (
        <div id="overlay" onClick={toggleOverlay} style={{ /* styles for overlay */ }}>
          <img
            src={process.env.PUBLIC_URL + image.src}
            style={imageStyle}
            alt="Enlarged"
          />
        </div>
      )}
    </div>
  );
}

export default ClickableImage;
