import React, { useState } from 'react';
import ZoomImage from './ZoomImage';
import ExternalLink from './ExternalLink';
import { asset } from '../lib/assets';

// One or more cheat sheet images. Two or more show as tabs, labelled by each image's `label`.
function ImageSheet({ images, title }) {
  const [active, setActive] = useState(0);
  const image = images[active] ?? images[0];

  return (
    <>
      {images.length > 1 && (
        <div className="tabs" role="tablist">
          {images.map((img, i) => (
            <button
              key={img.src}
              role="tab"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onClick={() => setActive(i)}
            >
              {img.label ?? `Version ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <figure>
        <ZoomImage src={asset(image.src)} alt={image.alt ?? image.label ?? title} />
        {image.source && (
          <figcaption>
            <ExternalLink href={image.source}>{image.sourceLabel ?? 'source'}</ExternalLink>
          </figcaption>
        )}
      </figure>
    </>
  );
}

export default ImageSheet;
