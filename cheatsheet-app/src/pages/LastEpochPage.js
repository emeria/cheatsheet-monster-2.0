import React from 'react';
import './App.css'; // Reuse the same CSS or create a specific one for Last Epoch
import Header from '../components/Header';
import ThemeSwitcher from '../components/ThemeSwitcher';
import CheatsheetComponent from '../components/Cheatsheet';
import Navbar from '../components/Navbar';
import BackToTopButton from '../components/BackToTopButton';
import Footer from '../components/Footer';

function LastEpochPage() {
  return (
    <div className="LastEpochPage">
      <Header />
      <ThemeSwitcher />
      <br></br>
      <Navbar />
      <BackToTopButton />
      <main>
        <section>
          <h3>Last Epoch Cheatsheets</h3>
          <CheatsheetComponent id="leveling" />
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default LastEpochPage;
