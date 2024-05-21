import React, { useState } from 'react';
import ClickableImage from './ClickableImage';
import cheatsheets from '../data/cheatsheetData.js'; // Adjust the path as necessary

function CheatsheetComponent({ id }) {
  const [activeTab, setActiveTab] = useState(0);

  // Find the cheatsheet with the provided id
  const cheatsheet = cheatsheets.find(sheet => sheet.id === id);

  if (!cheatsheet) {
    return <p>Cheatsheet not found</p>;
  }

  const { name, figcaptionHref, imageTags } = cheatsheet;
  const tabNames = Object.values(imageTags); // Extract tab names

  const handleClickTab = (index) => {
    setActiveTab(index);
  };

  return (
    <><details>
          <summary className={`collapsible colored-summary-${id}`} id={id}>
              {name}
          </summary>
          <div className="tabs">
              {tabNames.map((tabName, index) => (
                  <button
                      key={index}
                      className={activeTab === index ? 'active' : ''}
                      onClick={() => handleClickTab(index)}
                  >
                      {tabName}
                  </button>
              ))}
          </div>
          <figure>
              <ClickableImage tag={Object.keys(imageTags)[activeTab]} />
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
