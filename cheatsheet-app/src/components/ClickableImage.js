import React, { useState } from 'react';
import images from '../data/imagesData'; // Importing the images array

function ClickableImage({ tag }) {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const image = images.find(img => img.tag === tag);

  if (!image) {
    return <p>Image not found</p>;
  }

  const toggleOverlay = () => {
    setOverlayVisible(!overlayVisible);
  };

  return (
    <div>
      <img
        src={process.env.PUBLIC_URL + image.src}
        alt={image.alt}
        onClick={toggleOverlay}
        style={{ cursor: 'pointer' }}
      />

      {overlayVisible && (
        <div id="overlay" onClick={toggleOverlay} style={{ /* styles for overlay */ }}>
          <img
            src={process.env.PUBLIC_URL + image.src}
            style={{ maxHeight: image.enlargeHeight, maxWidth: image.enlargeWidth }}
            alt="Enlarged"
          />
        </div>
      )}
    </div>
  );
}

export default ClickableImage;
