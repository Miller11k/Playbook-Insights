import React from 'react';
import { Helmet } from 'react-helmet';
import './Home.css';

const Home: React.FC = () => (
  <>
    <Helmet>
      <title>Home — Playbook Insights</title>
    </Helmet>
    <div className="home-container">
      <h1 className="home-title">Welcome to Playbook Insights</h1>
      <p className="home-subtitle">
        Turning Sports Data into Informative Insights
      </p>
    </div>
  </>
);

export default Home;
