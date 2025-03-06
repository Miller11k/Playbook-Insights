// src/App.tsx
import React from 'react';
import './global.css'; // Import the global styles
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar';
import Home from './pages/Home';
import TeamPassingStats from './pages/team/PassingStats';
import TeamReceivingStats from './pages/team/ReceivingStats';
import TeamRushingStats from './pages/team/RushingStats';
import PlayerPassingStats from './pages/player/PassingStats';
// import PlayerReceivingStats from './pages/player/ReceivingStats';
// import PlayerRushingStats from './pages/player/RushingStats';

const App: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Team Stats */}
        <Route path="/team-stats/passing" element={<TeamPassingStats />} />
        <Route path="/team-stats/receiving" element={<TeamReceivingStats />} />
        <Route path="/team-stats/rushing" element={<TeamRushingStats />} />
        {/* Player Stats */}
        <Route path="/player-stats/passing" element={<PlayerPassingStats />} />
        {/* <Route path="/player-stats/receiving" element={<PlayerReceivingStats />} />
        <Route path="/player-stats/rushing" element={<PlayerRushingStats />} /> */}
        {/* About page can be added later */}
      </Routes>
    </Router>
  );
};

export default App;
