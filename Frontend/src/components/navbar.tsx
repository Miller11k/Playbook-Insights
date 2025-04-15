// src/components/navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // Assuming this CSS file exists and styles the navbar

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">PLAYBOOK INSIGHTS</h1>
      </div>
      <div className="navbar-right">
        <ul className="nav-list">
          <li>
            <Link to="/">Home</Link>
          </li>

          {/* Team Stats - Changed to Direct Link */}
          <li>
            {/* Link to the primary/passing stats page, or a general /team-stats page if you create one */}
            <Link to="/team-stats/passing">Team Stats</Link>
          </li>

          {/* Player Stats - Changed to Direct Link */}
          <li>
             {/* Link to the primary/passing stats page, or a general /player-stats page if you create one */}
            <Link to="/player-stats/passing">Player Stats</Link>
          </li>

          {/* Defensive Insights Dropdown - Kept as dropdown */}
          <li className="dropdown">
            <span>Defensive Insights</span>
            <ul className="dropdown-menu">
              <li><Link to="/defensive-stats/team">Team Stats</Link></li>
              <li><Link to="/defensive-stats/ranking">Team Rankings</Link></li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;