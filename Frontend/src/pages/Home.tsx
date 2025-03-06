// src/pages/Home.tsx
import React from 'react';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <h1 className="home-title">Welcome to Playbook Insights</h1>
      <p className="home-subtitle">
        Turning Sports Data into Informative Insights
      </p>
    </div>
  );
};

export default Home;
