import React, { useState } from 'react';
import ClickableImage from './ClickableImage';

function CheatsheetComponent({ id, name, figcaptionHref, imageTags }) {
  const [activeTab, setActiveTab] = useState(imageTags[0]);

  return (
    <><details>
          <summary className="collapsible" id={id}>
              {name}
          </summary>
          <div className="tabs">
              {imageTags.map(tag => (
                  <button
                      key={tag}
                      className={activeTab === tag ? 'active' : ''}
                      onClick={() => setActiveTab(tag)}
                  >
                      {tag}
                  </button>
              ))}
          </div>
          <figure>
              <ClickableImage tag={activeTab} />
              <figcaption>
                  <a href={figcaptionHref} target="_blank" rel="noopener noreferrer">
                      source
                  </a>
              </figcaption>
          </figure>
          <br />
      </details><br /></>
  );
}

export default CheatsheetComponent;
