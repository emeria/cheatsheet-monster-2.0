import React from 'react';
import cheatsheets from '../data/cheatsheetData'; // Import cheatsheet data

function Navbar() {
  const handleButtonClick = (id) => {
    const summary = document.getElementById(id);
    if (summary) {
      summary.click(); // Programmatically trigger click event on the summary element
      // Optionally, you can also scroll to the cheatsheet component here if needed
      // const element = document.getElementById(id + "-cheatsheet");
      // if (element) {
      //   element.scrollIntoView({ behavior: 'smooth' });
      // }
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        {cheatsheets.map((cheatsheet) => (
          <button
            key={cheatsheet.id}
            onClick={() => handleButtonClick(cheatsheet.id)}
            className="nav-button"
          >
            {cheatsheet.name}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;
