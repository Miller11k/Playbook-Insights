// src/App.tsx
import React from 'react';
import './global.css'; // Keep this
// import './App.css'; // REMOVE THIS LINE IF PRESENT
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar';
import Home from './pages/Home';
import TeamPassingStats from './pages/team/TeamStats'; // Assuming this is correct component
import PlayerPassingStats from './pages/player/PlayerStats';
import DefensiveStats from './pages/team/DefensiveStats';
import DefensiveStatsRanking from './pages/team/DefensiveStatsRanking';

const App: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Routes remain the same */}
        <Route path="/" element={<Home />} />
        <Route path="/team-stats/passing" element={<TeamPassingStats />} />
        <Route path="/player-stats/passing" element={<PlayerPassingStats />} />
        <Route path="/defensive-stats/team" element={<DefensiveStats />} />
        <Route path="/defensive-stats/ranking" element={<DefensiveStatsRanking />} />
        {/* Other commented-out routes */}
      </Routes>
    </Router>
  );
};

export default App;