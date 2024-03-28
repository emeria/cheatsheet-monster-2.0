import React from 'react';
import cheatsheets from '../data/cheatsheetData'; // Import cheatsheet data

function Navbar() {
  const handleButtonClick = (id) => {
    const summary = document.getElementById(id);
    if (summary) {
      summary.click(); // Programmatically trigger click event on the summary element

      // Scroll to the summary element of the cheatsheet component
      const summaryOffset = summary.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: summaryOffset, behavior: 'smooth' });
    }
  };

  const handleCollapseAll = () => {
    // Collapse all cheatsheet components
    cheatsheets.forEach((cheatsheet) => {
      const summary = document.getElementById(cheatsheet.id);
      const details = summary.parentElement;
      if (details && details.tagName === 'DETAILS') {
        details.open = false;
      }
    });
  };
  
  const handleExpandAll = () => {
    // Expand all cheatsheet components
    cheatsheets.forEach((cheatsheet) => {
      const summary = document.getElementById(cheatsheet.id);
      const details = summary.parentElement;
      if (details && details.tagName === 'DETAILS') {
        details.open = true;
      }
    });
  };

  return (
    <nav className="navbar">
      <div className="expand-button-container">
        {/* Button to collapse all cheatsheet components */}
        <button onClick={handleCollapseAll} className="collapse-expand-button">
          Collapse All
        </button>

        {/* Button to expand all cheatsheet components */}
        <button onClick={handleExpandAll} className="nav-button">
          Expand All
        </button>
      </div>

      {/* Buttons for individual cheatsheet components */}
      <div className="cheatsheet-buttons">
        {cheatsheets.map((cheatsheet) => (
          <button
            key={cheatsheet.id}
            onClick={() => handleButtonClick(cheatsheet.id)}
            className={"nav-button nav-button-"+ cheatsheet.id}
          >
            {cheatsheet.name}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;
